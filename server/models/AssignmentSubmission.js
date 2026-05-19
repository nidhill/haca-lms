const mongoose = require('mongoose')

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  fileName: String,
  fileSize: Number,
  fileType: String,
  isLate: { type: Boolean, default: false },
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
  score: Number,
  feedback: String,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: Date,
}, { timestamps: true })

assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true })

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema)
