const { body, param, query, validationResult } = require('express-validator');

/**
 * Validate request and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('role').isIn(['student', 'teacher', 'admin']).withMessage('Valid role is required')
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ]
};

// Question validation rules
const questionValidation = {
  create: [
    body('question_type')
      .isIn(['mcq', 'multi_correct', 'true_false', 'subjective', 'fill_blank'])
      .withMessage('Valid question type is required'),
    body('question_text').trim().notEmpty().withMessage('Question text is required'),
    body('marks').isFloat({ min: 0 }).withMessage('Marks must be a positive number'),
    body('options').optional().isArray().withMessage('Options must be an array')
  ]
};

// Exam validation rules
const examValidation = {
  create: [
    body('title').trim().notEmpty().withMessage('Exam title is required'),
    body('duration_minutes').isInt({ min: 1 }).withMessage('Duration must be positive'),
    body('total_marks').isFloat({ min: 0 }).withMessage('Total marks must be positive'),
    body('scheduled_start').isISO8601().withMessage('Valid start date is required'),
    body('scheduled_end').isISO8601().withMessage('Valid end date is required')
  ],
  update: [
    param('id').isUUID().withMessage('Valid exam ID is required')
  ]
};

// Exam attempt validation
const attemptValidation = {
  submit: [
    body('answers').isArray().withMessage('Answers must be an array'),
    body('answers.*.question_id').isUUID().withMessage('Valid question ID required'),
    body('answers.*.answer_text').optional().isString()
  ]
};

module.exports = {
  validate,
  userValidation,
  questionValidation,
  examValidation,
  attemptValidation
};
