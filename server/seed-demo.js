const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Batch = require('./models/Batch');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sho_app');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({ role: 'student' });
    await Batch.deleteMany({});

    // Create a batch
    const batch = await Batch.create({
      name: 'Full Stack Web Dev - Batch 1',
      code: 'FSWD01',
      status: 'active',
    });
    console.log('Batch created:', batch.code);

    // Create a student
    const hashedPassword = await bcrypt.hash('password123', 10);
    const student = await User.create({
      name: 'John Doe',
      email: 'student@example.com',
      password: hashedPassword,
      role: 'student',
      batch: batch._id,
      batchName: batch.name,
    });
    console.log('Student created: student@example.com / password123');

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
