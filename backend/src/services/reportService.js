const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Report = require('../models/Report');
const ipfsService = require('./ipfsService');

class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  generateFileHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async generateElectionReport(election, results, userId) {
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = path.join(this.reportsDir, `${reportId}.pdf`);
    
    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    
    // Header
    doc.fontSize(20).text('MERU UNIVERSITY OF SCIENCE & TECHNOLOGY', { align: 'center' });
    doc.fontSize(16).text('Student Elections - Official Results', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Report ID: ${reportId}`, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();
    
    // Election Details
    doc.fontSize(14).text('Election Information', { underline: true });
    doc.fontSize(12).text(`Title: ${election.title}`);
    doc.text(`Description: ${election.description || 'N/A'}`);
    doc.text(`Start Date: ${new Date(election.start_date).toLocaleString()}`);
    doc.text(`End Date: ${new Date(election.end_date).toLocaleString()}`);
    doc.text(`Total Registered Voters: ${election.total_voters || 0}`);
    doc.text(`Total Votes Cast: ${election.total_votes_cast || 0}`);
    doc.text(`Voter Turnout: ${election.total_voters > 0 ? ((election.total_votes_cast / election.total_voters) * 100).toFixed(2) : 0}%`);
    doc.moveDown();
    
    // Results Table
    doc.fontSize(14).text('Election Results', { underline: true });
    doc.moveDown();
    
    // Table headers
    const startX = 50;
    let y = doc.y;
    doc.fontSize(10);
    doc.text('Position', startX, y, { width: 100 });
    doc.text('Candidate', startX + 100, y, { width: 150 });
    doc.text('Votes', startX + 250, y, { width: 80 });
    doc.text('Percentage', startX + 330, y, { width: 80 });
    doc.text('Status', startX + 410, y, { width: 80 });
    
    doc.moveDown();
    y = doc.y;
    doc.lineWidth(1).moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    
    // Table rows
    for (const result of results) {
      const percentage = election.total_votes_cast > 0 ? ((result.voteCount / election.total_votes_cast) * 100).toFixed(2) : 0;
      doc.text(result.position || 'N/A', startX, y, { width: 100 });
      doc.text(result.name, startX + 100, y, { width: 150 });
      doc.text(result.voteCount.toString(), startX + 250, y, { width: 80 });
      doc.text(`${percentage}%`, startX + 330, y, { width: 80 });
      doc.text(result.isWinner ? 'WINNER' : 'Participant', startX + 410, y, { width: 80 });
      y += 20;
      
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    }
    
    doc.moveDown();
    doc.lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    
    // Blockchain Verification
    doc.moveDown();
    doc.fontSize(14).text('Blockchain Verification', { underline: true });
    doc.fontSize(10);
    doc.text(`Contract Address: ${election.contract_address || 'N/A'}`);
    doc.text(`Results Published: ${election.published_at ? new Date(election.published_at).toLocaleString() : 'Not published'}`);
    doc.text(`Blockchain Hash: ${crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex')}`);
    
    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pageCount} - MUST Elections - Official Document`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }
    
    doc.end();
    
    await new Promise((resolve) => writeStream.on('finish', resolve));
    
    // Generate file hash
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = this.generateFileHash(fileBuffer);
    const fileSize = fileBuffer.length;
    
    // Upload to IPFS
    let ipfsHash = null;
    try {
      ipfsHash = await ipfsService.uploadToIPFS(fileBuffer);
    } catch (error) {
      console.error('IPFS upload failed:', error);
    }
    
    // Save to database
    const report = await Report.create({
      report_type: 'results',
      title: `Election Results - ${election.title}`,
      election_id: election.id,
      file_path: filePath,
      file_hash: fileHash,
      file_size: fileSize,
      mime_type: 'application/pdf',
      ipfs_hash: ipfsHash,
      generated_by: userId,
      report_data: { election: election.toJSON(), results }
    });
    
    return { report, filePath, fileHash, ipfsHash };
  }

  async generateTurnoutReport(election, votes, userId) {
    const reportId = `TRN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = path.join(this.reportsDir, `${reportId}.xlsx`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Voter Turnout Report');
    
    // Add metadata
    worksheet.addRow(['MUST Student Elections - Voter Turnout Report']);
    worksheet.addRow(['Generated:', new Date().toLocaleString()]);
    worksheet.addRow(['Report ID:', reportId]);
    worksheet.addRow(['Election:', election.title]);
    worksheet.addRow([]);
    
    // Summary section
    worksheet.addRow(['SUMMARY STATISTICS']);
    worksheet.addRow(['Total Registered Voters', election.total_voters || 0]);
    worksheet.addRow(['Total Votes Cast', votes.length]);
    worksheet.addRow(['Voter Turnout', `${election.total_voters > 0 ? ((votes.length / election.total_voters) * 100).toFixed(2) : 0}%`]);
    worksheet.addRow([]);
    
    // Hourly breakdown
    worksheet.addRow(['HOURLY VOTING BREAKDOWN']);
    worksheet.addRow(['Hour', 'Number of Votes', 'Cumulative']);
    
    const hourlyData = {};
    votes.forEach(vote => {
      const hour = new Date(vote.created_at).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    let cumulative = 0;
    for (let hour = 0; hour < 24; hour++) {
      const count = hourlyData[hour] || 0;
      cumulative += count;
      worksheet.addRow([`${hour}:00 - ${hour}:59`, count, cumulative]);
    }
    
    // Style the worksheet
    worksheet.columns.forEach(column => {
      column.width = 25;
    });
    
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 14 };
    
    await workbook.xlsx.writeFile(filePath);
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = this.generateFileHash(fileBuffer);
    const fileSize = fileBuffer.length;
    
    const report = await Report.create({
      report_type: 'turnout',
      title: `Voter Turnout - ${election.title}`,
      election_id: election.id,
      file_path: filePath,
      file_hash: fileHash,
      file_size: fileSize,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      generated_by: userId,
      report_data: { election: election.toJSON(), hourlyData }
    });
    
    return { report, filePath, fileHash };
  }

  async generateAuditReport(auditLogs, userId) {
    const reportId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = path.join(this.reportsDir, `${reportId}.pdf`);
    
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    
    doc.fontSize(20).text('MUST Elections - Audit Log Report', { align: 'center' });
    doc.fontSize(12).text(`Report ID: ${reportId}`, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();
    
    doc.fontSize(14).text('System Activity Log', { underline: true });
    doc.moveDown();
    
    // Table headers
    let y = doc.y;
    doc.fontSize(10);
    doc.text('Timestamp', 50, y, { width: 120 });
    doc.text('User', 170, y, { width: 120 });
    doc.text('Action', 290, y, { width: 100 });
    doc.text('Status', 390, y, { width: 60 });
    doc.text('IP Address', 450, y, { width: 100 });
    
    doc.moveDown();
    y = doc.y;
    doc.lineWidth(1).moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    
    for (const log of auditLogs) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(new Date(log.created_at).toLocaleString(), 50, y, { width: 120 });
      doc.text(log.user?.full_name || 'System', 170, y, { width: 120 });
      doc.text(log.action, 290, y, { width: 100 });
      doc.text(log.status, 390, y, { width: 60 });
      doc.text(log.ip_address || 'N/A', 450, y, { width: 100 });
      y += 20;
    }
    
    doc.end();
    
    await new Promise((resolve) => writeStream.on('finish', resolve));
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = this.generateFileHash(fileBuffer);
    const fileSize = fileBuffer.length;
    
    const report = await Report.create({
      report_type: 'audit',
      title: 'System Audit Log Report',
      file_path: filePath,
      file_hash: fileHash,
      file_size: fileSize,
      mime_type: 'application/pdf',
      generated_by: userId,
      report_data: { auditLogs: auditLogs.slice(0, 100) }
    });
    
    return { report, filePath, fileHash };
  }

  async generateCandidateReport(candidates, userId) {
    const reportId = `CND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = path.join(this.reportsDir, `${reportId}.csv`);
    
    const headers = ['Candidate Name', 'Position', 'Registration Number', 'Manifesto', 'Vote Count', 'Status'];
    const csvRows = [headers.join(',')];
    
    for (const candidate of candidates) {
      const row = [
        `"${candidate.user?.full_name || 'N/A'}"`,
        `"${candidate.position}"`,
        `"${candidate.user?.registration_number || 'N/A'}"`,
        `"${(candidate.manifesto || '').replace(/"/g, '""').substring(0, 200)}"`,
        candidate.vote_count || 0,
        candidate.is_winner ? 'Winner' : 'Participant'
      ];
      csvRows.push(row.join(','));
    }
    
    fs.writeFileSync(filePath, csvRows.join('\n'));
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = this.generateFileHash(fileBuffer);
    const fileSize = fileBuffer.length;
    
    const report = await Report.create({
      report_type: 'candidates',
      title: 'Candidates Report',
      file_path: filePath,
      file_hash: fileHash,
      file_size: fileSize,
      mime_type: 'text/csv',
      generated_by: userId,
      report_data: { candidatesCount: candidates.length }
    });
    
    return { report, filePath, fileHash };
  }
}

module.exports = new ReportService();