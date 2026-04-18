import express from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import {
  createCapsule,
  getAllCapsules,
  getCapsuleById,
  getCapsulesByUserId,
  unlockCapsule,
  deleteCapsule,
  generateMessageAI,
} from '../controllers/capsuleController.js'

const router = express.Router()

router.get('/', getAllCapsules)
router.post('/generate-message', generateMessageAI)
router.get('/user/:userId', getCapsulesByUserId)
router.get('/:id', getCapsuleById)
router.post('/', requireAuth, createCapsule)
router.patch('/:id/unlock', requireAuth, unlockCapsule)
router.delete('/:id', requireAuth, deleteCapsule)

export default router
