import mongoose from "mongoose";

const capsuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: String,
    content: String,

    rule: {
      type: String,
      enum: ["unlock_at_date", "auto_expire", "one_time_view"],
    },

    status: {
      type: String,
      enum: ["locked", "unlocked", "expired", "destroyed"],
      default: "locked",
    },

    unlockDate: Date,

    unlockedAt: {
      type: Date,
      default: null,
    },

    expiresAfter: Number,

    media: [
      {
        type: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Capsule", capsuleSchema);
