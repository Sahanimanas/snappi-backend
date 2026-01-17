const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id, role: user.role, type: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  user.password = undefined;
  res.status(statusCode).cookie('token', token, options).json({ success: true, message, token, data: user });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, company, phone, location } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Provide name, email, password' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role || 'user', company, phone, location });
    sendTokenResponse(user, 201, res, 'Registration successful');
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
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    sendTokenResponse(user, 200, res, 'Login successful');
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
    const user = await User.findById(req.user.id).populate('savedInfluencers', 'name profileImage platforms');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateDetails = async (req, res) => {
  try {
    const { name, email, phone, company, location, profileImage } = req.body;
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email.toLowerCase();
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (profileImage !== undefined) fieldsToUpdate.profileImage = profileImage;
    if (company) fieldsToUpdate.company = { ...req.user.company, ...company };
    if (location) fieldsToUpdate.location = { ...req.user.location, ...location };

    if (email && email.toLowerCase() !== req.user.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profile updated', data: user });
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
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    sendTokenResponse(user, 200, res, 'Password updated');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveInfluencer = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { influencerId } = req.params;
    const maxSaved = user.permissions?.maxSavedInfluencers || 50;
    if (user.savedInfluencers.length >= maxSaved) {
      return res.status(400).json({ success: false, message: `Limit reached. Max ${maxSaved} influencers.` });
    }
    if (user.savedInfluencers.includes(influencerId)) {
      return res.status(400).json({ success: false, message: 'Already saved' });
    }
    user.savedInfluencers.push(influencerId);
    await user.save();
    res.status(200).json({ success: true, message: 'Influencer saved', data: { savedCount: user.savedInfluencers.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.removeSavedInfluencer = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.savedInfluencers = user.savedInfluencers.filter(id => id.toString() !== req.params.influencerId);
    await user.save();
    res.status(200).json({ success: true, message: 'Influencer removed', data: { savedCount: user.savedInfluencers.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSavedInfluencers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.user.id).populate({
      path: 'savedInfluencers',
      select: 'name profileImage platforms location status keywords',
      populate: { path: 'keywords', select: 'name displayName' },
      options: { skip: (parseInt(page) - 1) * parseInt(limit), limit: parseInt(limit) }
    });
    const totalUser = await User.findById(req.user.id);
    res.status(200).json({ success: true, count: user.savedInfluencers.length, total: totalUser.savedInfluencers.length, data: user.savedInfluencers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};