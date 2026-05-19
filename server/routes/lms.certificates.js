const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const Certificate = require('../models/Certificate')
const Course = require('../models/Course')

// GET /api/lms/certificates
router.get('/', lmsAuth, async (req, res) => {
  try {
    const certs = await Certificate.find({ student: req.user.id })
      .populate('course', 'title')
      .sort({ issuedAt: -1 })

    const result = certs.map(c => ({
      _id: c._id,
      certificateId: c.certificateId,
      courseTitle: c.course?.title || 'Course',
      issuedAt: c.issuedAt,
      pdfUrl: c.pdfUrl,
      verificationUrl: `${process.env.FRONTEND_URL}/verify/${c.certificateId}`,
    }))

    res.json({ certificates: result })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/certificates/verify/:id  — PUBLIC, no auth
router.get('/verify/:id', async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.id })
      .populate('student', 'name')
      .populate('course', 'title')

    if (!cert) return res.json({ isValid: false })

    res.json({
      isValid: true,
      studentName: cert.student?.name,
      courseTitle: cert.course?.title,
      issuedAt: cert.issuedAt,
      certificateId: cert.certificateId,
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
