const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const { upload } = require('../services/cloudinary')
const Assignment = require('../models/Assignment')
const AssignmentSubmission = require('../models/AssignmentSubmission')
const User = require('../models/User')

// GET /api/lms/assignments
router.get('/', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.json({ assignments: [] })

    const assignments = await Assignment.find({
      $or: [{ batch: student.batch }, { student: req.user.id }],
      status: { $ne: 'draft' },
    }).sort({ dueDate: 1 })

    const submissions = await AssignmentSubmission.find({ student: req.user.id })
    const subMap = Object.fromEntries(submissions.map(s => [String(s.assignment), s]))

    const result = assignments.map(a => {
      const sub = subMap[String(a._id)]
      const now = new Date()
      let status = sub
        ? sub.status === 'graded' ? 'graded' : 'submitted'
        : now > new Date(a.dueDate) ? 'late' : 'pending'

      return {
        _id: a._id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
        status,
        submission: sub ? {
          _id: sub._id,
          fileUrl: sub.fileUrl,
          fileName: sub.fileName,
          fileSize: sub.fileSize,
          submittedAt: sub.createdAt,
          isLate: sub.isLate,
          score: sub.score,
          feedback: sub.feedback,
          gradedAt: sub.gradedAt,
        } : undefined,
      }
    })

    res.json({ assignments: result })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/assignments/:id/submit
router.post('/:id/submit', lmsAuth, upload.single('file'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' })

    const existing = await AssignmentSubmission.findOne({ assignment: assignment._id, student: req.user.id })
    if (existing) return res.status(400).json({ message: 'Already submitted' })

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const fileUrl = req.file.path      // Cloudinary secure URL
    const fileName = req.file.originalname
    const fileSize = req.file.size
    const isLate = new Date() > new Date(assignment.dueDate)

    await AssignmentSubmission.create({
      assignment: assignment._id,
      student: req.user.id,
      fileUrl,
      fileName,
      fileSize,
      fileType: req.file.mimetype,
      isLate,
    })

    res.json({ message: 'Assignment submitted successfully', isLate, fileUrl })
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum 50 MB allowed.' })
    }
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

module.exports = router
