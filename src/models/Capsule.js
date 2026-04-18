import mongoose from 'mongoose'

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video'],
      required: true,
    },
    url: {
      type: String,
      required: function () {
        return this.type !== 'text'
      },
    },
    title: String,
    duration: Number,
    publicId: String,
  },
  { _id: false }
)

const CapsuleSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    rule: {
      type: String,
      enum: ['unlock_at_date', 'auto_expire', 'destroy_after_view'],
      default: 'unlock_at_date',
    },
    unlockDate: {
      type: Date,
      default: null,
    },
    expiresAfter: {
      type: Number,
      default: null,
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'expired', 'destroyed'],
      default: 'locked',
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('Capsule', CapsuleSchema)
