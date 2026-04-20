// src/controllers/deanController.js
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Student = require('../models/Student');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const CandidateApplication = require('../models/CandidateApplication');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const blockchainService = require('../services/blockchainService');

// ============ DASHBOARD ============

exports.getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await Student.count();
    const verifiedStudents = await Student.count({ where: { registration_status: 'verified' } });
    const pendingStudents = await Student.count({ where: { registration_status: 'pending' } });
    const totalCandidates = await Candidate.count();
    
    const activeElection = await Election.findOne({ where: { status: 'active' } });
    let totalVotes = 0;
    let voterTurnout = 0;
    
    if (activeElection) {
      totalVotes = await Vote.count({ where: { election_id: activeElection.id } });
      voterTurnout = activeElection.total_voters > 0 ? (totalVotes / activeElection.total_voters) * 100 : 0;
    }
    
    // Get candidate vote counts for chart
    const candidates = await Candidate.findAll({
      where: { election_id: activeElection?.id || null },
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user', attributes: ['full_name'] }]
      }]
    });
    
    const candidateStats = candidates.map(c => ({
      name: c.student?.user?.full_name || 'Unknown',
      votes: c.vote_count || 0
    }));
    
    res.json({
      students: {
        total: totalStudents,
        verified: verifiedStudents,
        pending: pendingStudents,
        verificationRate: totalStudents > 0 ? ((verifiedStudents / totalStudents) * 100).toFixed(2) : 0
      },
      candidates: {
        total: totalCandidates,
        list: candidateStats
      },
      election: activeElection ? {
        id: activeElection.id,
        title: activeElection.title,
        status: activeElection.status,
        totalVotes: totalVotes,
        voterTurnout: voterTurnout.toFixed(2)
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

exports.getRealTimeStats = async (req, res) => {
  try {
    const activeElection = await Election.findOne({ where: { status: 'active' } });
    
    if (!activeElection) {
      return res.json({ message: 'No active election', stats: null });
    }
    
    const totalVoters = activeElection.total_voters || 0;
    const totalVotesCast = activeElection.total_votes_cast || 0;
    const voterTurnout = totalVoters > 0 ? (totalVotesCast / totalVoters) * 100 : 0;
    
    const candidates = await Candidate.findAll({
      where: { election_id: activeElection.id },
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number'] }]
      }]
    });
    
    const candidateStats = candidates.map(candidate => ({
      id: candidate.id,
      name: candidate.student?.user?.full_name || 'Unknown',
      position: candidate.position,
      votes: candidate.vote_count || 0,
      percentage: totalVotesCast > 0 ? ((candidate.vote_count / totalVotesCast) * 100).toFixed(2) : 0
    }));
    
    candidateStats.sort((a, b) => b.votes - a.votes);
    
    res.json({
      election: {
        id: activeElection.id,
        title: activeElection.title,
        startDate: activeElection.start_date,
        endDate: activeElection.end_date,
        timeRemaining: Math.max(0, new Date(activeElection.end_date) - new Date())
      },
      stats: {
        totalVoters: totalVoters,
        totalVotesCast: totalVotesCast,
        voterTurnout: voterTurnout.toFixed(2),
        lastUpdated: new Date().toISOString()
      },
      candidates: candidateStats
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch real-time stats' });
  }
};

// ============ STUDENT MANAGEMENT ============

exports.getStudents = async (req, res) => {
  try {
    const { status, department, year, search, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (status) where.registration_status = status;
    if (department) where.department = department;
    if (year) where.year_of_study = parseInt(year);
    
    const studentWhere = {};
    if (search) {
      studentWhere[Op.or] = [
        { registration_number: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const students = await Student.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        where: studentWhere,
        attributes: ['id', 'registration_number', 'email', 'full_name', 'role', 'wallet_address', 'created_at']
      }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      total: students.count,
      page: parseInt(page),
      totalPages: Math.ceil(students.count / limit),
      students: students.rows
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({ student });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
};

exports.verifyStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId } = req.params;
    
    const student = await Student.findByPk(studentId, { transaction });
    
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found' });
    }
    
    if (student.registration_status === 'verified') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Student already verified' });
    }
    
    await student.update({
      registration_status: 'verified',
      verified_by: req.user.id,
      verified_at: new Date()
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'VERIFY_STUDENT',
      entity_type: 'student',
      entity_id: student.id,
      details: { studentId: student.id },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Student verified successfully', student });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to verify student' });
  }
};

exports.rejectStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId } = req.params;
    const { reason } = req.body;
    
    const student = await Student.findByPk(studentId, { transaction });
    
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found' });
    }
    
    await student.update({
      registration_status: 'rejected',
      rejection_reason: reason,
      verified_by: req.user.id,
      verified_at: new Date()
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'REJECT_STUDENT',
      entity_type: 'student',
      entity_id: student.id,
      details: { studentId: student.id, reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Student rejected successfully', student });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to reject student' });
  }
};

