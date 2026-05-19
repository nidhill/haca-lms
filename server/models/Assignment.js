const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
  },
  dueDate: Date,
  totalMarks: Number,
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
