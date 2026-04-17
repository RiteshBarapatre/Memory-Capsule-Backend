import Capsule from "../models/Capsule.js";
import mongoose from "mongoose";

// ✅ CREATE CAPSULE
export const createCapsule = async (req, res) => {
  try {
    const { title, content, rule, unlockDate, expiresAfter, media } = req.body;

    // const userId = req.user?.id || "dummyUserId";

    const userId = new mongoose.Types.ObjectId();

    let status = "locked";

    // rule-based status
    if (rule === "one_time_view") {
      status = "unlocked";
    }

    // ✅ FIX: Ensure media is valid array
    let formattedMedia = [];
    if (Array.isArray(media)) {
      formattedMedia = media.map((m) => ({
        type: m.type || "image",
        url: m.url || "",
      }));
    }

    const capsule = await Capsule.create({
      userId,
      title,
      content,
      rule,
      unlockDate: rule === "unlock_at_date" ? unlockDate : null,
      expiresAfter: rule === "auto_expire" ? expiresAfter : null,
      media: formattedMedia,
      status,
    });

    res.status(201).json({
      message: "Capsule created successfully",
      capsule,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET ALL CAPSULES (WITH LIFECYCLE LOGIC)
export const getUserCapsules = async (req, res) => {
  try {
    const userId = req.user?.id || "69e2a71df4feea02fb5e4620";

    let capsules = await Capsule.find({ userId }).sort({ createdAt: -1 });

    const now = new Date();

    // 🔥 Apply lifecycle logic
    for (let c of capsules) {
      // ⏰ Unlock logic
      if (
        c.rule === "unlock_at_date" &&
        c.unlockDate &&
        c.unlockDate <= now &&
        c.status === "locked"
      ) {
        c.status = "unlocked";
        c.unlockedAt = now;
        await c.save();
      }

      // ⌛ Expiry logic
      if (c.rule === "auto_expire" && c.expiresAfter && c.createdAt) {
        const expiryTime = new Date(
          c.createdAt.getTime() + c.expiresAfter * 60 * 60 * 1000,
        );

        if (now > expiryTime && c.status !== "expired") {
          c.status = "expired";
          await c.save();
        }
      }
    }

    // Format response
    const formatted = capsules.map((c) => ({
      id: c._id,
      title: c.title,
      content: c.content,
      status: c.status,
      rule: c.rule,
      unlockDate: c.unlockDate,
      unlockedAt: c.unlockedAt,
      createdAt: c.createdAt,
      userId: c.userId,
      media: c.media,
      //   viewCount: c.viewCount,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET SINGLE CAPSULE (VIEW + ONE-TIME LOGIC)
export const getSingleCapsule = async (req, res) => {
  try {
    const { id } = req.params;

    const capsule = await Capsule.findById(id);

    if (!capsule) {
      return res.status(404).json({ message: "Capsule not found" });
    }

    const now = new Date();

    // ⏰ Unlock check (extra safety)
    if (
      capsule.rule === "unlock_at_date" &&
      capsule.unlockDate &&
      capsule.unlockDate <= now &&
      capsule.status === "locked"
    ) {
      capsule.status = "unlocked";
      capsule.unlockedAt = now;
    }

    // ⌛ Expiry check
    if (capsule.rule === "auto_expire" && capsule.expiresAfter) {
      const expiryTime = new Date(
        capsule.createdAt.getTime() + capsule.expiresAfter * 60 * 60 * 1000,
      );

      if (now > expiryTime) {
        capsule.status = "expired";
      }
    }

    // ❌ Block access if not allowed
    if (capsule.status === "locked") {
      return res.status(403).json({ message: "Capsule is still locked" });
    }

    if (capsule.status === "expired") {
      return res.status(410).json({ message: "Capsule expired" });
    }

    if (capsule.status === "destroyed") {
      return res.status(410).json({ message: "Capsule already destroyed" });
    }

    // 👁️ Increase view count
    capsule.viewCount += 1;

    // 💥 One-time view logic
    if (capsule.rule === "one_time_view") {
      capsule.status = "destroyed";
    }

    await capsule.save();

    res.json({
      id: capsule._id,
      title: capsule.title,
      content: capsule.content,
      status: capsule.status,
      rule: capsule.rule,
      unlockDate: capsule.unlockDate,
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      userId: capsule.userId,
      media: capsule.media,
      viewCount: capsule.viewCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
