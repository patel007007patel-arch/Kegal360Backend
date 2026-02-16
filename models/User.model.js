import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  name: {
    type: String,
    trim: true
  },
  birthYear: {
    type: Number
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  appFor: {
    type: String,
    enum: ['myself', 'partner'],
    default: 'myself'
  },
  // Social login
  googleId: String,
  appleId: String,
  socialProvider: {
    type: String,
    enum: ['email', 'google', 'apple']
  },
  // Onboarding: all answers stored in User fields above (name, birthYear, appFor, trackCycle, cycleType, etc.)
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  // Cycle tracking preference
  trackCycle: {
    type: Boolean,
    default: true
  },
  cycleType: {
    type: String,
    enum: ['regular', 'irregular', 'absent'],
    default: 'regular'
  },
  cycleLength: {
    type: Number, // For regular cycles (Edit Mode: "Cycle Length" in days)
    default: 28
  },
  periodLength: {
    type: Number, // For regular/irregular: "Period Length" in days (default 5)
    default: 5
  },
  cycleLengthRange: {
    min: Number, // For irregular (e.g. 28–38) or absent (0–0); stored in DB as sent
    max: Number
  },
  lastPeriodStart: Date,
  lastPeriodEnd: Date,
  // Partner sharing            
  partnerCode: {
    type: String,
    unique: true,
    sparse: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Settings
  settings: {
    pushNotifications: {
      type: Boolean,
      default: true
    },
    darkTheme: {
      type: Boolean,
      default: false
    },
    emailUpdates: {
      type: Boolean,
      default: false
    }
  },
  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'monthly', 'yearly'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    },
    paymentId: String
  },
  // Profile
  profilePicture: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Generate unique partner code (6 capital letters only)
userSchema.statics.generateUniquePartnerCode = async function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    // Generate 6-character code with only capital letters
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existing = await this.findOne({ partnerCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique partner code after multiple attempts');
  }

  return code;
};

// Generate partner code (instance method - regenerates unique code)
userSchema.methods.generatePartnerCode = async function() {
  const User = this.constructor;
  const code = await User.generateUniquePartnerCode();
  this.partnerCode = code;
  return code;
};

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
