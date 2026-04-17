import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  createdAt: user.createdAt,
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      authProvider: "local",
      providerId: "",
      passwordHash,
    });

    const token = signToken(user._id.toString());
    return res.status(201).json({ user: toPublicUser(user), token });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("register error:", error);
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id.toString());
    return res.status(200).json({ user: toPublicUser(user), token });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Failed to load user" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name != null && String(name).trim()) {
      user.name = String(name).trim();
    }

    if (email != null && String(email).trim()) {
      const nextEmail = String(email).trim().toLowerCase();
      if (nextEmail !== user.email) {
        const taken = await User.findOne({
          email: nextEmail,
          _id: { $ne: user._id },
        });
        if (taken) {
          return res.status(409).json({ message: "Email already in use" });
        }
        user.email = nextEmail;
      }
    }

    await user.save();
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Update failed" });
  }
};

export const googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ message: "Unable to fetch Google profile details" });
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        avatar: payload.picture || "",
        authProvider: "google",
        providerId: payload.sub || "",
      });
    } else {
      user.name = payload.name || user.name;
      user.avatar = payload.picture || user.avatar;
      user.authProvider = "google";
      user.providerId = payload.sub || user.providerId;
      await user.save();
    }

    const token = signToken(user._id.toString());

    return res.status(200).json({
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Google authentication failed",
      error: error.message,
    });
  }
};
