import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import ghostPostRoutes from "./routes/ghostPosts.js";
import authRoutes from "./routes/authRoutes.js";
import capsuleRoutes from "./routes/capsules.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

connectDb();

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Memory Capsule backend running" });
});

// Ghost Posts Routes
app.use("/api/ghost-posts", ghostPostRoutes);
app.use("/api/capsules", capsuleRoutes);
app.use("/api/upload", uploadRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Memory Capsule backend listening on port ${port}`);
});