exports.bulkVerifyStudents = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !studentIds.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No student IDs provided' });
    }
    
    await Student.update(
      {
        registration_status: 'verified',
        verified_by: req.user.id,
        verified_at: new Date()
      },
      { where: { id: studentIds }, transaction }
    );
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'BULK_VERIFY_STUDENTS',
      entity_type: 'student',
      details: { count: studentIds.length, studentIds },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: `${studentIds.length} students verified successfully` });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to verify students' });
  }
};

exports.exportStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: User, as: 'user' }]
    });
    
    const csvData = students.map(s => ({
      name: s.user.full_name,
      registration_number: s.user.registration_number,
      email: s.user.email,
      department: s.department,
      year_of_study: s.year_of_study,
      status: s.registration_status,
      wallet: s.user.wallet_address || 'Not connected',
      registered_at: s.created_at
    }));
    
    res.json({ students: csvData, count: csvData.length });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export students' });
  }
};

// ============ ELECTION MANAGEMENT ============

exports.createElection = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, description, start_date, end_date } = req.body;
    
    // Check if dean has wallet connected
    const dean = await User.findByPk(req.user.id);
    if (!dean.wallet_address) {
      return res.status(400).json({ 
        error: 'Please connect your wallet first before creating an election.' 
      });
    }
    
    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    const election = await Election.create({
      title,
      description,
      start_date,
      end_date,
      status: 'draft',
      created_by: req.user.id
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE_ELECTION',
      entity_type: 'election',
      entity_id: election.id,
      details: { title, start_date, end_date },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json({ 
      message: 'Election created successfully', 
      election 
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create election: ' + error.message });
  }
};

exports.getElections = async (req, res) => {
  try {
    const elections = await Election.findAll({
      order: [['created_at', 'DESC']]
    });
    
    res.json({ elections });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
};

exports.getElectionDetails = async (req, res) => {
  try {
    const { electionId } = req.params;
    const election = await Election.findByPk(electionId);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    res.json({ election });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch election details' });
  }
};

exports.startElection = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId, { transaction });
    
    if (!election) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Election not found' });
    }
    
    if (election.status !== 'draft' && election.status !== 'paused') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Election cannot be started' });
    }
    
    // Get all verified students
    const verifiedStudents = await Student.count({
      where: { registration_status: 'verified' },
      transaction
    });
    
    await election.update({
      status: 'active',
      started_at: new Date(),
      total_voters: verifiedStudents
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'START_ELECTION',
      entity_type: 'election',
      entity_id: election.id,
      details: { electionId, totalVoters: verifiedStudents },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Election started successfully', election });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to start election: ' + error.message });
  }
};

exports.pauseElection = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId, { transaction });
    
    if (!election) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Election not found' });
    }
    
    if (election.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only active elections can be paused' });
    }
    
    await election.update({ status: 'paused' }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'PAUSE_ELECTION',
      entity_type: 'election',
      entity_id: election.id,
      details: { electionId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Election paused successfully', election });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to pause election' });
  }
};

exports.endElection = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId, { transaction });
    
    if (!election) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Election not found' });
    }
    
    if (election.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only active elections can be ended' });
    }
    
    await election.update({
      status: 'ended',
      ended_at: new Date()
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'END_ELECTION',
      entity_type: 'election',
      entity_id: election.id,
      details: { electionId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Election ended successfully', election });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to end election' });
  }
};

