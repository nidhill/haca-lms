const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

// Cache force-logout timestamp for 10 seconds to balance performance and multi-process propagation
let _forceLogoutAt = null;
let _lastCacheTime = 0;
const CACHE_TTL = 10000; // 10 seconds

async function getForceLogoutAt() {
  const now = Date.now();
  if (now - _lastCacheTime < CACHE_TTL) return _forceLogoutAt;
  try {
    const db = mongoose.connection.db;
    if (db) {
      const doc = await db.collection('app_settings').findOne({ key: 'forceLogoutAt' });
      _forceLogoutAt = doc?.value ? new Date(doc.value) : null;
      _lastCacheTime = now;
    }
  } catch (err) {
    console.error('Error fetching forceLogoutAt:', err.message);
  }
  return _forceLogoutAt;
}

async function lmsAuth(req, res, next) {
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

    // Check if token was issued before global force logout
    const forceLogoutAt = await getForceLogoutAt();
    if (forceLogoutAt && decoded.iat && decoded.iat < Math.floor(forceLogoutAt.getTime() / 1000)) {
      return res.status(401).json({ message: 'Session expired. Please log in again.', forceLogout: true });
    }

    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Any non-student staff role
async function lmsStaffAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role === 'student') {
      return res.status(403).json({ message: 'Staff access only' })
    }

    // Check if token was issued before global force logout
    const forceLogoutAt = await getForceLogoutAt();
    if (forceLogoutAt && decoded.iat && decoded.iat < Math.floor(forceLogoutAt.getTime() / 1000)) {
      return res.status(401).json({ message: 'Session expired. Please log in again.', forceLogout: true });
    }

    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Sessions write access — SHO cannot manage curriculum/sessions
const SESSION_WRITE_ROLES = ['admin', 'ceo_haca', 'leadership', 'academic', 'ssho', 'pl', 'mentor']
async function lmsSessionsWriteAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!SESSION_WRITE_ROLES.includes(decoded.role)) {
      return res.status(403).json({ message: 'You do not have permission to manage sessions' })
    }

    // Check if token was issued before global force logout
    const forceLogoutAt = await getForceLogoutAt();
    if (forceLogoutAt && decoded.iat && decoded.iat < Math.floor(forceLogoutAt.getTime() / 1000)) {
      return res.status(401).json({ message: 'Session expired. Please log in again.', forceLogout: true });
    }

    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = { lmsAuth, lmsStaffAuth, lmsSessionsWriteAuth }
