const express = require('express')
const router = express.Router()
const { lmsAuth } = require('../middleware/lmsAuth')
const StudentProgress = require('../models/StudentProgress')
const Course = require('../models/Course')
const Certificate = require('../models/Certificate')
const { v4: uuidv4 } = require('uuid')

// POST /api/lms/progress/mark-complete
router.post('/mark-complete', lmsAuth, async (req, res) => {
  try {
    const { lessonId, courseId } = req.body
    if (!lessonId || !courseId) return res.status(400).json({ message: 'lessonId and courseId required' })

    const existing = await StudentProgress.findOne({ student: req.user.id, lessonId })
    if (existing?.isComplete) return res.json({ message: 'Already complete', alreadyComplete: true })

    await StudentProgress.findOneAndUpdate(
      { student: req.user.id, course: courseId, lessonId },
      { student: req.user.id, course: courseId, lessonId, isComplete: true, completedAt: new Date() },
      { upsert: true, new: true }
    )

    // Check if entire course is complete → trigger certificate
    const course = await Course.findById(courseId)
    if (course) {
      const totalLessons = course.totalLessons
      const completedCount = await StudentProgress.countDocuments({
        student: req.user.id, course: courseId, isComplete: true,
      })
      if (completedCount >= totalLessons) {
        // Non-blocking certificate generation
        generateCertificate(req.user.id, courseId, course.title).catch(console.error)
      }
    }

    res.json({ message: 'Lesson marked as complete' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/lms/progress/heartbeat
router.patch('/heartbeat', lmsAuth, async (req, res) => {
  try {
    const { lessonId, position } = req.body
    if (!lessonId) return res.status(400).json({ message: 'lessonId required' })

    await StudentProgress.findOneAndUpdate(
      { student: req.user.id, lessonId },
      { $set: { lastPosition: position } },
      { upsert: true }
    )
    res.json({ ok: true })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/lms/progress/:courseId
router.get('/:courseId', lmsAuth, async (req, res) => {
  try {
    const docs = await StudentProgress.find({ student: req.user.id, course: req.params.courseId })
    res.json({ progress: docs })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

async function generateCertificate(studentId, courseId, courseTitle) {
  const existing = await Certificate.findOne({ student: studentId, course: courseId })
  if (existing) return

  const User = require('../models/User')
  const student = await User.findById(studentId)
  if (!student) return

  const certId = uuidv4()

  // PDF generation (pdfkit) — upload to R2 in prod
  let pdfUrl = ''
  try {
    const PDFDocument = require('pdfkit')
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
    const { Readable } = require('stream')

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    await new Promise((resolve) => doc.on('end', resolve))

    doc
      .fontSize(40).font('Helvetica-Bold').text('Certificate of Completion', { align: 'center' })
      .moveDown()
      .fontSize(20).font('Helvetica').text('This is to certify that', { align: 'center' })
      .moveDown(0.5)
      .fontSize(32).font('Helvetica-Bold').text(student.name, { align: 'center' })
      .moveDown(0.5)
      .fontSize(20).font('Helvetica').text(`has successfully completed`, { align: 'center' })
      .moveDown(0.5)
      .fontSize(26).font('Helvetica-Bold').text(courseTitle, { align: 'center' })
      .moveDown()
      .fontSize(14).font('Helvetica').text(`Certificate ID: ${certId}`, { align: 'center' })
      .text(`Issued on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' })
      .text('HACA — Happily A Career Academy', { align: 'center' })
    doc.end()

    const pdfBuffer = Buffer.concat(chunks)
    if (process.env.R2_BUCKET_NAME) {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
      })
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `certificates/${certId}.pdf`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }))
      pdfUrl = `${process.env.R2_PUBLIC_URL}/certificates/${certId}.pdf`
    }
  } catch (err) {
    console.error('Certificate PDF generation error:', err)
  }

  await Certificate.create({
    student: studentId,
    course: courseId,
    certificateId: certId,
    pdfUrl,
    issuedAt: new Date(),
  })

  // Email
  try {
    const { sendCertificateEmail } = require('../services/email')
    await sendCertificateEmail(student.email, student.name, courseTitle, pdfUrl)
  } catch {}
}

module.exports = router
