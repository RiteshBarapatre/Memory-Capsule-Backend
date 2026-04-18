import express from 'express'
import multer from 'multer'
import { uploadMedia } from '../controllers/uploadController.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/', upload.single('file'), uploadMedia)

export default router
