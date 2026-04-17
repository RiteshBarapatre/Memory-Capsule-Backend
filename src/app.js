import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDb from "./config/db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDb();

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Memory Capsule backend running" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Memory Capsule backend listening on port ${port}`);
});
