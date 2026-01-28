import User from '../../models/User.model.js';

/**
 * GET /api/admin/profile
 * Get current admin's profile information
 */
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * PUT /api/admin/profile
 * Update admin profile (name, email, etc.)
 */
export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = {};

    if (name !== undefined) {
      updateData.name = String(name).trim();
    }

    if (email !== undefined) {
      const normalEmail = email.toLowerCase().trim();
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: normalEmail, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
      updateData.email = normalEmail;
    }

    const admin = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * PUT /api/admin/profile/change-password
 * Change admin password (requires current password + new password)
 */
export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    const trimmedNewPassword = newPassword.trim();
    if (trimmedNewPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get admin with password field
    const admin = await User.findById(req.user._id).select('+password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await admin.comparePassword(trimmedNewPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    admin.password = trimmedNewPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword
};
