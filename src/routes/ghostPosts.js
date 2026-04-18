import express from "express";
import {
    getAllGhostPosts,
    createGhostPost,
    deleteGhostPost,
    cleanupExpiredPosts,
} from "../controllers/ghostPostController.js";

const router = express.Router();

// Get all active ghost posts
router.get("/", getAllGhostPosts);

// Create a new ghost post
router.post("/", createGhostPost);

// Delete (mark as expired) a ghost post
router.delete("/:id", deleteGhostPost);

// Cleanup expired posts
router.post("/cleanup/run", cleanupExpiredPosts);

export default router;
