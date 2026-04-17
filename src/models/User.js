import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      enum: ["google", "local"],
      default: "google",
    },
    providerId: {
      type: String,
      default: "",
    },
    /** Bcrypt hash for email/password (local) sign-in; omitted for Google-only users */
    passwordHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
