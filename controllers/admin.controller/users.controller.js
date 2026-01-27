import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import Subscription from '../../models/Subscription.model.js';

export const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role, 
      subscriptionPlan,
      subscriptionStatus,
      onboardingStatus,
      isActive,
      dateFrom,
      dateTo
    } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (subscriptionPlan) {
      query['subscription.plan'] = subscriptionPlan;
    }

    if (subscriptionStatus) {
      if (subscriptionStatus === 'active') {
        query['subscription.isActive'] = true;
      } else if (subscriptionStatus === 'inactive') {
        query.$or = [
          { 'subscription.isActive': false },
          { 'subscription.isActive': { $exists: false } }
        ];
      }
    }

    if (onboardingStatus) {
      if (onboardingStatus === 'completed') {
        query.onboardingCompleted = true;
      } else if (onboardingStatus === 'pending') {
        query.onboardingCompleted = { $ne: true };
      }
    }

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user stats
    const logCount = await Log.countDocuments({ user: id });
    const cycleCount = await Cycle.countDocuments({ user: id });
    const subscription = await Subscription.findOne({ user: id });

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          stats: {
            logCount,
            cycleCount,
            subscription
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove sensitive fields
    delete updateData.password;
    delete updateData._id;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, password, name, role, isActive, subscription } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const userData = {
      email: email.toLowerCase(),
      name,
      password: password || 'defaultPassword123',
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      socialProvider: 'email'
    };

    if (subscription) {
      userData.subscription = subscription;
    }

    const user = new User(userData);
    
    // Generate unique partner code
    const partnerCode = await User.generateUniquePartnerCode();
    user.partnerCode = partnerCode;
    
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          subscription: user.subscription
        }
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

export default { getAllUsers, getUserById, createUser, updateUser, deleteUser };
