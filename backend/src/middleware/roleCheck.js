// src/middleware/roleCheck.js
const { authenticateToken } = require('./auth');

// Role checking middleware factory
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(', ')}`,
        your_role: req.user.role
      });
    }
    
    next();
  };
};

// Pre-defined role checkers
const isStudent = roleCheck('student', 'candidate');
const isCandidate = roleCheck('candidate');
const isCommissioner = roleCheck('commissioner');
const isDean = roleCheck('dean');
const isAdmin = roleCheck('admin');
const isAdminOrDean = roleCheck('admin', 'dean');
const isAdminOrCommissioner = roleCheck('admin', 'commissioner');

// Export all
module.exports = {
  roleCheck,
  isStudent,
  isCandidate,
  isCommissioner,
  isDean,
  isAdmin,
  isAdminOrDean,
  isAdminOrCommissioner
};