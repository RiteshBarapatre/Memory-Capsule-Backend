import mongoose from "mongoose";

const ghostPostSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            unique: true,
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        fadeLevel: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
            default: 0,
        },
        userId: {
            type: String,
            required: false,
        },
        isExpired: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying of active posts
ghostPostSchema.index({ expiresAt: 1, isExpired: 1 });

// Middleware to auto-update isExpired status before queries
ghostPostSchema.pre(/^find/, function () {
    this.where({ isExpired: false });
});

const GhostPost = mongoose.model("GhostPost", ghostPostSchema);

export default GhostPost;
