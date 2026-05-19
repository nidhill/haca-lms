const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const Announcement = require('../models/Announcement')
const User = require('../models/User')

// GET /api/lms/announcements
router.get('/', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.json({ announcements: [] })

    const announcements = await Announcement.find({ batch: student.batch })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(30)
      .populate('createdBy', 'name')

    res.json({ announcements })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
