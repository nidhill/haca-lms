const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const User = require('../models/User')
const { lmsAuth } = require('../middleware/lmsAuth')

// POST /api/lms/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase(), role: 'student' })
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        batch: user.batch,
        batchName: user.batchName,
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/auth/me
router.get('/me', lmsAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('batch', 'name code')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        batch: user.batch?._id,
        batchName: user.batch?.name,
        createdAt: user.createdAt,
      },
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email: email.toLowerCase(), role: 'student' })
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' })

    const token = crypto.randomBytes(32).toString('hex')
    user.resetToken = token
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000 // 1 hour
    await user.save()

    // Email sent via existing Resend service
    const { sendPasswordResetEmail } = require('../services/email')
    await sendPasswordResetEmail(user.email, user.name, token)

    res.json({ message: 'Reset link sent.' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
      role: 'student',
    })
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' })

    user.password = await bcrypt.hash(password, 10)
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    res.json({ message: 'Password updated. Please log in.' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/lms/auth/change-password
router.patch('/change-password', lmsAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id)
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' })

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()
    res.json({ message: 'Password updated.' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/lms/auth/update-profile
router.patch('/update-profile', lmsAuth, async (req, res) => {
  try {
    const { phone, avatar } = req.body
    const update = {}
    if (phone !== undefined) update.phone = String(phone).trim()
    if (avatar !== undefined) update.avatar = avatar
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true })
    res.json({ user: { phone: user.phone, avatar: user.avatar } })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/auth/upload-avatar
router.post('/upload-avatar', lmsAuth, async (req, res) => {
  try {
    const multer = require('multer')
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
    upload.single('avatar')(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message })
      if (!req.file) return res.status(400).json({ message: 'No file' })
      const { cloudinary } = require('../services/cloudinary')
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'haca-lms/avatars', transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }] },
        async (error, result) => {
          if (error || !result) return res.status(500).json({ message: 'Upload failed' })
          await User.findByIdAndUpdate(req.user.id, { avatar: result.secure_url })
          res.json({ url: result.secure_url })
        }
      )
      stream.end(req.file.buffer)
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/auth/profile-stats
router.get('/profile-stats', lmsAuth, async (req, res) => {
  try {
    const mongoose = require('mongoose')
    const StudentProgress = require('../models/StudentProgress')
    const Course = require('../models/Course')
    const Certificate = require('../models/Certificate')
    const Attendance = require('../models/Attendance')

    const student = await User.findById(req.user.id).populate('batch')
    const batchId = student?.batch?._id

    // LMS lesson progress
    const completedLessons = await StudentProgress.countDocuments({ student: req.user.id, isComplete: true })
    let totalLessons = 0
    if (batchId) {
      const course = await Course.findOne({ batch: batchId })
      if (course) totalLessons = course.totalLessons || 0
    }
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Attendance %
    let attendancePercent = 0
    if (batchId) {
      const studentDoc = await mongoose.connection.db
        .collection('students').findOne({ email: student.email }, { projection: { _id: 1 } })
      const attendanceStudentId = studentDoc ? String(studentDoc._id) : null
      if (attendanceStudentId) {
        const allAtt = await Attendance.find({ batch: batchId })
        let present = 0, total = 0
        allAtt.forEach(a => {
          const record = a.students.find(s => String(s.student) === attendanceStudentId)
          if (record) { total++; if (record.status === 'present' || record.status === 'late') present++ }
        })
        if (total > 0) attendancePercent = Math.round((present / total) * 100)
      }
    }

    const certCount = await Certificate.countDocuments({ student: req.user.id })

    res.json({ completedLessons, totalLessons, progressPercent, attendancePercent, certCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/auth/activity
router.get('/activity', lmsAuth, async (req, res) => {
  try {
    const StudentProgress = require('../models/StudentProgress')
    const Course = require('../models/Course')
    const Certificate = require('../models/Certificate')

    const recentProgress = await StudentProgress.find({ student: req.user.id, isComplete: true })
      .sort({ completedAt: -1 }).limit(15)

    const courseIds = [...new Set(recentProgress.map(p => String(p.course)))]
    const courses = await Course.find({ _id: { $in: courseIds } })
    const lessonMap = {}
    for (const course of courses) {
      for (const mod of (course.modules || [])) {
        for (const lesson of (mod.lessons || [])) {
          lessonMap[String(lesson._id)] = { lessonTitle: lesson.title, courseTitle: course.title }
        }
      }
    }

    const lessonActivities = recentProgress.slice(0, 10).map(p => ({
      type: 'lesson',
      title: lessonMap[String(p.lessonId)]?.lessonTitle || 'Lesson completed',
      subtitle: lessonMap[String(p.lessonId)]?.courseTitle || '',
      date: p.completedAt || p.updatedAt,
    }))

    const certs = await Certificate.find({ student: req.user.id })
      .populate('course', 'title').sort({ issuedAt: -1 }).limit(5)
    const certActivities = certs.map(c => ({
      type: 'certificate',
      title: `Certificate earned`,
      subtitle: c.course?.title || 'Course',
      date: c.issuedAt,
    }))

    const all = [...lessonActivities, ...certActivities]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15)

    res.json({ activities: all })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/lms/auth/fcm-token
router.patch('/fcm-token', lmsAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { fcmToken: req.body.fcmToken })
    res.json({ message: 'FCM token updated' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
