// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    
    req.user = {
      id: user.id,
      registration_number: user.registration_number,
      role: user.role,
      wallet_address: user.wallet_address
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error(error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      AuditLog.create({
        user_id: req.user.id,
        action: 'UNAUTHORIZED_ACCESS',
        details: { required_roles: roles, user_role: req.user.role, path: req.path },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        status: 'failed'
      }).catch(console.error);
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  AuditLog.create({
    action: 'ERROR',
    details: { error: err.message, stack: err.stack, path: req.path },
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    status: 'failed'
  }).catch(console.error);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

module.exports = { authenticateToken, requireRole, errorHandler };