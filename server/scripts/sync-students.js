/**
 * One-time script: create LMS user accounts for all SHO App students
 * Default password: Haca@1234
 *
 * Run: node scripts/sync-students.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const DEFAULT_PASSWORD = 'Haca@1234'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ MongoDB connected')

  const db = mongoose.connection.db
  const studentsCol = db.collection('students')
  const usersCol = db.collection('users')

  const allStudents = await studentsCol.find({}).toArray()
  console.log(`Found ${allStudents.length} students in SHO App`)

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  let created = 0
  let skipped = 0

  for (const student of allStudents) {
    if (!student.email) { skipped++; continue }

    const existing = await usersCol.findOne({ email: student.email.toLowerCase() })
    if (existing) { skipped++; continue }

    await usersCol.insertOne({
      name: student.name || '',
      email: student.email.toLowerCase(),
      password: hashedPassword,
      role: 'student',
      phone: student.phone || student.mobile || '',
      batch: student.batch || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    created++
    console.log(`  ✅ Created: ${student.email}`)
  }

  console.log(`\nDone. Created: ${created} | Skipped (already exist or no email): ${skipped}`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
