const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
    },
    remarks: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
