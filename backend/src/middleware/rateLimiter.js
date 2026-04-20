// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Less strict limiter for auth endpoints (more attempts allowed)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window (reduced from 15 minutes)
  max: 30, // 30 attempts per minute (increased from 5)
  message: { error: 'Too many authentication attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Voting limiter (stricter)
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 vote attempts per minute
  message: { error: 'Too many vote attempts, please wait.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, apiLimiter, voteLimiter };