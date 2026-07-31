import { Router } from "express";
import { isMongoReady } from "../config/db.js";
import { BoardModel } from "../models/Board.js";
import { StrokeModel } from "../models/Stroke.js";
import { SessionHistoryModel } from "../models/SessionHistory.js";
import { getRoom } from "../state/memoryStore.js";

export const boardsRouter = Router();

boardsRouter.get("/recent", async (_req, res) => {
  if (!isMongoReady()) {
    res.json([]);
    return;
  }

  const boards = await BoardModel.find().sort({ updatedAt: -1 }).limit(12).lean();
  res.json(boards);
});

boardsRouter.get("/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode.trim().toUpperCase();

  if (isMongoReady()) {
    const board = await BoardModel.findOne({ roomCode }).lean();
    const strokes = await StrokeModel.find({ roomCode }).sort({ createdAt: 1 }).lean();
    res.json({ board, strokes });
    return;
  }

  const room = getRoom(roomCode);
  res.json({ board: room ?? null, strokes: room?.strokes ?? [] });
});

boardsRouter.post("/:roomCode/save", async (req, res) => {
  const roomCode = req.params.roomCode.trim().toUpperCase();

  if (!isMongoReady()) {
    res.json({ ok: true, saved: false, message: "MongoDB is not connected; board is stored in memory." });
    return;
  }

  const board = await BoardModel.findOneAndUpdate(
    { roomCode },
    { ...req.body, roomCode, lastSavedAt: new Date(), $inc: { version: 1 } },
    { new: true, upsert: true }
  );

  res.json({ ok: true, board });
});

boardsRouter.get("/:roomCode/history", async (req, res) => {
  if (!isMongoReady()) {
    res.json([]);
    return;
  }

  const roomCode = req.params.roomCode.trim().toUpperCase();
  const history = await SessionHistoryModel.find({ roomCode }).sort({ createdAt: -1 }).limit(20).lean();
  res.json(history);
});
