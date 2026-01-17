const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

/**
 * Protect routes - verify JWT token for both Admin and User
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let account;
    
    if (decoded.type === 'admin') {
      account = await Admin.findById(decoded.id).select('-password');
      if (account) account._type = 'admin';
    } else {
      account = await User.findById(decoded.id).select('-password');
      if (account) account._type = 'user';
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Account not found.'
      });
    }

    if (!account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    if (account.changedPasswordAfter && account.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password changed. Please log in again.'
      });
    }

    req.user = account;
    req.userType = account._type;
    next();
  } catch (error) {
    let message = 'Not authorized';
    if (error.name === 'JsonWebTokenError') message = 'Invalid token.';
    if (error.name === 'TokenExpiredError') message = 'Token expired.';

    return res.status(401).json({ success: false, message });
  }
};

/**
 * Protect routes - Admin only (Admin has ALL power)
 */
exports.protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Admin access required.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found.'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account deactivated.'
      });
    }

    req.user = admin;
    req.userType = 'admin';
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin token.'
    });
  }
};

/**
 * Protect routes - User only (user, brand, agency)
 */
exports.protectUser = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User account required.'
      });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account deactivated.'
      });
    }

    req.user = user;
    req.userType = 'user';
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

/**
 * Grant access to specific user roles (user, brand, agency)
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    // Admin has all access
    if (req.userType === 'admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' not authorized.`
      });
    }
    next();
  };
};

/**
 * Check specific permission for users
 */
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    // Admin has all permissions
    if (req.userType === 'admin') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission}`
      });
    }

    next();
  };
};

/**
 * Check subscription plan
 */
exports.requirePlan = (...plans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    // Admin bypasses plan checks
    if (req.userType === 'admin') {
      return next();
    }

    const userPlan = req.user.subscription?.plan || 'free';
    
    if (!plans.includes(userPlan)) {
      return res.status(403).json({
        success: false,
        message: `Requires ${plans.join(' or ')} plan. Current: ${userPlan}`
      });
    }

    if (req.user.subscription && !req.user.subscription.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired.'
      });
    }

    next();
  };
};

/**
 * Optional auth - doesn't fail if no token
 */
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let account;
    if (decoded.type === 'admin') {
      account = await Admin.findById(decoded.id).select('-password');
      if (account) account._type = 'admin';
    } else {
      account = await User.findById(decoded.id).select('-password');
      if (account) account._type = 'user';
    }
    
    if (account && account.isActive) {
      req.user = account;
      req.userType = account._type;
    }
  } catch (error) {
    // Continue without user
  }

  next();
};