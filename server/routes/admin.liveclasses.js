const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const { lmsStaffAuth } = require('../middleware/lmsAuth')
const LiveClass = require('../models/LiveClass')

// GET /api/admin/live-classes?batchId=
router.get('/', lmsStaffAuth, async (req, res) => {
  try {
    const { batchId } = req.query
    const filter = {}
    if (batchId) filter.batch = new ObjectId(batchId)

    const classes = await LiveClass.find(filter)
      .sort({ startTime: -1 })
      .limit(50)
      .lean()

    res.json({ classes })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/admin/live-classes
router.post('/', lmsStaffAuth, async (req, res) => {
  try {
    const { batchId, title, startTime, endTime, meetingLink, description } = req.body
    if (!batchId || !title || !startTime || !endTime) {
      return res.status(400).json({ message: 'batchId, title, startTime and endTime are required' })
    }

    const liveClass = await LiveClass.create({
      batch: new ObjectId(batchId),
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      meetingLink: meetingLink || null,
      description: description || null,
      mentor: req.user.id,
    })

    res.json({ liveClass })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/admin/live-classes/:id
router.patch('/:id', lmsStaffAuth, async (req, res) => {
  try {
    const { title, startTime, endTime, meetingLink, description } = req.body
    const updated = await LiveClass.findByIdAndUpdate(
      req.params.id,
      { $set: { title, startTime: new Date(startTime), endTime: new Date(endTime), meetingLink: meetingLink || null, description: description || null } },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: 'Not found' })
    res.json({ liveClass: updated })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/admin/live-classes/:id
router.delete('/:id', lmsStaffAuth, async (req, res) => {
  try {
    await LiveClass.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
