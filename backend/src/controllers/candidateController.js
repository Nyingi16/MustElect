const { Op } = require('sequelize'); 
const { sequelize } = require('../config/database');
const CandidateApplication = require('../models/CandidateApplication');
const Candidate = require('../models/Candidate');
const Student = require('../models/Student');
const User = require('../models/User');
const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');

// Apply as candidate
exports.applyAsCandidate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { position, manifesto, campaign_slogan, achievements } = req.body;
    
    // Check if student is verified
    const student = await Student.findOne({
      where: { user_id: req.user.id },
      include: [{ model: User, as: 'user' }]
    }, { transaction });
    
    if (student.registration_status !== 'verified') {
      await transaction.rollback();
      return res.status(403).json({ error: 'Your account must be verified to apply as candidate' });
    }
    
    // Check if already applied
    const existingApplication = await CandidateApplication.findOne({
      where: { student_id: student.id, application_status: { [Op.ne]: 'dean_rejected' } }
    }, { transaction });
    
    if (existingApplication) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You already have a pending application' });
    }
    
    // Check if already a candidate
    const existingCandidate = await Candidate.findOne({
      where: { student_id: student.id }
    }, { transaction });
    
    if (existingCandidate) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You are already a candidate' });
    }
    
    // Create application
    const application = await CandidateApplication.create({
      student_id: student.id,
      position,
      manifesto,
      application_status: 'pending',
      election_id: null // Will be set when election is created
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'APPLY_CANDIDATE',
      entity_type: 'candidate_application',
      entity_id: application.id,
      details: { position, manifesto_length: manifesto.length },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        position: application.position,
        status: application.application_status,
        created_at: application.created_at
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to submit application: ' + error.message });
  }
};

// Get application status
exports.getApplicationStatus = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    const application = await CandidateApplication.findOne({
      where: { student_id: student.id },
      order: [['created_at', 'DESC']]
    });
    
    if (!application) {
      return res.json({ hasApplied: false });
    }
    
    let statusMessage = '';
    let nextSteps = [];
    
    switch (application.application_status) {
      case 'pending':
        statusMessage = 'Your application is pending review by Election Commissioners';
        nextSteps = ['Wait for commissioner review', 'Check back for updates'];
        break;
      case 'commissioner_approved':
        statusMessage = 'Your application has been approved by Commissioners. Waiting for Dean approval.';
        nextSteps = ['Dean will review your application', 'You will be notified once approved'];
        break;
      case 'commissioner_rejected':
        statusMessage = 'Your application was rejected by Commissioners';
        nextSteps = ['Review the feedback', 'You may reapply next election'];
        break;
      case 'dean_approved':
        statusMessage = 'Congratulations! Your application has been approved. You are now a candidate!';
        nextSteps = ['Connect your wallet', 'Update your campaign manifesto', 'Start campaigning'];
        break;
      case 'dean_rejected':
        statusMessage = 'Your application was rejected by the Dean';
        nextSteps = ['Contact the Dean\'s office for more information'];
        break;
    }
    
    res.json({
      hasApplied: true,
      application: {
        id: application.id,
        position: application.position,
        status: application.application_status,
        status_message: statusMessage,
        next_steps: nextSteps,
        commissioner_comments: application.commissioner_comments,
        dean_comments: application.dean_comments,
        submitted_at: application.created_at,
        commissioner_approved_at: application.commissioner_approved_at,
        dean_approved_at: application.dean_approved_at
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch application status' });
  }
};

// Update manifesto (if approved)
exports.updateManifesto = async (req, res) => {
  try {
    const { manifesto, campaign_slogan, achievements } = req.body;
    
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    const application = await CandidateApplication.findOne({
      where: { student_id: student.id, application_status: 'dean_approved' }
    });
    
    if (!application) {
      return res.status(403).json({ error: 'Only approved candidates can update manifesto' });
    }
    
    await application.update({
      manifesto: manifesto || application.manifesto,
      campaign_slogan: campaign_slogan || application.campaign_slogan,
      achievements: achievements || application.achievements
    });
    
    // Also update candidate record if exists
    const candidate = await Candidate.findOne({ where: { student_id: student.id } });
    if (candidate) {
      await candidate.update({
        manifesto: manifesto || candidate.manifesto,
        campaign_slogan: campaign_slogan || candidate.campaign_slogan,
        achievements: achievements || candidate.achievements
      });
    }
    
    res.json({ message: 'Manifesto updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update manifesto' });
  }
};

// Get campaign statistics
exports.getCampaignStats = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    const candidate = await Candidate.findOne({
      where: { student_id: student.id },
      include: [{ model: Election, as: 'election' }]
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    res.json({
      candidate: {
        name: student.user.full_name,
        position: candidate.position,
        vote_count: candidate.vote_count,
        is_winner: candidate.is_winner,
        manifesto: candidate.manifesto
      },
      election: candidate.election ? {
        title: candidate.election.title,
        status: candidate.election.status,
        start_date: candidate.election.start_date,
        end_date: candidate.election.end_date,
        total_voters: candidate.election.total_voters,
        total_votes_cast: candidate.election.total_votes_cast
      } : null,
      performance: candidate.election?.total_votes_cast > 0 ? {
        vote_percentage: ((candidate.vote_count / candidate.election.total_votes_cast) * 100).toFixed(2),
        rank: 'TBD' // Calculate actual rank
      } : null
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
};

// Withdraw application
exports.withdrawApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    
    const application = await CandidateApplication.findOne({
      where: { student_id: student.id, application_status: 'pending' }
    }, { transaction });
    
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'No pending application found' });
    }
    
    await application.destroy({ transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'WITHDRAW_CANDIDACY',
      details: { application_id: application.id },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Application withdrawn successfully' });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
};

module.exports = exports;