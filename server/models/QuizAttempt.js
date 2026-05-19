const mongoose = require('mongoose')

const quizAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{
    questionIndex: Number,
    selectedOptionId: mongoose.Schema.Types.ObjectId,
    textAnswer: String,
  }],
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  isPassed: { type: Boolean, default: false },
  percentage: { type: Number, default: 0 },
  timeTakenSeconds: Number,
  submittedAt: { type: Date, default: Date.now },
})

quizAttemptSchema.index({ student: 1, quiz: 1 })

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema)
