const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { lmsAuth } = require('../middleware/lmsAuth')
const User = require('../models/User')
const StudentProgress = require('../models/StudentProgress')
const Attendance = require('../models/Attendance')

// GET /api/lms/leaderboard
router.get('/', lmsAuth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
    if (!me?.batch) return res.json({ rankings: [] })

    const batchId = me.batch

    // All students in batch
    const students = await User.find({ batch: batchId, role: 'student' }).select('name email')

    // Total completed classlogs for this batch (the content ceiling)
    const db = mongoose.connection.db
    const totalSessions = await db.collection('classlogs')
      .countDocuments({ batch: batchId, isActive: true, status: 'completed' })

    // Attendance records this month for the batch
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const attendanceDocs = await Attendance.find({ batch: batchId, date: { $gte: monthStart } })

    // Map student email → attendance studentId via students collection
    const emails = students.map(s => s.email)
    const studentDocs = await db.collection('students')
      .find({ email: { $in: emails } }, { projection: { _id: 1, email: 1 } })
      .toArray()
    const emailToStudentId = Object.fromEntries(studentDocs.map(d => [d.email, String(d._id)]))

    const rankings = await Promise.all(students.map(async (s) => {
      // LMS lesson completions
      const completed = await StudentProgress.countDocuments({ student: s._id, isComplete: true })

      // Attendance this month
      const sid = emailToStudentId[s.email]
      let present = 0, total = 0
      if (sid) {
        attendanceDocs.forEach(a => {
          const rec = a.students.find(r => String(r.student) === sid)
          if (rec) { total++; if (rec.status === 'present' || rec.status === 'late') present++ }
        })
      }
      const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0

      // Score: 70% weight on lesson progress, 30% on attendance
      const progressPercent = totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0
      const score = Math.round(progressPercent * 0.7 + attendancePercent * 0.3)

      return {
        _id: s._id,
        name: s.name,
        completed,
        totalSessions,
        progressPercent,
        attendancePercent,
        score,
        isYou: String(s._id) === String(req.user.id),
      }
    }))

    rankings.sort((a, b) => b.score - a.score)
    rankings.forEach((r, i) => { r.rank = i + 1 })

    res.json({ rankings, batchTotal: totalSessions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
