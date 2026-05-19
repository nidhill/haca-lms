const mongoose = require('mongoose')

const studentProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  isComplete: { type: Boolean, default: false },
  completedAt: Date,
  watchedSeconds: { type: Number, default: 0 },
  lastPosition: { type: Number, default: 0 },
}, { timestamps: true })

studentProgressSchema.index({ student: 1, course: 1, lessonId: 1 }, { unique: true })

module.exports = mongoose.model('StudentProgress', studentProgressSchema)
