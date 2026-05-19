const express = require('express')
const router = express.Router()
const { lmsStaffAuth } = require('../middleware/lmsAuth')
const Course = require('../models/Course')
const StudentProgress = require('../models/StudentProgress')
const QuizAttempt = require('../models/QuizAttempt')
const AssignmentSubmission = require('../models/AssignmentSubmission')
const Assignment = require('../models/Assignment')
const User = require('../models/User')

// GET /api/lms/analytics/batch/:batchId — staff only
router.get('/batch/:batchId', lmsStaffAuth, async (req, res) => {
  try {
    const { batchId } = req.params
    const course = await Course.findOne({ batch: batchId })
    if (!course) return res.json({ students: [], avgProgress: 0 })

    const students = await User.find({ batch: batchId, role: 'student' }).select('name email')

    const studentStats = await Promise.all(students.map(async (s) => {
      const completed = await StudentProgress.countDocuments({ student: s._id, course: course._id, isComplete: true })
      const progressPercent = course.totalLessons ? Math.round((completed / course.totalLessons) * 100) : 0

      const quizAttempts = await QuizAttempt.find({ student: s._id })
      const quizPassed = quizAttempts.filter(a => a.isPassed).length

      const assignments = await Assignment.find({ $or: [{ batch: batchId }, { student: s._id }] })
      const submissions = await AssignmentSubmission.countDocuments({ student: s._id, assignment: { $in: assignments.map(a => a._id) } })

      return {
        _id: s._id,
        name: s.name,
        email: s.email,
        progressPercent,
        completedLessons: completed,
        totalLessons: course.totalLessons,
        quizAttempts: quizAttempts.length,
        quizPassed,
        assignmentsSubmitted: submissions,
        totalAssignments: assignments.length,
      }
    }))

    const avgProgress = studentStats.length
      ? Math.round(studentStats.reduce((a, s) => a + s.progressPercent, 0) / studentStats.length)
      : 0

    res.json({ students: studentStats, avgProgress, courseTitle: course.title })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
