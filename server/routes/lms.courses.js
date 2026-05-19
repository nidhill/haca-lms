const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { lmsAuth } = require('../middleware/lmsAuth')
const User = require('../models/User')

const MODULE_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-green-500 to-emerald-600',
]

// GET /api/lms/courses — modules from classlogs grouped by module name
router.get('/', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.json({ courses: [], batchName: '' })

    const db = mongoose.connection.db
    const batchId = student.batch

    const modules = await db.collection('classlogs').aggregate([
      { $match: { batch: batchId, isActive: true } },
      { $sort: { curriculumDay: 1 } },
      { $group: {
        _id: '$module',
        firstDay: { $min: '$curriculumDay' },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        sessions: { $push: {
          _id: '$_id',
          topic: '$topic',
          status: '$status',
          day: '$curriculumDay',
          sessionType: '$sessionType',
          duration: '$duration',
          conductedDate: '$conductedDate',
          notes: '$notes',
          recordingUrl: '$recordingUrl',
        }},
      }},
      { $sort: { firstDay: 1 } },
    ]).toArray()

    const courses = modules
      .filter(m => m._id && m._id.trim() !== '' && m._id !== '—')
      .map((m, i) => ({
        _id: m._id,
        title: m._id,
        batchName: student.batchName || '',
        totalLessons: m.total,
        completedLessons: m.completed,
        progressPercent: m.total ? Math.round((m.completed / m.total) * 100) : 0,
        color: MODULE_COLORS[i % MODULE_COLORS.length],
        sessions: m.sessions.sort((a, b) => a.day - b.day),
      }))

    res.json({ courses, batchName: student.batchName || '' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/courses/:moduleId — sessions for a specific module
router.get('/:moduleId', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.status(404).json({ message: 'Not found' })

    const db = mongoose.connection.db
    const { ObjectId } = require('mongodb')
    const moduleName = decodeURIComponent(req.params.moduleId)

    const sessions = await db.collection('classlogs')
      .find({ batch: student.batch, module: moduleName, isActive: true })
      .sort({ curriculumDay: 1 })
      .toArray()

    if (!sessions.length) return res.status(404).json({ message: 'Module not found' })

    // Fetch which sessions this student has watched
    const sessionIds = sessions.map(s => s._id)
    const watched = await db.collection('sessionwatchprogress')
      .find({ studentId: new ObjectId(req.user.id), sessionId: { $in: sessionIds } })
      .toArray()
    const watchedSet = new Set(watched.map(w => String(w.sessionId)))

    // Build sessions with isWatched + isUnlocked (sequential unlock)
    const enriched = sessions.map((s, i) => ({
      ...s,
      isWatched: watchedSet.has(String(s._id)),
      isUnlocked: i === 0 || watchedSet.has(String(sessions[i - 1]._id)),
    }))

    const watchedCount = watchedSet.size
    res.json({
      module: {
        title: moduleName,
        batchName: student.batchName || '',
        totalLessons: sessions.length,
        completedLessons: watchedCount,
        progressPercent: sessions.length ? Math.round((watchedCount / sessions.length) * 100) : 0,
        sessions: enriched,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/courses/:moduleId/sessions/:sessionId — single session with recording
router.get('/:moduleId/sessions/:sessionId', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.status(404).json({ message: 'Not found' })

    const db = mongoose.connection.db
    const moduleName = decodeURIComponent(req.params.moduleId)
    const { ObjectId } = require('mongodb')

    let sessionId
    try { sessionId = new ObjectId(req.params.sessionId) } catch {
      return res.status(400).json({ message: 'Invalid session ID' })
    }

    const session = await db.collection('classlogs').findOne({
      _id: sessionId,
      batch: student.batch,
      module: moduleName,
      isActive: true,
    })

    if (!session) return res.status(404).json({ message: 'Session not found' })

    // Get all sessions + watch progress for unlock logic
    const allSessions = await db.collection('classlogs')
      .find({ batch: student.batch, module: moduleName, isActive: true })
      .sort({ curriculumDay: 1 })
      .toArray()

    const allIds = allSessions.map(s => s._id)
    const watched = await db.collection('sessionwatchprogress')
      .find({ studentId: new ObjectId(req.user.id), sessionId: { $in: allIds } })
      .toArray()
    const watchedSet = new Set(watched.map(w => String(w.sessionId)))

    const idx = allSessions.findIndex(s => String(s._id) === String(session._id))
    const isWatched = watchedSet.has(String(sessionId))
    const isUnlocked = idx === 0 || watchedSet.has(String(allSessions[idx - 1]._id))

    // prev/next with unlock info
    const prevDoc = idx > 0 ? allSessions[idx - 1] : null
    const nextDoc = idx < allSessions.length - 1 ? allSessions[idx + 1] : null
    const nextUnlocked = isWatched // next is unlocked only after this one is watched

    res.json({
      session: {
        _id: session._id,
        topic: session.topic,
        status: session.status,
        day: session.curriculumDay,
        sessionType: session.sessionType,
        duration: session.duration,
        conductedDate: session.conductedDate,
        notes: session.notes,
        recordingUrl: session.recordingUrl || null,
        module: moduleName,
        batchName: student.batchName || '',
        isWatched,
        isUnlocked,
      },
      prev: prevDoc ? { _id: prevDoc._id, topic: prevDoc.topic, day: prevDoc.curriculumDay } : null,
      next: nextDoc ? { _id: nextDoc._id, topic: nextDoc.topic, day: nextDoc.curriculumDay, isUnlocked: nextUnlocked } : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/courses/:moduleId/sessions/:sessionId/complete — mark session watched
router.post('/:moduleId/sessions/:sessionId/complete', lmsAuth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
    if (!student?.batch) return res.status(404).json({ message: 'Not found' })

    const db = mongoose.connection.db
    const { ObjectId } = require('mongodb')
    const moduleName = decodeURIComponent(req.params.moduleId)

    let sessionId
    try { sessionId = new ObjectId(req.params.sessionId) } catch {
      return res.status(400).json({ message: 'Invalid session ID' })
    }

    const session = await db.collection('classlogs').findOne({
      _id: sessionId, batch: student.batch, module: moduleName, isActive: true,
    })
    if (!session) return res.status(404).json({ message: 'Session not found' })

    await db.collection('sessionwatchprogress').updateOne(
      { studentId: new ObjectId(req.user.id), sessionId },
      { $set: { studentId: new ObjectId(req.user.id), sessionId, completedAt: new Date() } },
      { upsert: true }
    )
    res.json({ message: 'Marked complete' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
