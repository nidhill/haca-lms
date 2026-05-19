const jwt = require('jsonwebtoken')

function lmsAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' })
  }
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'student') {
      return res.status(403).json({ message: 'Student access only' })
    }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Any non-student staff role
function lmsStaffAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role === 'student') {
      return res.status(403).json({ message: 'Staff access only' })
    }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Sessions write access — SHO cannot manage curriculum/sessions
const SESSION_WRITE_ROLES = ['admin', 'ceo_haca', 'leadership', 'academic', 'ssho', 'pl', 'mentor']
function lmsSessionsWriteAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!SESSION_WRITE_ROLES.includes(decoded.role)) {
      return res.status(403).json({ message: 'You do not have permission to manage sessions' })
    }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = { lmsAuth, lmsStaffAuth, lmsSessionsWriteAuth }
