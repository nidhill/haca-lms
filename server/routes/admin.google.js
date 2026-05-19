const express = require('express')
const router = express.Router()
const { google } = require('googleapis')
const { v4: uuidv4 } = require('uuid')
const mongoose = require('mongoose')
const { lmsStaffAuth } = require('../middleware/lmsAuth')

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

async function getStoredTokens() {
  const doc = await mongoose.connection.db
    .collection('lms_config')
    .findOne({ key: 'google_tokens' })
  return doc?.tokens || null
}

async function saveTokens(tokens) {
  await mongoose.connection.db.collection('lms_config').updateOne(
    { key: 'google_tokens' },
    { $set: { key: 'google_tokens', tokens, updatedAt: new Date() } },
    { upsert: true }
  )
}

// GET /api/admin/google/status — check if Google account is connected
router.get('/status', lmsStaffAuth, async (req, res) => {
  const tokens = await getStoredTokens()
  res.json({ connected: !!tokens })
})

// GET /api/admin/google/auth — redirect admin to Google consent screen
// Token passed as query param since this is a browser redirect (not XHR)
router.get('/auth', async (req, res) => {
  const jwt = require('jsonwebtoken')
  const token = req.query.token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role === 'student') return res.status(403).send('Forbidden')
  } catch {
    return res.status(401).send('Unauthorized')
  }
  const oauth2Client = getOAuthClient()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  })
  res.redirect(url)
})

// GET /api/admin/google/callback — Google redirects here after consent
router.get('/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/admin/live-classes?google=error`)
  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    await saveTokens(tokens)
    res.redirect(`${process.env.FRONTEND_URL}/admin/live-classes?google=connected`)
  } catch (err) {
    console.error('Google OAuth error:', err)
    res.redirect(`${process.env.FRONTEND_URL}/admin/live-classes?google=error`)
  }
})

// POST /api/admin/google/create-meet — create a Google Meet and return the link
router.post('/create-meet', lmsStaffAuth, async (req, res) => {
  try {
    const tokens = await getStoredTokens()
    if (!tokens) return res.status(400).json({ message: 'Google account not connected. Please connect first.' })

    const { title, startTime, endTime } = req.body

    const oauth2Client = getOAuthClient()
    oauth2Client.setCredentials(tokens)

    // Auto-refresh token if expired
    oauth2Client.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens }
      await saveTokens(merged)
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: title || 'HACA Live Class',
      start: { dateTime: new Date(startTime).toISOString(), timeZone: 'Asia/Kolkata' },
      end:   { dateTime: new Date(endTime).toISOString(),   timeZone: 'Asia/Kolkata' },
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: event,
    })

    const meetLink = response.data.hangoutLink
    if (!meetLink) return res.status(500).json({ message: 'Failed to generate Meet link' })

    res.json({ meetLink, eventId: response.data.id })
  } catch (err) {
    console.error('Create meet error:', err)
    res.status(500).json({ message: 'Failed to create Meet: ' + err.message })
  }
})

// DELETE /api/admin/google/disconnect
router.delete('/disconnect', lmsStaffAuth, async (req, res) => {
  await mongoose.connection.db.collection('lms_config').deleteOne({ key: 'google_tokens' })
  res.json({ message: 'Disconnected' })
})

module.exports = router
