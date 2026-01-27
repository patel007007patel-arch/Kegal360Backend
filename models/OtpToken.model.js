import mongoose from 'mongoose';

const otpTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['forgot_password', 'email_verification'],
    default: 'forgot_password'
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

otpTokenSchema.index({ email: 1, purpose: 1 });
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL – remove docs after expiresAt

export default mongoose.model('OtpToken', otpTokenSchema);
