const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const Quiz = require('../models/Quiz')
const QuizAttempt = require('../models/QuizAttempt')

// GET /api/lms/quizzes/:id  — returns questions WITHOUT isCorrect field
router.get('/:id', lmsAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
    if (!quiz || !quiz.isPublished) return res.status(404).json({ message: 'Quiz not found' })

    const attemptsUsed = await QuizAttempt.countDocuments({ student: req.user.id, quiz: quiz._id })

    // Strip correct answers before sending to client
    const questions = quiz.questions.map(q => ({
      _id: q._id,
      text: q.text,
      type: q.type,
      marks: q.marks,
      options: q.options.map(o => ({ _id: o._id, text: o.text })),  // NO isCorrect
    }))

    // Shuffle options if configured
    if (quiz.shuffleOptions) {
      questions.forEach(q => {
        q.options.sort(() => Math.random() - 0.5)
      })
    }

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        courseId: quiz.course,
        lessonId: quiz.lessonId,
        questions,
        timeLimit: quiz.timeLimit,
        maxAttempts: quiz.maxAttempts,
        shuffleOptions: quiz.shuffleOptions,
        showExplanations: quiz.showExplanations,
        attemptsUsed,
      },
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/lms/quizzes/:id/attempt — server-side grading
router.post('/:id/attempt', lmsAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
    if (!quiz || !quiz.isPublished) return res.status(404).json({ message: 'Quiz not found' })

    const attemptsUsed = await QuizAttempt.countDocuments({ student: req.user.id, quiz: quiz._id })
    if (attemptsUsed >= quiz.maxAttempts) {
      return res.status(429).json({ message: 'Maximum attempts reached' })
    }

    const { answers, timeTakenSeconds } = req.body
    let score = 0
    const totalMarks = quiz.questions.reduce((acc, q) => acc + q.marks, 0)

    const resultAnswers = quiz.questions.map((q, i) => {
      const submitted = answers[i]
      let isCorrect = false

      if (q.type === 'mcq' || q.type === 'true_false') {
        const correctOpt = q.options.find(o => o.isCorrect)
        if (submitted?.selectedOptionId && String(correctOpt?._id) === String(submitted.selectedOptionId)) {
          isCorrect = true
          score += q.marks
        }
        return {
          questionIndex: i,
          isCorrect,
          explanation: quiz.showExplanations ? q.explanation : undefined,
          correctOptionId: quiz.showExplanations ? correctOpt?._id : undefined,
        }
      }
      // short_answer: always needs manual grading; mark as pending
      return { questionIndex: i, isCorrect: false, explanation: q.explanation }
    })

    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0
    const isPassed = percentage >= 50

    await QuizAttempt.create({
      student: req.user.id,
      quiz: quiz._id,
      answers: answers.map((a, i) => ({ questionIndex: i, selectedOptionId: a.selectedOptionId, textAnswer: a.textAnswer })),
      score,
      totalMarks,
      isPassed,
      percentage,
      timeTakenSeconds,
    })

    res.json({ result: { score, totalMarks, isPassed, percentage, answers: resultAnswers } })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/quizzes/:id/attempts
router.get('/:id/attempts', lmsAuth, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ student: req.user.id, quiz: req.params.id }).sort({ submittedAt: -1 })
    res.json({ attempts })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
