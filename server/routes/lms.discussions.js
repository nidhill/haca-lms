const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const Discussion = require('../models/Discussion')

// GET /api/lms/discussions/:lessonId
router.get('/:lessonId', lmsAuth, async (req, res) => {
  try {
    const all = await Discussion.find({ lessonId: req.params.lessonId, parentComment: null })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar')

    const replies = await Discussion.find({ lessonId: req.params.lessonId, parentComment: { $ne: null } })
      .populate('author', 'name avatar')

    const replyMap = {}
    replies.forEach(r => {
      const key = String(r.parentComment)
      if (!replyMap[key]) replyMap[key] = []
      replyMap[key].push(r)
    })

    const comments = all.map(c => ({ ...c.toObject(), replies: replyMap[String(c._id)] || [] }))
    res.json({ comments })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/discussions/:lessonId
router.post('/:lessonId', lmsAuth, async (req, res) => {
  try {
    const { body, parentComment, courseId } = req.body
    if (!body?.trim()) return res.status(400).json({ message: 'Comment body required' })

    const comment = await Discussion.create({
      lessonId: req.params.lessonId,
      courseId,
      author: req.user.id,
      body: body.trim(),
      parentComment: parentComment || null,
    })
    await comment.populate('author', 'name avatar')
    res.status(201).json({ comment })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/lms/discussions/:commentId/best — mentor only action
router.patch('/:commentId/best', lmsAuth, async (req, res) => {
  try {
    const comment = await Discussion.findByIdAndUpdate(
      req.params.commentId,
      { isBestAnswer: true },
      { new: true }
    )
    if (!comment) return res.status(404).json({ message: 'Comment not found' })
    res.json({ comment })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
