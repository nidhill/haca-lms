const mongoose = require('mongoose')

const discussionSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', default: null },
  isBestAnswer: { type: Boolean, default: false },
}, { timestamps: true })

discussionSchema.index({ lessonId: 1, createdAt: 1 })

module.exports = mongoose.model('Discussion', discussionSchema)
