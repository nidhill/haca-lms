const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { lmsAuth } = require('../middleware/lmsAuth')
const Attendance = require('../models/Attendance')
const User = require('../models/User')

// GET /api/lms/attendance
router.get('/', lmsAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user?.batch) return res.json({ records: [] })

    // Attendance stores students[] with ref to `students` collection, not `users`
    // Match via email to get the correct students._id
    const studentDoc = await mongoose.connection.db
      .collection('students')
      .findOne({ email: user.email }, { projection: { _id: 1 } })

    if (!studentDoc) return res.json({ records: [] })

    const studentId = studentDoc._id

    const { month, year } = req.query
    const filter = { batch: user.batch }
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1)
      const end = new Date(Number(year), Number(month), 1)
      filter.date = { $gte: start, $lt: end }
    }

    const docs = await Attendance.find(filter).sort({ date: 1 })

    const records = docs
      .map(a => {
        const record = a.students.find(s => String(s.student) === String(studentId))
        if (!record) return null
        return { date: a.date, status: record.status, remarks: record.remarks }
      })
      .filter(Boolean)

    res.json({ records })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
