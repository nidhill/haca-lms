const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_FORMATS = ['pdf', 'docx', 'zip', 'png', 'jpg', 'jpeg']
const MAX_SIZE_MB = 50

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `lms-haca/submissions/${req.user.id}`,
    resource_type: 'raw',
    public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`,
    allowed_formats: ALLOWED_FORMATS,
  }),
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (ALLOWED_FORMATS.includes(ext)) cb(null, true)
    else cb(new Error(`File type .${ext} not allowed`))
  },
})

module.exports = { cloudinary, upload }
