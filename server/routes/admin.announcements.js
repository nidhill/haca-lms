const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const { lmsStaffAuth, lmsSessionsWriteAuth } = require('../middleware/lmsAuth')

// Roles that can create/edit/delete announcements (not SHO — read-only for SHO)
const ANNOUNCEMENT_WRITE_ROLES = ['admin', 'ceo_haca', 'leadership', 'academic', 'ssho', 'pl', 'mentor']
function announcementWriteAuth(req, res, next) {
  if (!ANNOUNCEMENT_WRITE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to manage announcements' })
  }
  next()
}

// GET /api/admin/announcements
router.get('/', lmsStaffAuth, async (req, res) => {
  try {
    const list = await mongoose.connection.db.collection('announcements')
      .find({}).sort({ createdAt: -1 }).toArray()
    res.json({ announcements: list })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

// POST /api/admin/announcements
router.post('/', lmsStaffAuth, announcementWriteAuth, async (req, res) => {
  try {
    const { title, body, isPinned, targetBatch } = req.body
    const doc = {
      title, body, isPinned: !!isPinned,
      targetBatch: targetBatch || null,
      createdBy: req.user.id,
      createdAt: new Date(), updatedAt: new Date(),
    }
    const result = await mongoose.connection.db.collection('announcements').insertOne(doc)
    res.json({ _id: result.insertedId, ...doc })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

// PATCH /api/admin/announcements/:id
router.patch('/:id', lmsStaffAuth, announcementWriteAuth, async (req, res) => {
  try {
    const { title, body, isPinned } = req.body
    await mongoose.connection.db.collection('announcements').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { title, body, isPinned: !!isPinned, updatedAt: new Date() } }
    )
    res.json({ message: 'Updated' })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

// DELETE /api/admin/announcements/:id
router.delete('/:id', lmsStaffAuth, announcementWriteAuth, async (req, res) => {
  try {
    await mongoose.connection.db.collection('announcements').deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ message: 'Deleted' })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

module.exports = router
