import express from "express";
import {
    getHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
    reorderHabits,
} from "../controllers/habitController.js";
import { protect } from "../middleware/auth.js";
const router = express.Router();

router.use(protect);

router.get("/", getHabits);

router.post("/", createHabit);

router.put("/reorder", reorderHabits);

router.put("/:id", updateHabit);

router.put("/:id/archive", archiveHabit);

router.delete("/:id", deleteHabit);
export default router;