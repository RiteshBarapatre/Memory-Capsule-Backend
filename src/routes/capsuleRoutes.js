// import express from "express";
// import { getUserCapsules } from "../controllers/capsuleController.js";
// import { createCapsule } from "../controllers/capsuleController.js";

// const router = express.Router();
// router.get("/my", getUserCapsules);
// router.post("/create", createCapsule);

// export default router;

import express from "express";
import {
  createCapsule,
  getUserCapsules,
  getSingleCapsule,
} from "../controllers/capsuleController.js";

const router = express.Router();

router.post("/create", createCapsule);
router.get("/my", getUserCapsules);
router.get("/:id", getSingleCapsule);

export default router;
