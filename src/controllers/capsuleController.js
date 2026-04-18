import Capsule from '../models/Capsule.js'
import { v4 as uuidv4 } from 'uuid'

export const getAllCapsules = async (req, res) => {
  try {
    const capsules = await Capsule.find({}).sort({ createdAt: -1 }).lean()
    
    const processedCapsules = await Promise.all(capsules.map(async (capsule) => {
      if (capsule.rule === 'destroy_after_view' && capsule.status === 'unlocked' && capsule.viewCount > 0) {
        capsule.status = 'destroyed';
        capsule.destroyedAt = new Date();
        await Capsule.findOneAndUpdate({ id: capsule.id }, { status: 'destroyed', destroyedAt: capsule.destroyedAt });
      }
      return capsule;
    }))

    res.status(200).json({
      success: true,
      count: processedCapsules.length,
      data: processedCapsules,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching capsules',
      error: error.message,
    })
  }
}

export const getCapsulesByUserId = async (req, res) => {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      })
    }

    const capsules = await Capsule.find({ userId }).sort({ createdAt: -1 }).lean()
    
    const processedCapsules = await Promise.all(capsules.map(async (capsule) => {
      if (capsule.rule === 'destroy_after_view' && capsule.status === 'unlocked' && capsule.viewCount > 0) {
        capsule.status = 'destroyed';
        capsule.destroyedAt = new Date();
        await Capsule.findOneAndUpdate({ id: capsule.id }, { status: 'destroyed', destroyedAt: capsule.destroyedAt });
      }
      return capsule;
    }))

    res.status(200).json({
      success: true,
      count: processedCapsules.length,
      data: processedCapsules,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user capsules',
      error: error.message,
    })
  }
}

export const getCapsuleById = async (req, res) => {
  try {
    const { id } = req.params
    const capsule = await Capsule.findOne({ id }).lean()

    if (!capsule) {
      return res.status(404).json({
        success: false,
        message: 'Capsule not found',
      })
    }

    if (capsule.rule === 'destroy_after_view' && capsule.status === 'unlocked') {
      if (capsule.viewCount > 0) {
        // Already viewed once. Immediately destroy it.
        capsule.status = 'destroyed';
        capsule.destroyedAt = new Date();
        await Capsule.findOneAndUpdate({ id }, { status: 'destroyed', destroyedAt: new Date() });
      } else {
        // It's an old legacy capsule that started unlocked, or it was just unlocked.
        // We'll let the frontend destroy it.
      }
    }

    res.status(200).json({ success: true, data: capsule })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching capsule',
      error: error.message,
    })
  }
}

export const unlockCapsule = async (req, res) => {
  try {
    const { id } = req.params
    const capsule = await Capsule.findOne({ id })

    if (!capsule) {
      return res.status(404).json({
        success: false,
        message: 'Capsule not found',
      })
    }

    const now = new Date()
    if (
      capsule.rule === 'unlock_at_date' &&
      capsule.unlockDate &&
      new Date(capsule.unlockDate) > now
    ) {
      return res.status(400).json({
        success: false,
        message: 'Capsule is still locked',
      })
    }

    if (capsule.status !== 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Capsule is not locked',
      })
    }

    // Prevent re-unlocking destroy_after_view capsules
    if (capsule.rule === 'destroy_after_view' && capsule.viewCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Capsule has already been viewed and destroyed',
      })
    }

    capsule.viewCount += 1
    capsule.status = 'unlocked'

    await capsule.save()

    if (capsule.rule === 'destroy_after_view') {
      // Automatically destroy the capsule shortly after it is unlocked.
      setTimeout(async () => {
        try {
          const freshCapsule = await Capsule.findOne({ id, status: 'unlocked' })
          if (freshCapsule) {
            freshCapsule.status = 'destroyed'
            freshCapsule.destroyedAt = new Date()
            await freshCapsule.save()
          }
        } catch (destroyError) {
          console.error('Failed to auto-destroy capsule:', destroyError)
        }
      }, 5000)
    }

    res.status(200).json({ success: true, data: capsule })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unlocking capsule',
      error: error.message,
    })
  }
}

export const deleteCapsule = async (req, res) => {
  try {
    const { id } = req.params
    const capsule = await Capsule.findOneAndDelete({ id })

    if (!capsule) {
      return res.status(404).json({
        success: false,
        message: 'Capsule not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Capsule deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting capsule',
      error: error.message,
    })
  }
}

export const markCapsuleDestroyed = async (req, res) => {
  try {
    const { id } = req.params
    const capsule = await Capsule.findOne({ id })

    if (!capsule) {
      return res.status(404).json({
        success: false,
        message: 'Capsule not found',
      })
    }

    if (capsule.rule !== 'destroy_after_view') {
      return res.status(400).json({
        success: false,
        message: 'Only destroy_after_view capsules can be marked destroyed',
      })
    }

    capsule.status = 'destroyed'
    capsule.destroyedAt = new Date()
    await capsule.save()

    res.status(200).json({ success: true, data: capsule })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking capsule destroyed',
      error: error.message,
    })
  }
}

export const createCapsule = async (req, res) => {
  try {
    const { title, content, rule, unlockDate, expiresAfter, media } = req.body
    const userId = req.userId || req.body.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication is required to create capsules',
      })
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Capsule title is required',
      })
    }

    const normalizedRule = rule || 'unlock_at_date'
    const now = new Date()
    const parsedUnlockDate = unlockDate ? new Date(unlockDate) : null
    const status =
      normalizedRule === 'unlock_at_date' && parsedUnlockDate && parsedUnlockDate > now
        ? 'locked'
        : 'unlocked'

    const capsule = await Capsule.create({
      id: `capsule_${uuidv4()}`,
      userId,
      title: title.trim(),
      content: content || '',
      rule: normalizedRule,
      unlockDate: parsedUnlockDate,
      expiresAfter: expiresAfter || null,
      media: Array.isArray(media) ? media : [],
      status,
      viewCount: 0,
      isExpired: false,
    })

    res.status(201).json({
      success: true,
      data: capsule,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating capsule',
      error: error.message,
    })
  }
}
