const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const { lmsStaffAuth } = require('../middleware/lmsAuth')

const BATCH_SCOPED_ROLES = ['mentor', 'sho']

// GET /api/admin/students?batch=&search=
// Reads from SHO App's `students` collection so all students are visible
router.get('/', lmsStaffAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const { batch, search } = req.query
    const filter = {}

    const isBatchScoped = BATCH_SCOPED_ROLES.includes(req.user.role)
    if (isBatchScoped) {
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
      { rollNumber: { $regex: search, $options: 'i' } },
    ]

    // Pull from SHO App's students collection (all enrolled students)
    const students = await db.collection('students')
      .find(filter, { projection: { password: 0 } })
      .sort({ name: 1 })
      .limit(200)
      .toArray()

    // Also get LMS users to mark which students have LMS portal access
    const emails = students.map(s => s.email).filter(Boolean)
    const lmsUsers = await db.collection('users')
      .find({ email: { $in: emails }, role: 'student' }, { projection: { email: 1 } })
      .toArray()
    const lmsEmailSet = new Set(lmsUsers.map(u => u.email))

    const result = students.map(s => ({
      ...s,
      hasLmsAccess: lmsEmailSet.has(s.email),
    }))

    res.json({ students: result, scopedToBatch: isBatchScoped })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
