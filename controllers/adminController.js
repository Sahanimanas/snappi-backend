const Admin = require('../models/Admin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const sendTokenResponse = (admin, statusCode, res, message = 'Success') => {
  const token = jwt.sign(
    { id: admin._id, role: admin.role, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  admin.password = undefined;
  res.status(statusCode).cookie('token', token, options).json({ success: true, message, token, data: admin });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Provide name, email, password' });
    }
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const admin = await Admin.create({ name, email, password });
    sendTokenResponse(admin, 201, res, 'Admin registered');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Provide email and password' });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });
    sendTokenResponse(admin, 200, res, 'Login successful');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out' });
};

exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateDetails = async (req, res) => {
  try {
    const { name, email, profileImage } = req.body;
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email.toLowerCase();
    if (profileImage !== undefined) fieldsToUpdate.profileImage = profileImage;

    const admin = await Admin.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profile updated', data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Provide current and new password' });
    }
    const admin = await Admin.findById(req.user.id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }
    admin.password = newPassword;
    await admin.save();
    sendTokenResponse(admin, 200, res, 'Password updated');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================== ADMIN MANAGEMENT ==================
exports.getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [admins, total] = await Promise.all([
      Admin.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Admin.countDocuments(query)
    ]);
    res.status(200).json({ success: true, count: admins.length, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Provide name, email, password' });
    }
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const admin = await Admin.create({ name, email, password });
    admin.password = undefined;
    res.status(201).json({ success: true, message: 'Admin created', data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { name, email, isActive } = req.body;
    let admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (isActive !== undefined) updateData.isActive = isActive;
    admin = await Admin.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Admin updated', data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    await admin.deleteOne();
    res.status(200).json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetAdminPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password min 6 characters' });
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    admin.password = newPassword;
    await admin.save();
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================== USER MANAGEMENT (Admin manages users) ==================
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, plan, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};
    if (search) {
      query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { 'company.name': new RegExp(search, 'i') }];
    }
    if (role) query.role = role;
    if (plan) query['subscription.plan'] = plan;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const [users, total] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(parseInt(limit)).select('-savedInfluencers'),
      User.countDocuments(query)
    ]);
    res.status(200).json({ success: true, count: users.length, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('savedInfluencers', 'name profileImage');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, company, subscription, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Provide name, email, password' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role || 'user', company, subscription, permissions });
    user.password = undefined;
    res.status(201).json({ success: true, message: 'User created', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, company, subscription, permissions, isActive } = req.body;
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (company) updateData.company = { ...user.company, ...company };
    if (subscription) updateData.subscription = { ...user.subscription, ...subscription };
    if (permissions) updateData.permissions = { ...user.permissions, ...permissions };
    if (isActive !== undefined) updateData.isActive = isActive;
    user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { plan, startDate, endDate, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.subscription = {
      plan: plan || user.subscription?.plan || 'free',
      startDate: startDate || user.subscription?.startDate || new Date(),
      endDate: endDate || user.subscription?.endDate,
      isActive: isActive !== undefined ? isActive : true
    };
    const planPermissions = {
      free: { maxCampaigns: 5, maxSavedInfluencers: 50, canExportData: false, canManageTeam: false },
      starter: { maxCampaigns: 15, maxSavedInfluencers: 200, canExportData: true, canManageTeam: false },
      professional: { maxCampaigns: 50, maxSavedInfluencers: 1000, canExportData: true, canManageTeam: true },
      enterprise: { maxCampaigns: -1, maxSavedInfluencers: -1, canExportData: true, canManageTeam: true }
    };
    if (plan && planPermissions[plan]) {
      user.permissions = { ...user.permissions, ...planPermissions[plan] };
    }
    await user.save();
    res.status(200).json({ success: true, message: 'Subscription updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, roleStats, planStats, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$subscription.plan', count: { $sum: 1 } } }]),
      User.find().sort('-createdAt').limit(5).select('name email role createdAt')
    ]);
    res.status(200).json({ success: true, data: { totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, roleBreakdown: roleStats, planBreakdown: planStats, recentUsers } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};