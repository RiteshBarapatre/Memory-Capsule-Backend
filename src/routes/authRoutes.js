import express from "express";
import {
  register,
  login,
  googleAuth,
  getMe,
  updateProfile,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, updateProfile);

export default router;
