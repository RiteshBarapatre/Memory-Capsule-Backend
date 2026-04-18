import GhostPost from "../models/GhostPost.js";
import { v4 as uuidv4 } from "uuid";

// Get all active ghost posts
export const getAllGhostPosts = async (req, res) => {
    try {
        const posts = await GhostPost.find({ isExpired: false })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate current fadeLevel based on elapsed time
        const postsWithCurrentFade = posts.map((post) => {
            const now = new Date();
            const createdTime = new Date(post.createdAt).getTime();
            const expiresTime = new Date(post.expiresAt).getTime();
            const totalDuration = expiresTime - createdTime;
            const elapsedTime = now.getTime() - createdTime;
            const progress = Math.min(elapsedTime / totalDuration, 1);

            return {
                ...post,
                currentFadeLevel: Math.round(progress * 100) / 100,
                timeRemaining: Math.max(expiresTime - now.getTime(), 0),
            };
        });

        res.status(200).json({
            success: true,
            count: postsWithCurrentFade.length,
            data: postsWithCurrentFade,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching ghost posts",
            error: error.message,
        });
    }
};

// Create a new ghost post
export const createGhostPost = async (req, res) => {
    try {
        const { content, createdAt, expiresAt, fadeLevel, userId } = req.body;

        // Validate required fields
        if (!content || !expiresAt) {
            return res.status(400).json({
                success: false,
                message: "Content and expiresAt are required",
            });
        }

        // Validate that expiresAt is in the future
        const expiresTime = new Date(expiresAt);
        if (expiresTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "expiresAt must be in the future",
            });
        }

        const ghostPost = new GhostPost({
            id: `ghost_${uuidv4()}`,
            content,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            expiresAt: expiresTime,
            fadeLevel: fadeLevel || 0,
            userId: userId || null,
            isExpired: false,
        });

        await ghostPost.save();

        res.status(201).json({
            success: true,
            message: "Ghost post created successfully",
            data: ghostPost,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating ghost post",
            error: error.message,
        });
    }
};

// Delete (mark as expired) a ghost post
export const deleteGhostPost = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await GhostPost.findOneAndUpdate(
            { id, isExpired: false },
            { isExpired: true },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Ghost post not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Ghost post deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting ghost post",
            error: error.message,
        });
    }
};

// Cleanup expired posts (scheduled task)
export const cleanupExpiredPosts = async (req, res) => {
    try {
        const now = new Date();

        const result = await GhostPost.updateMany(
            { expiresAt: { $lt: now }, isExpired: false },
            { isExpired: true }
        );

        res.status(200).json({
            success: true,
            message: "Cleanup completed",
            updatedCount: result.modifiedCount,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error during cleanup",
            error: error.message,
        });
    }
};
