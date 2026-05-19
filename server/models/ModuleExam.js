const mongoose = require('mongoose');

const moduleExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  results: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    score: Number,
    isPassed: Boolean,
  }],
}, { timestamps: true });

module.exports = mongoose.model('ModuleExam', moduleExamSchema);
