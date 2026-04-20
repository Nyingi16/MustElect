const { validationResult, body } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateRegistration = [
  body('registration_number').isLength({ min: 4, max: 20 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('full_name').isLength({ min: 2, max: 100 }).trim(),
  body('department').notEmpty(),
  body('year_of_study').isInt({ min: 1, max: 5 }),
  validate
];

const validateLogin = [
  body('registration_number').notEmpty(),
  body('password').notEmpty(),
  validate
];

const validateElection = [
  body('title').isLength({ min: 3, max: 255 }),
  body('start_date').isISO8601(),
  body('end_date').isISO8601().custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.start_date)) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
  validate
];

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateElection
};