const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { lmsAuth } = require('../middleware/lmsAuth')
const User = require('../models/User')
const Course = require('../models/Course')
const StudentProgress = require('../models/StudentProgress')
const Attendance = require('../models/Attendance')
const Announcement = require('../models/Announcement')
const Assignment = require('../models/Assignment')
const LiveClass = require('../models/LiveClass')

// GET /api/lms/dashboard
router.get('/', lmsAuth, async (req, res) => {
  try {
    const studentId = req.user.id
    const student = await User.findById(studentId).populate('batch')
    if (!student?.batch) return res.json({ stats: {}, announcements: [], deadlines: [] })

    const batchId = student.batch._id

    // Attendance uses students collection _id, not users _id — resolve via email
    const studentDoc = await mongoose.connection.db
      .collection('students')
      .findOne({ email: student.email }, { projection: { _id: 1 } })
    const attendanceStudentId = studentDoc ? String(studentDoc._id) : null

    // Curriculum progress from SHO App classlogs
    const totalLessons = await mongoose.connection.db
      .collection('classlogs')
      .countDocuments({ batch: batchId, isActive: true })
    const completedLessons = await mongoose.connection.db
      .collection('classlogs')
      .countDocuments({ batch: batchId, isActive: true, status: 'completed' })
    const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
    const continueLearning = null

    // Attendance this month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const attendanceDocs = await Attendance.find({ batch: batchId, date: { $gte: monthStart } })
    let present = 0, totalDays = 0
    attendanceDocs.forEach((a) => {
      const record = a.students.find(s => String(s.student) === attendanceStudentId)
      if (record) {
        totalDays++
        if (record.status === 'present' || record.status === 'late') present++
      }
    })
    const attendancePercent = totalDays ? Math.round((present / totalDays) * 100) : 0

    // Exams passed (from existing ModuleExam collection)
    let examsPassed = 0
    try {
      const ModuleExam = require('../models/ModuleExam')
      const exams = await ModuleExam.find({ batch: batchId, isPublished: true })
      examsPassed = exams.filter(e => {
        const r = e.results?.find(r => String(r.student) === attendanceStudentId)
        return r?.isPassed
      }).length
    } catch {}

    // Streak: count consecutive days present going back from today
    let streakDays = 0
    const allAttendance = await Attendance.find({ batch: batchId }).sort({ date: -1 })
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)
    for (const a of allAttendance) {
      const aDate = new Date(a.date)
      aDate.setHours(0, 0, 0, 0)
      if (aDate.getTime() === checkDate.getTime()) {
        const record = a.students.find(s => String(s.student) === attendanceStudentId)
        if (record && (record.status === 'present' || record.status === 'late')) {
          streakDays++
          checkDate.setDate(checkDate.getDate() - 1)
        } else break
      }
    }

    // Announcements (pinned first)
    const announcements = await Announcement.find({ batch: batchId })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name')

    // Deadlines
    const assignments = await Assignment.find({
      batch: batchId,
      dueDate: { $gte: new Date() },
    }).sort({ dueDate: 1 }).limit(5)

    const deadlines = assignments.map(a => ({
      _id: a._id,
      title: a.title,
      type: 'assignment',
      dueDate: a.dueDate,
      courseTitle: course?.title || '',
    }))

    // Next Live Class
    // Show class if it hasn't ended yet (upcoming OR currently live)
    const nextClass = await LiveClass.findOne({
      batch: batchId,
      endTime: { $gte: new Date() }
    }).sort({ startTime: 1 })

    res.json({
      stats: { progressPercent, attendancePercent, examsPassed, streakDays, completedLessons, totalLessons },
      announcements,
      deadlines,
      continueLearning,
      nextClass
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
