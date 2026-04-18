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

    await capsule.save()

    res.status(200).json({ success: true, data: capsule.toObject() })
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

export const generateMessageAI = async (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Prompt (title) is required',
      })
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      // Fallback to predefined messages if API key is not available
      const fallbackMessages = [
        `A reflection on "${prompt}": Time flows like a river, carrying memories that shape who we become. May this capsule on ${prompt} remind you of the dreams and moments that define this chapter of your life.`,
        `"${prompt}" - In the tapestry of your life, this moment is a thread woven with intention. This capsule preserves this precious strand of your story.`,
        `Looking back at "${prompt}": The future you will look back at this moment with different eyes. Treasure what matters about ${prompt}, release what does not.`,
        `Sealing "${prompt}": Some memories are meant to be revisited. Others are meant to transform. Let this capsule about ${prompt} be whatever you need it to be.`,
        `To the future reader: This message about ${prompt} travels across time to find you. May it bring the wisdom, joy, or peace you seek when you need it most.`,
      ]
      const message = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)]
      return res.status(200).json({
        success: true,
        data: { message },
      })
    }

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a helpful assistant that writes heartfelt and thoughtful messages for memory capsules. Write a warm, poetic, and meaningful short message (2-3 sentences) for a memory capsule with the title: "${prompt}". The message should reflect on the significance of this moment and encourage the reader to cherish these memories. Keep it concise and emotionally resonant.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.9,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate message'

    res.status(200).json({
      success: true,
      data: { message: generatedText },
    })
  } catch (error) {
    console.error('Error generating message:', error)
    // Provide fallback on error
    const fallbackMessages = [
      'Time flows like a river, carrying memories that shape who we become. May this capsule remind you of the dreams you once held dear.',
      'In the tapestry of life, each moment is a thread. This capsule preserves a single, precious strand of your story.',
      'The future you will look back at this moment with different eyes. Treasure what matters, release what does not.',
      'Some memories are meant to be revisited. Others are meant to transform. Let this capsule be whatever you need it to be.',
      'Across the bridge of time, this message travels to find you. May it bring the wisdom or joy you seek.',
    ]
    const message = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)]

    res.status(200).json({
      success: true,
      data: { message },
    })
  }
}
