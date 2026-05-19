const mongoose = require('mongoose')

const announcementSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentPushNotification: { type: Boolean, default: false },
}, { timestamps: true })

announcementSchema.index({ batch: 1, createdAt: -1 })

module.exports = mongoose.model('Announcement', announcementSchema)
