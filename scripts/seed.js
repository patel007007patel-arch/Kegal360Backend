import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/k360');
    console.log('✅ Connected to MongoDB');

    // Create admin user
    const adminEmail = 'admin@k360.com';
    const adminPassword = 'admin123';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        onboardingCompleted: true,
        isActive: true
      });
      await admin.save();
      console.log('✅ Created admin user');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    }

    console.log('🎉 Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedAdmin();
