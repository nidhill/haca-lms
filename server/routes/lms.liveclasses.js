const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const LiveClass = require('../models/LiveClass')
const User = require('../models/User')

// GET /api/lms/live-classes
router.get('/', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.json({ upcoming: [], past: [] })

    const all = await LiveClass.find({ batch: student.batch })
      .sort({ startTime: -1 })
      .populate('mentor', 'name')

    const now = new Date()
    const upcoming = all.filter(c => new Date(c.endTime) >= now).reverse()
    const past     = all.filter(c => new Date(c.endTime) < now)

    res.json({ upcoming, past })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
