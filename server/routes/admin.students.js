const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const { lmsStaffAuth } = require('../middleware/lmsAuth')

const BATCH_SCOPED_ROLES = ['mentor', 'sho']

// GET /api/admin/students?batch=&search=
router.get('/', lmsStaffAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const { batch, search } = req.query
    const filter = { role: 'student' }

    const isBatchScoped = BATCH_SCOPED_ROLES.includes(req.user.role)
    if (isBatchScoped) {
      // Mentor/SHO can only see students from their assigned batch
      const staffUser = await db.collection('users').findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { batch: 1 } }
      )
      if (staffUser?.batch) filter.batch = staffUser.batch
    } else if (batch) {
      filter.batch = new ObjectId(batch)
    }

    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]

    const students = await db.collection('users')
      .find(filter, { projection: { password: 0 } })
      .sort({ name: 1 }).limit(100).toArray()

    res.json({ students, scopedToBatch: isBatchScoped })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
