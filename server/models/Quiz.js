const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'true_false', 'short_answer'], required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
  }],
  explanation: String,
  marks: { type: Number, default: 1 },
})

const quizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  lessonId: mongoose.Schema.Types.ObjectId,
  title: { type: String, required: true },
  questions: [questionSchema],
  timeLimit: { type: Number, default: 0 },     // 0 = unlimited
  maxAttempts: { type: Number, default: 1 },
  shuffleOptions: { type: Boolean, default: true },
  showExplanations: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Quiz', quizSchema)
