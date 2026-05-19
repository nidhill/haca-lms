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
        batch: user.batch?._id,
        batchName: user.batch?.name,
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
