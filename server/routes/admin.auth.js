const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { lmsStaffAuth } = require('../middleware/lmsAuth')

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const mongoose = require('mongoose')
    const { email, password } = req.body
    const user = await mongoose.connection.db.collection('users')
      .findOne({ email: email.toLowerCase() })

    if (!user || user.role === 'student')
      return res.status(401).json({ message: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/admin/auth/me
router.get('/me', lmsStaffAuth, async (req, res) => {
  try {
    const mongoose = require('mongoose')
    const { ObjectId } = require('mongodb')
    const user = await mongoose.connection.db.collection('users')
      .findOne({ _id: new ObjectId(req.user.id) }, { projection: { password: 0 } })
    if (!user) return res.status(404).json({ message: 'Not found' })
    res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
