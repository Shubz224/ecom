const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/tokenUtils');

// ============ AUTHENTICATION BUSINESS LOGIC ============

/**
 * Register New User
 */
const registerUser = async (userData) => {
  const { name, email, password, phone, address } = userData;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }
  
  // Create new user
  const user = new User({
    name,
    email,
    password,
    phone,
    address
  });
  
  await user.save();
  
  // Generate tokens
  const tokens = generateTokenPair(user);
  
  return {
    user: user.getPublicProfile(),
    ...tokens
  };
};

/**
 * Login User
 */
const loginUser = async (email, password) => {
  // Find user with password
  const user = await User.findByEmailWithPassword(email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }
  
  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();
  
  // Generate tokens
  const tokens = generateTokenPair(user);
  
  return {
    user: user.getPublicProfile(),
    ...tokens
  };
};

/**
 * Refresh Access Token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    // Generate new token pair
    const tokens = generateTokenPair(user);
    
    return {
      user: user.getPublicProfile(),
      ...tokens
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Get User Profile
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  return user.getPublicProfile();
};

/**
 * Update User Profile
 */
const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Update allowed fields
  const allowedUpdates = ['name', 'phone', 'address', 'avatar'];
  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      user[key] = updateData[key];
    }
  });
  
  await user.save();
  return user.getPublicProfile();
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserProfile,
  updateUserProfile
};
