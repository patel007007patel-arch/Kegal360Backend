import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Question from '../models/Question.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedQuestions = [
  {
    question: "What should we call you?",
    type: "text",
    order: 1,
    isRequired: true,
    category: "onboarding"
  },
  {
    question: "What year were you born?",
    type: "number",
    order: 2,
    isRequired: true,
    category: "onboarding",
    validation: {
      min: 1900,
      max: new Date().getFullYear()
    }
  },
  {
    question: "Who is the app for?",
    type: "select",
    options: ["Use for myself", "Partner's cycle"],
    order: 3,
    isRequired: true,
    category: "onboarding"
  },
  {
    question: "What best describes your cycle?",
    type: "select",
    options: ["Regular", "Irregular", "Absent"],
    order: 4,
    isRequired: true,
    category: "cycle_setup"
  },
  {
    question: "Generally, how long are your cycles?",
    type: "number",
    order: 5,
    isRequired: false,
    category: "cycle_setup",
    validation: {
      min: 21,
      max: 45
    }
  },
  {
    question: "When did your last period start?",
    type: "date",
    order: 6,
    isRequired: false,
    category: "cycle_setup"
  },
  {
    question: "When did your last period end?",
    type: "date",
    order: 7,
    isRequired: false,
    category: "cycle_setup"
  }
];

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/k360');
    console.log('✅ Connected to MongoDB');

    // Clear existing questions
    await Question.deleteMany({});
    console.log('🗑️  Cleared existing questions');

    // Seed questions
    await Question.insertMany(seedQuestions);
    console.log('✅ Seeded questions');

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
