// src/utils/validators.js - Simplified validation

const Joi = require('joi');

const validateRegistration = (data) => {
  const schema = Joi.object({
    registration_number: Joi.string().min(4).max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(50).required(),
    confirm_password: Joi.string().valid(Joi.ref('password')).required(),
    full_name: Joi.string().min(2).max(100).required(),
    selected_role: Joi.string().valid('student', 'dean', 'commissioner').required(),
    
    // Student-specific fields (only required for students)
    department: Joi.when('selected_role', {
      is: 'student',
      then: Joi.string().required(),
      otherwise: Joi.optional().allow(null, '')
    }),
    year_of_study: Joi.when('selected_role', {
      is: 'student',
      then: Joi.number().integer().min(1).max(5).required(),
      otherwise: Joi.optional().allow(null, '')
    }),
    
    // Dean/Commissioner fields (not required at registration)
    justification: Joi.string().optional().allow(null, ''),
    qualifications: Joi.string().optional().allow(null, ''),
    experience: Joi.string().optional().allow(null, '')
  });
  
  return schema.validate(data);
};

// Other validators remain the same...
const validateLogin = (data) => {
  const schema = Joi.object({
    identifier: Joi.string().required().min(3).max(100),
    password: Joi.string().required()
  });
  
  return schema.validate(data);
};

const validateElection = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
    positions: Joi.array().items(Joi.string())
  });
  
  return schema.validate(data);
};

const validateCandidate = (data) => {
  const schema = Joi.object({
    position: Joi.string().required(),
    manifesto: Joi.string().min(50).max(5000).required(),
    campaign_slogan: Joi.string().max(100),
    achievements: Joi.string().max(2000)
  });
  
  return schema.validate(data);
};

const validateVote = (data) => {
  const schema = Joi.object({
    candidate_id: Joi.number().required(),
    election_id: Joi.number().required(),
    signature: Joi.string().required()
  });
  
  return schema.validate(data);
};

const validateWallet = (data) => {
  const schema = Joi.object({
    wallet_address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/i).required(),
    signature: Joi.string().required()
  });
  
  return schema.validate(data);
};

const validateOTP = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
  });
  
  return schema.validate(data);
};

const validatePasswordChange = (data) => {
  const schema = Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).max(50).required(),
    confirm_new_password: Joi.string().valid(Joi.ref('new_password')).required()
  });
  
  return schema.validate(data);
};

const validateReport = (data) => {
  const schema = Joi.object({
    report_type: Joi.string().valid('results', 'turnout', 'audit', 'candidates', 'voters').required(),
    election_id: Joi.number().when('report_type', {
      is: Joi.string().valid('results', 'turnout'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    format: Joi.string().valid('pdf', 'csv', 'excel').default('pdf')
  });
  
  return schema.validate(data);
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateElection,
  validateCandidate,
  validateVote,
  validateWallet,
  validateOTP,
  validatePasswordChange,
  validateReport
};