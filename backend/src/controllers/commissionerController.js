const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const CandidateApplication = require('../models/CandidateApplication');
const Student = require('../models/Student');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');

// Get pending applications
exports.getPendingApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const applications = await CandidateApplication.findAndCountAll({
      where: { application_status: 'pending' },
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number', 'email'] }]
      }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['created_at', 'ASC']]
    });
    
    res.json({
      total: applications.count,
      page: parseInt(page),
      totalPages: Math.ceil(applications.count / limit),
      applications: applications.rows.map(app => ({
        id: app.id,
        applicant_name: app.student.user.full_name,
        registration_number: app.student.user.registration_number,
        email: app.student.user.email,
        position: app.position,
        manifesto: app.manifesto,
        department: app.student.department,
        year_of_study: app.student.year_of_study,
        submitted_at: app.created_at
      }))
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// Get application details
exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const application = await CandidateApplication.findByPk(applicationId, {
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number', 'email'] }]
      }]
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({
      application: {
        id: application.id,
        applicant: {
          name: application.student.user.full_name,
          registration_number: application.student.user.registration_number,
          email: application.student.user.email,
          department: application.student.department,
          year_of_study: application.student.year_of_study
        },
        position: application.position,
        manifesto: application.manifesto,
        status: application.application_status,
        submitted_at: application.created_at,
        commissioner_comments: application.commissioner_comments
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
};

// Approve application (Commissioner level)
exports.approveApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { applicationId } = req.params;
    const { comments } = req.body;
    
    const application = await CandidateApplication.findByPk(applicationId, {
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user' }]
      }],
      transaction
    });
    
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.application_status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Application already processed' });
    }
    
    await application.update({
      application_status: 'commissioner_approved',
      commissioner_approved: true,
      commissioner_approved_by: req.user.id,
      commissioner_approved_at: new Date(),
      commissioner_comments: comments
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'COMMISSIONER_APPROVE_CANDIDATE',
      entity_type: 'candidate_application',
      entity_id: application.id,
      details: { applicationId, studentId: application.student_id, position: application.position },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    // Send email notification
    await emailService.sendEmail(
      application.student.user.email,
      'Candidate Application Update - MUST Elections',
      `<p>Your application for <strong>${application.position}</strong> has been approved by the Election Commissioners.</p>
       <p>Your application will now be reviewed by the Dean of Students for final approval.</p>`
    );
    
    res.json({
      message: 'Application approved at commissioner level',
      application: {
        id: application.id,
        status: application.application_status,
        approved_at: application.commissioner_approved_at
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
};

// Reject application (Commissioner level)
exports.rejectApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const application = await CandidateApplication.findByPk(applicationId, {
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user' }]
      }],
      transaction
    });
    
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.update({
      application_status: 'commissioner_rejected',
      commissioner_approved: false,
      commissioner_approved_by: req.user.id,
      commissioner_approved_at: new Date(),
      commissioner_comments: reason
    }, { transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'COMMISSIONER_REJECT_CANDIDATE',
      entity_type: 'candidate_application',
      entity_id: application.id,
      details: { applicationId, reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    // Send rejection email
    await emailService.sendEmail(
      application.student.user.email,
      'Candidate Application Update - MUST Elections',
      `<p>Thank you for your interest in running for <strong>${application.position}</strong>.</p>
       <p>After careful review, the Election Commissioners have decided not to approve your application at this time.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>You may reapply in the next election cycle.</p>`
    );
    
    res.json({
      message: 'Application rejected',
      application: {
        id: application.id,
        status: application.application_status,
        rejected_at: application.commissioner_approved_at
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
};

// Get approved candidates list
exports.getApprovedCandidates = async (req, res) => {
  try {
    const applications = await CandidateApplication.findAll({
      where: { application_status: 'commissioner_approved' },
      include: [{
        model: Student,
        as: 'student',
        include: [{ model: User, as: 'user', attributes: ['full_name', 'registration_number'] }]
      }],
      order: [['commissioner_approved_at', 'DESC']]
    });
    
    res.json({
      total: applications.length,
      candidates: applications.map(app => ({
        id: app.id,
        name: app.student.user.full_name,
        registration_number: app.student.user.registration_number,
        position: app.position,
        department: app.student.department,
        year_of_study: app.student.year_of_study,
        approved_at: app.commissioner_approved_at
      }))
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch approved candidates' });
  }
};

// Get voter statistics
exports.getVoterStats = async (req, res) => {
  try {
    const totalStudents = await Student.count();
    const verifiedStudents = await Student.count({ where: { registration_status: 'verified' } });
    const pendingStudents = await Student.count({ where: { registration_status: 'pending' } });
    const rejectedStudents = await Student.count({ where: { registration_status: 'rejected' } });
    
    const studentsWithWallet = await Student.count({
      include: [{
        model: User,
        as: 'user',
        where: { wallet_address: { [Op.not]: null } }
      }]
    });
    
    res.json({
      total_students: totalStudents,
      verified_students: verifiedStudents,
      pending_students: pendingStudents,
      rejected_students: rejectedStudents,
      students_with_wallet: studentsWithWallet,
      verification_rate: totalStudents > 0 ? ((verifiedStudents / totalStudents) * 100).toFixed(2) : 0,
      wallet_adoption_rate: verifiedStudents > 0 ? ((studentsWithWallet / verifiedStudents) * 100).toFixed(2) : 0
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch voter statistics' });
  }
};

module.exports = exports;