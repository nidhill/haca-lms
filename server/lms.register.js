/**
 * LMS Route Registration
 *
 * Add this file to your existing SHO App server.js:
 *
 *   const registerLmsRoutes = require('./lms.register')
 *   registerLmsRoutes(app)
 *
 * Place the call AFTER your existing routes but BEFORE the 404 handler.
 */

function registerLmsRoutes(app) {
  // Pre-register models that routes populate but may not require themselves
  require('./models/Batch')
  require('./models/Course')
  require('./models/StudentProgress')
  require('./models/Attendance')
  require('./models/Assignment')
  require('./models/AssignmentSubmission')
  require('./models/LiveClass')
  require('./models/Certificate')
  require('./models/Quiz')
  require('./models/QuizAttempt')
  require('./models/Discussion')
  require('./models/Announcement')
  app.use('/api/lms/auth', require('./routes/lms.auth'))
  app.use('/api/lms/dashboard', require('./routes/lms.dashboard'))
  app.use('/api/lms/courses', require('./routes/lms.courses'))
  // Lesson route — nested under courses but also accessible directly
  app.use('/api/lms/lessons', require('./routes/lms.courses'))
  app.use('/api/lms/progress', require('./routes/lms.progress'))
  app.use('/api/lms/quizzes', require('./routes/lms.quiz'))
  app.use('/api/lms/assignments', require('./routes/lms.assignments'))
  app.use('/api/lms/attendance', require('./routes/lms.attendance'))
  app.use('/api/lms/exams', require('./routes/lms.exams'))
  app.use('/api/lms/certificates', require('./routes/lms.certificates'))
  app.use('/api/lms/announcements', require('./routes/lms.announcements'))
  app.use('/api/lms/discussions', require('./routes/lms.discussions'))
  app.use('/api/lms/live-classes', require('./routes/lms.liveclasses'))
  app.use('/api/lms/leaderboard', require('./routes/lms.leaderboard'))
  app.use('/api/lms/analytics', require('./routes/lms.analytics'))

  // Unified auth
  app.use('/api/auth', require('./routes/unified.auth'))

  // Admin routes
  app.use('/api/admin/auth',          require('./routes/admin.auth'))
  app.use('/api/admin/dashboard',     require('./routes/admin.dashboard'))
  app.use('/api/admin/sessions',      require('./routes/admin.sessions'))
  app.use('/api/admin/students',      require('./routes/admin.students'))
  app.use('/api/admin/announcements', require('./routes/admin.announcements'))
  app.use('/api/admin/live-classes',  require('./routes/admin.liveclasses'))
  app.use('/api/admin/google',        require('./routes/admin.google'))

  console.log('✅ LMS routes registered at /api/lms/*')
  console.log('✅ Admin routes registered at /api/admin/*')
}

module.exports = registerLmsRoutes
