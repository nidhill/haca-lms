const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { lmsAuth } = require('../middleware/lmsAuth')
const User = require('../models/User')

// GET /api/lms/exams
router.get('/', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.json({ results: [] })

    // Resolve students._id via email (SHO App stores student refs by students._id, not users._id)
    const studentDoc = await mongoose.connection.db
      .collection('students')
      .findOne({ email: student.email }, { projection: { _id: 1 } })
    if (!studentDoc) return res.json({ results: [] })

    const studentId = String(studentDoc._id)

    const exams = await mongoose.connection.db
      .collection('moduleexams')
      .find({ batch: student.batch, isPublished: true })
      .sort({ examDate: -1 })
      .toArray()

    const results = exams
      .map(e => {
        const r = e.results?.find(r => String(r.student) === studentId)
        if (!r || r.isAbsent) return null

        const marks = r.marks ?? 0
        const total = e.totalMarks || 100
        const pct = total > 0 ? Math.round((marks / total) * 100) : 0
        const passThreshold = e.passMarkPercent ?? 50
        const isPassed = r.isPassed ?? (pct >= passThreshold)

        return {
          _id: e._id,
          moduleName: e.moduleName || 'Unknown Module',
          marks,
          totalMarks: total,
          percent: pct,
          grade: computeGrade(pct),
          isPassed,
          examDate: e.examDate,
          publishedAt: e.publishedAt,
        }
      })
      .filter(Boolean)

    res.json({ results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

function computeGrade(pct) {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

module.exports = router
