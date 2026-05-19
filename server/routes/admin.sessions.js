const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const { lmsStaffAuth, lmsSessionsWriteAuth } = require('../middleware/lmsAuth')
const multer = require('multer')
const { cloudinary } = require('../services/cloudinary')

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['mp4', 'mov', 'avi', 'mkv', 'webm']
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error(`File type .${ext} not allowed`))
  },
})

const BATCH_SCOPED_ROLES = ['mentor', 'sho']

// GET /api/admin/sessions?batchId=&module=
router.get('/', lmsStaffAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const { batchId, module: moduleName } = req.query
    const filter = { isActive: true }

    const isBatchScoped = BATCH_SCOPED_ROLES.includes(req.user.role)
    if (isBatchScoped) {
      const staffUser = await db.collection('users').findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { batch: 1 } }
      )
      if (staffUser?.batch) filter.batch = staffUser.batch
    } else if (batchId) {
      filter.batch = new ObjectId(batchId)
    }

    if (moduleName) filter.module = moduleName

    const sessions = await db.collection('classlogs')
      .find(filter).sort({ curriculumDay: 1 }).toArray()

    const grouped = {}
    sessions.forEach(s => {
      const mod = s.module || 'Uncategorised'
      if (!grouped[mod]) grouped[mod] = []
      grouped[mod].push(s)
    })

    res.json({ sessions, grouped, scopedToBatch: isBatchScoped })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/admin/sessions/:id/recording — add/update recording URL
router.patch('/:id/recording', lmsSessionsWriteAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const { recordingUrl } = req.body
    await db.collection('classlogs').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { recordingUrl: recordingUrl || null, updatedAt: new Date() } }
    )
    res.json({ message: 'Recording updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/admin/sessions/upload-recording — upload video file to Cloudinary
router.post('/upload-recording', lmsSessionsWriteAuth, (req, res) => {
  videoUpload.single('video')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message })
    if (!req.file) return res.status(400).json({ message: 'No file provided' })
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'lms-haca/recordings', resource_type: 'video', chunk_size: 6000000 },
          (error, result) => error ? reject(error) : resolve(result)
        ).end(req.file.buffer)
      })
      res.json({ url: result.secure_url })
    } catch (e) {
      res.status(500).json({ message: 'Upload failed: ' + e.message })
    }
  })
})

// GET /api/admin/sessions/batches — list batches with school info for filters
router.get('/batches', lmsStaffAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const [batches, schools] = await Promise.all([
      db.collection('batches').find({ isActive: true }).sort({ name: 1 }).toArray(),
      db.collection('schools').find({}).toArray(),
    ])
    const schoolMap = Object.fromEntries(schools.map(s => [String(s._id), s.name]))
    const enriched = batches.map(b => ({
      _id: b._id,
      name: b.name,
      code: b.code,
      mode: b.mode || 'Offline',
      school: schoolMap[String(b.school)] || 'Other',
      courseType: b.courseType,
    }))
    const schoolNames = [...new Set(enriched.map(b => b.school))].sort()
    res.json({ batches: enriched, schools: schoolNames })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
