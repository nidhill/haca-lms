const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const { lmsStaffAuth } = require('../middleware/lmsAuth')

const BATCH_SCOPED_ROLES = ['mentor', 'sho']

router.get('/', lmsStaffAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const isBatchScoped = BATCH_SCOPED_ROLES.includes(req.user.role)

    // For mentor/sho: fetch their assigned batch from DB
    let batchFilter = {}
    let assignedBatchId = null
    if (isBatchScoped) {
      const staffUser = await db.collection('users').findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { batch: 1 } }
      )
      if (staffUser?.batch) {
        assignedBatchId = staffUser.batch
        batchFilter = { batch: assignedBatchId }
      }
    }

    const [totalStudents, totalSessions, totalExams, totalAnnouncements] = await Promise.all([
      db.collection('users').countDocuments({ role: 'student', ...batchFilter }),
      db.collection('classlogs').countDocuments({ isActive: true, ...batchFilter }),
      db.collection('moduleexams').countDocuments({ isPublished: true }),
      db.collection('announcements').countDocuments({}),
    ])

    const completedSessions = await db.collection('classlogs').countDocuments({ isActive: true, status: 'completed', ...batchFilter })
    const sessionProgress = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

    const recentAnnouncements = await db.collection('announcements')
      .find({}).sort({ createdAt: -1 }).limit(5).toArray()

    const batchQuery = isBatchScoped && assignedBatchId
      ? { isActive: true, _id: assignedBatchId }
      : { isActive: true }
    const batches = await db.collection('batches').find(batchQuery).toArray()

    res.json({
      stats: { totalStudents, totalSessions, completedSessions, sessionProgress, totalExams, totalAnnouncements, totalBatches: batches.length },
      recentAnnouncements,
      batches: batches.map(b => ({ _id: b._id, name: b.name, code: b.code })),
      scopedToBatch: isBatchScoped,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
