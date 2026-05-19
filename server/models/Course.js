const mongoose = require('mongoose')

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  type: { type: String, enum: ['video', 'pdf', 'text', 'link'], required: true },
  contentUrl: String,
  duration: Number,
  description: String,
  isPublished: { type: Boolean, default: false },
})

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  lessons: [lessonSchema],
})

const courseSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  title: { type: String, required: true },
  description: String,
  thumbnail: String,
  modules: [moduleSchema],
  totalLessons: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

// Sync totalLessons on save
courseSchema.pre('save', function (next) {
  this.totalLessons = this.modules.reduce((acc, m) => acc + m.lessons.length, 0)
  next()
})

module.exports = mongoose.model('Course', courseSchema)
