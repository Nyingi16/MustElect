const AuditLog = require('../models/AuditLog');

const auditLogger = async (req, res, next) => {
  // Store original end function
  const originalEnd = res.end;
  const startTime = Date.now();
  
  // Capture response data
  let responseBody = '';
  const originalWrite = res.write;
  const originalJson = res.json;
  
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  res.write = function(chunk) {
    responseBody += chunk;
    return originalWrite.call(this, chunk);
  };
  
  res.end = function(chunk) {
    if (chunk) responseBody += chunk;
    
    const responseTime = Date.now() - startTime;
    
    // Only log for API routes
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      const status = res.statusCode >= 400 ? 'failed' : 'success';
      
      // Don't log password fields
      let sanitizedBody = { ...req.body };
      delete sanitizedBody.password;
      delete sanitizedBody.password_hash;
      
      AuditLog.create({
        user_id: req.user?.id,
        action: req.method,
        entity_type: req.originalUrl.split('/')[2],
        details: {
          method: req.method,
          url: req.originalUrl,
          query: req.query,
          body: sanitizedBody,
          response_status: res.statusCode,
          response_time_ms: responseTime
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        status: status
      }).catch(err => console.error('Audit log failed:', err));
    }
    
    originalEnd.call(this, chunk);
  };
  
  next();
};

module.exports = auditLogger;