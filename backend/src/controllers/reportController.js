const Report = require('../models/Report');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const reportService = require('../services/reportService');
const ipfsService = require('../services/ipfsService');
const { validateReport } = require('../utils/validators');

// Generate report
exports.generateReport = async (req, res) => {
  try {
    const { error } = validateReport(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { report_type, election_id, format = 'pdf' } = req.body;
    
    let report = null;
    
    switch (report_type) {
      case 'results':
        const election = await Election.findByPk(election_id);
        if (!election) {
          return res.status(404).json({ error: 'Election not found' });
        }
        
        const candidates = await Candidate.findAll({
          where: { election_id },
          include: [{
            model: require('../models/Student'),
            as: 'student',
            include: [{ model: require('../models/User'), as: 'user' }]
          }]
        });
        
        const results = candidates.map(c => ({
          name: c.student.user.full_name,
          position: c.position,
          voteCount: c.vote_count,
          isWinner: c.is_winner
        }));
        
        report = await reportService.generateElectionReport(election, results, req.user.id);
        break;
        
      case 'turnout':
        const electionTurnout = await Election.findByPk(election_id);
        if (!electionTurnout) {
          return res.status(404).json({ error: 'Election not found' });
        }
        
        const votes = await Vote.findAll({ where: { election_id } });
        report = await reportService.generateTurnoutReport(electionTurnout, votes, req.user.id);
        break;
        
      case 'audit':
        const auditLogs = await AuditLog.findAll({
          limit: 1000,
          order: [['created_at', 'DESC']],
          include: [{ model: require('../models/User'), as: 'user', attributes: ['full_name'] }]
        });
        report = await reportService.generateAuditReport(auditLogs, req.user.id);
        break;
        
      case 'candidates':
        const allCandidates = await Candidate.findAll({
          include: [{
            model: require('../models/Student'),
            as: 'student',
            include: [{ model: require('../models/User'), as: 'user' }]
          }]
        });
        report = await reportService.generateCandidateReport(allCandidates, req.user.id);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.json({
      message: 'Report generated successfully',
      report: {
        id: report.report.id,
        type: report_type,
        file_hash: report.fileHash,
        ipfs_hash: report.ipfsHash,
        download_url: `/reports/${path.basename(report.filePath)}`
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate report: ' + error.message });
  }
};

// Download report
exports.downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findByPk(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Increment download count
    await report.increment('download_count');
    
    // Log download
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DOWNLOAD_REPORT',
      entity_type: 'report',
      entity_id: report.id,
      details: { report_type: report.report_type },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.download(report.file_path);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download report' });
  }
};

// List reports
exports.listReports = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (type) where.report_type = type;
    
    const reports = await Report.findAndCountAll({
      where,
      include: [{ model: require('../models/User'), as: 'generator', attributes: ['full_name'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      total: reports.count,
      page: parseInt(page),
      totalPages: Math.ceil(reports.count / limit),
      reports: reports.rows.map(r => ({
        id: r.id,
        title: r.title,
        type: r.report_type,
        file_hash: r.file_hash,
        ipfs_hash: r.ipfs_hash,
        file_size: r.file_size,
        download_count: r.download_count,
        generated_by: r.generator.full_name,
        generated_at: r.created_at
      }))
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
};

// Upload report to IPFS
exports.uploadToIPFS = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findByPk(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(report.file_path);
    const ipfsHash = await ipfsService.uploadToIPFS(fileBuffer);
    
    await report.update({ ipfs_hash: ipfsHash });
    
    res.json({
      message: 'Report uploaded to IPFS',
      ipfs_hash: ipfsHash,
      ipfs_url: `https://ipfs.io/ipfs/${ipfsHash}`
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload to IPFS' });
  }
};

// Verify report integrity
exports.verifyReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findByPk(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const fs = require('fs');
    const crypto = require('crypto');
    
    const fileBuffer = fs.readFileSync(report.file_path);
    const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    const isValid = currentHash === report.file_hash;
    
    // Also verify IPFS if available
    let ipfsValid = null;
    if (report.ipfs_hash) {
      try {
        const ipfsData = await ipfsService.downloadFromIPFS(report.ipfs_hash);
        const ipfsHash = crypto.createHash('sha256').update(ipfsData).digest('hex');
        ipfsValid = ipfsHash === report.file_hash;
      } catch (error) {
        ipfsValid = false;
      }
    }
    
    res.json({
      report_id: report.id,
      title: report.title,
      file_hash: report.file_hash,
      current_hash: currentHash,
      is_integrity_valid: isValid,
      ipfs_hash: report.ipfs_hash,
      ipfs_valid: ipfsValid,
      verification_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify report' });
  }
};

// Delete report
exports.deleteReport = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { reportId } = req.params;
    
    const report = await Report.findByPk(reportId, { transaction });
    
    if (!report) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Delete file from disk
    const fs = require('fs');
    if (fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }
    
    await report.destroy({ transaction });
    
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE_REPORT',
      entity_type: 'report',
      entity_id: report.id,
      details: { report_type: report.report_type },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Report deleted successfully' });
    
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

module.exports = exports;