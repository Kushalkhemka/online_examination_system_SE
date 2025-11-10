/**
 * Authentication Middleware
 */

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please login.'
  });
};

// Check if user has specific role
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = hasRole('admin');

// Check if user is teacher or admin
const isTeacherOrAdmin = hasRole('teacher', 'admin');

// Check if user is student
const isStudent = hasRole('student');

// Attach user info to request
const attachUser = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
};

module.exports = {
  isAuthenticated,
  hasRole,
  isAdmin,
  isTeacherOrAdmin,
  isStudent,
  attachUser
};
