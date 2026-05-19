const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'upcoming'],
    default: 'active',
  },
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
