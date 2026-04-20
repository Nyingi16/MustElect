// src/controllers/studentController.js
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Student = require('../models/Student');
const User = require('../models/User');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const blockchainService = require('../services/blockchainService');
const emailService = require('../services/emailService');

// Get student dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const student = await Student.findOne({
      where: { user_id: req.user.id },
      include: [{ model: User, as: 'user' }]
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    
    const activeElection = await Election.findOne({
      where: { status: 'active' }
    });
    
    let hasVoted = false;
    let candidates = [];
    
    if (activeElection) {
      hasVoted = await Vote.findOne({
        where: { election_id: activeElection.id, voter_id: student.id }
      });
      
      candidates = await Candidate.findAll({
        where: { election_id: activeElection.id },
        include: [{
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number'] }]
        }]
      });
    }
    
    res.json({
      student: {
        id: student.id,
        full_name: student.user.full_name,
        registration_number: student.user.registration_number,
        email: student.user.email,
        department: student.department,
        year_of_study: student.year_of_study,
        registration_status: student.registration_status,
        has_voted: student.has_voted,
        wallet_address: student.user.wallet_address
      },
      election: activeElection ? {
        id: activeElection.id,
        title: activeElection.title,
        description: activeElection.description,
        start_date: activeElection.start_date,
        end_date: activeElection.end_date,
        status: activeElection.status,
        time_remaining: Math.max(0, new Date(activeElection.end_date) - new Date())
      } : null,
      hasVoted: !!hasVoted,
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.student?.user?.full_name || 'Unknown',
        position: c.position,
        manifesto: c.manifesto,
        campaign_slogan: c.campaign_slogan,
        blockchain_id: c.blockchain_id
      }))
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard: ' + error.message });
  }
};

// Get election status
exports.getElectionStatus = async (req, res) => {
  try {
    const activeElection = await Election.findOne({
      where: { status: 'active' }
    });
    
    if (!activeElection) {
      return res.json({ hasActiveElection: false });
    }
    
    const student = await Student.findOne({ 
      where: { user_id: req.user.id },
      include: [{ model: User, as: 'user' }]
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const hasVoted = await Vote.findOne({
      where: { election_id: activeElection.id, voter_id: student.id }
    });
    
    res.json({
      hasActiveElection: true,
      election: {
        id: activeElection.id,
        title: activeElection.title,
        start_date: activeElection.start_date,
        end_date: activeElection.end_date,
        time_remaining: Math.max(0, new Date(activeElection.end_date) - new Date())
      },
      hasVoted: !!hasVoted,
      canVote: student.registration_status === 'verified' && !!student.user.wallet_address && !hasVoted
    });
    
  } catch (error) {
    console.error('Election status error:', error);
    res.status(500).json({ error: 'Failed to fetch election status: ' + error.message });
  }
};

// Get candidates list
exports.getCandidates = async (req, res) => {
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
        include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number'] }]
      }],
      order: [['position', 'ASC']]
    });
    
    res.json({
      election: {
        id: election.id,
        title: election.title,
        status: election.status
      },
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.student?.user?.full_name || 'Unknown',
        position: c.position,
        manifesto: c.manifesto,
        campaign_slogan: c.campaign_slogan,
        blockchain_id: c.blockchain_id
      }))
    });
    
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates: ' + error.message });
  }
};

