const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  meetingLink: String,
  recordingLink: String,
  description: String,
}, { timestamps: true });

module.exports = mongoose.model('LiveClass', liveClassSchema);