exports.publishResults = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId, { transaction });
    
    if (!election) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Election not found' });
    }
    
    if (election.status !== 'ended') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Election must be ended first' });
    }
    
    // Determine winners
    const candidates = await Candidate.findAll({
      where: { election_id: electionId },
      order: [['vote_count', 'DESC']],
      transaction
    });
    
    // Mark winner(s)
    for (let i = 0; i < candidates.length; i++) {
      await candidates[i].update({ is_winner: i === 0 }, { transaction });
    }
    
    await election.update({
      results_published: true,
      published_at: new Date()
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'PUBLISH_RESULTS',
      entity_type: 'election',
      entity_id: election.id,
      details: { electionId, winnerId: candidates[0]?.id },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Results published successfully', election, winner: candidates[0] });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to publish results: ' + error.message });
  }
};

exports.deleteElection = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId, { transaction });
    
    if (!election) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Election not found' });
    }
    
    if (election.status === 'active') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot delete an active election' });
    }
    
    await election.destroy({ transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE_ELECTION',
      entity_type: 'election',
      entity_id: election.id,
      details: { electionId, title: election.title },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Election deleted successfully' });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to delete election' });
  }
};

// ============ RESULTS & REPORTS ============

exports.getResults = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    const candidates = await Candidate.findAll({
      where: { election_id: electionId },
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user', attributes: ['full_name'] }]
      }],
      order: [['vote_count', 'DESC']]
    });
    
    const totalVotes = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
    
    res.json({
      election: {
        id: election.id,
        title: election.title,
        status: election.status,
        total_voters: election.total_voters,
        total_votes_cast: election.total_votes_cast,
        voter_turnout: election.total_voters > 0 ? ((election.total_votes_cast / election.total_voters) * 100).toFixed(2) : 0
      },
      results: candidates.map(c => ({
        candidate_name: c.student?.user?.full_name || 'Unknown',
        position: c.position,
        vote_count: c.vote_count,
        percentage: totalVotes > 0 ? ((c.vote_count / totalVotes) * 100).toFixed(2) : 0,
        is_winner: c.is_winner
      }))
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

exports.getTurnoutReport = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    res.json({
      election: election.title,
      total_voters: election.total_voters,
      total_votes_cast: election.total_votes_cast,
      turnout_percentage: election.total_voters > 0 ? ((election.total_votes_cast / election.total_voters) * 100).toFixed(2) : 0,
      hourly_breakdown: []
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch turnout report' });
  }
};

// ============ CANDIDATE MANAGEMENT ============

exports.getCandidates = async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = {};
    if (status && status !== 'all') {
      where.application_status = status;
    }
    
    const applications = await CandidateApplication.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number', 'email'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    const formattedCandidates = applications.map(app => ({
      id: app.id,
      name: app.student?.user?.full_name || 'Unknown',
      registration_number: app.student?.user?.registration_number,
      email: app.student?.user?.email,
      position: app.position,
      manifesto: app.manifesto,
      department: app.student?.department,
      year_of_study: app.student?.year_of_study,
      status: app.application_status,
      rejection_reason: app.rejection_reason,
      applied_at: app.created_at
    }));
    
    res.json({ candidates: formattedCandidates });
    
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

exports.approveCandidate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { candidateId } = req.params;
    
    const application = await CandidateApplication.findByPk(candidateId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Candidate application not found' });
    }
    
    if (application.application_status !== 'commissioner_approved') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Candidate must be approved by commissioner first' });
    }
    
    await application.update({
      application_status: 'dean_approved',
      dean_approved: true,
      dean_approved_by: req.user.id,
      dean_approved_at: new Date()
    }, { transaction });
    
    // Also update the candidate record if exists
    const candidate = await Candidate.findOne({
      where: { student_id: application.student_id },
      transaction
    });
    
    if (candidate) {
      await candidate.update({ is_approved: true }, { transaction });
    }
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DEAN_APPROVE_CANDIDATE',
      entity_type: 'candidate_application',
      entity_id: application.id,
      details: { candidateId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Candidate approved successfully' });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to approve candidate' });
  }
};

exports.rejectCandidate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { candidateId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const application = await CandidateApplication.findByPk(candidateId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Candidate application not found' });
    }
    
    await application.update({
      application_status: 'dean_rejected',
      dean_approved: false,
      dean_approved_by: req.user.id,
      dean_approved_at: new Date(),
      rejection_reason: reason
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DEAN_REJECT_CANDIDATE',
      entity_type: 'candidate_application',
      entity_id: application.id,
      details: { candidateId, reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Candidate rejected' });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to reject candidate' });
  }
};

module.exports = exports;