// Cast vote
exports.castVote = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { candidateId, electionId } = req.body;
    
    if (!candidateId || !electionId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Candidate ID and Election ID are required' });
    }
    
    // Validate election
    const election = await Election.findOne({
      where: { id: electionId, status: 'active' }
    }, { transaction });
    
    if (!election) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No active election found' });
    }
    
    if (new Date() > new Date(election.end_date)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Election has ended' });
    }
    
    // Validate student
    const student = await Student.findOne({
      where: { user_id: req.user.id },
      include: [{ model: User, as: 'user' }]
    }, { transaction });
    
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found' });
    }
    
    if (student.registration_status !== 'verified') {
      await transaction.rollback();
      return res.status(403).json({ error: 'Your account is not verified for voting' });
    }
    
    if (!student.user.wallet_address) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Please link your wallet first' });
    }
    
    // Check if already voted
    const existingVote = await Vote.findOne({
      where: { election_id: electionId, voter_id: student.id }
    }, { transaction });
    
    if (existingVote) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You have already voted' });
    }
    
    // Validate candidate
    const candidate = await Candidate.findByPk(candidateId, { transaction });
    if (!candidate || candidate.election_id !== election.id) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Invalid candidate' });
    }
    
    // Cast vote on blockchain (mock for now)
    const mockTxHash = `0x${Math.random().toString(36).substring(2, 66)}`;
    const mockBlockNumber = Math.floor(Math.random() * 1000000);
    
    // Record vote in database
    const vote = await Vote.create({
      election_id: electionId,
      voter_id: student.id,
      candidate_id: candidateId,
      transaction_hash: mockTxHash,
      block_number: mockBlockNumber,
      voter_ip: req.ip,
      voter_user_agent: req.get('User-Agent'),
      status: 'confirmed'
    }, { transaction });
    
    // Update student has_voted status
    await student.update({ has_voted: true }, { transaction });
    
    // Update election total votes
    await election.update({
      total_votes_cast: (election.total_votes_cast || 0) + 1
    }, { transaction });
    
    // Update candidate vote count
    await candidate.update({
      vote_count: (candidate.vote_count || 0) + 1
    }, { transaction });
    
    // Log audit
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CAST_VOTE',
      entity_type: 'vote',
      entity_id: vote.id,
      details: { electionId, candidateId, transactionHash: mockTxHash },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Vote cast successfully!',
      vote: {
        id: vote.id,
        transaction_hash: vote.transaction_hash,
        block_number: vote.block_number,
        timestamp: vote.created_at
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Cast vote error:', error);
    res.status(500).json({ error: 'Failed to cast vote: ' + error.message });
  }
};

// Get vote receipt
exports.getVoteReceipt = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const vote = await Vote.findOne({
      where: { voter_id: student.id },
      include: [
        { model: Election, as: 'election' },
        { 
          model: Candidate, 
          as: 'candidate',
          include: [{
            model: Student,
            as: 'student',
            include: [{ model: User, as: 'user', attributes: ['full_name'] }]
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    if (!vote) {
      return res.status(404).json({ error: 'No vote found' });
    }
    
    res.json({
      receipt: {
        vote_id: vote.id,
        election_title: vote.election?.title || 'Unknown',
        candidate_voted: vote.candidate?.student?.user?.full_name || 'Unknown',
        position: vote.candidate?.position || 'Unknown',
        transaction_hash: vote.transaction_hash,
        block_number: vote.block_number,
        voted_at: vote.created_at,
        verified_on_chain: vote.verified_on_chain || false
      }
    });
    
  } catch (error) {
    console.error('Get vote receipt error:', error);
    res.status(500).json({ error: 'Failed to fetch vote receipt: ' + error.message });
  }
};

// Get election results (published)
exports.getResults = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    const election = await Election.findByPk(electionId);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    if (!election.results_published && election.status !== 'ended') {
      return res.status(403).json({ error: 'Results not published yet' });
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
        start_date: election.start_date,
        end_date: election.end_date,
        total_voters: election.total_voters || 0,
        total_votes_cast: election.total_votes_cast || 0,
        voter_turnout: election.total_voters > 0 ? ((election.total_votes_cast / election.total_voters) * 100).toFixed(2) : 0,
        published_at: election.published_at
      },
      results: candidates.map(c => ({
        candidate_name: c.student?.user?.full_name || 'Unknown',
        position: c.position,
        vote_count: c.vote_count || 0,
        percentage: totalVotes > 0 ? ((c.vote_count / totalVotes) * 100).toFixed(2) : 0,
        is_winner: c.is_winner || false
      }))
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results: ' + error.message });
  }
};

// Update student profile
exports.updateProfile = async (req, res) => {
  try {
    const { department, year_of_study } = req.body;
    
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    await student.update({
      department: department || student.department,
      year_of_study: year_of_study || student.year_of_study
    });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE_STUDENT_PROFILE',
      details: { department, year_of_study },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile: ' + error.message });
  }
};

// Get student details (for dean)
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

// Reject student (for dean)
exports.rejectStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;
    
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    await student.update({
      registration_status: 'rejected',
      rejection_reason: reason,
      verified_by: req.user.id,
      verified_at: new Date()
    });
    
    res.json({ message: 'Student rejected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject student' });
  }
};

// Bulk verify students (for dean)
exports.bulkVerifyStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !studentIds.length) {
      return res.status(400).json({ error: 'No student IDs provided' });
    }
    
    await Student.update(
      {
        registration_status: 'verified',
        verified_by: req.user.id,
        verified_at: new Date()
      },
      { where: { id: studentIds } }
    );
    
    res.json({ message: `${studentIds.length} students verified successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify students' });
  }
};

// Export students (for dean)
exports.exportStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: User, as: 'user' }]
    });
    
    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export students' });
  }
};

module.exports = exports;