import jwt from "jsonwebtoken";
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Google authentication failed",
      error: error.message,
    });
  }
};
