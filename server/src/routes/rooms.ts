import { Router } from "express";
import { isMongoReady } from "../config/db.js";
import { RoomModel } from "../models/Room.js";
import { StrokeModel } from "../models/Stroke.js";
import { defaultPermissions } from "../state/memoryStore.js";
import { getRoom } from "../state/memoryStore.js";

export const roomsRouter = Router();

roomsRouter.get("/:code", async (req, res) => {
  const code = req.params.code.trim().toUpperCase();

  if (!code) {
    res.status(400).json({ message: "Room code is required" });
    return;
  }

  if (isMongoReady()) {
    const room = await RoomModel.findOne({ code }).lean();
    const strokes = await StrokeModel.find({ roomCode: code }).sort({ createdAt: 1 }).lean();
    res.json({ room, strokes });
    return;
  }

  const room = getRoom(code);
  res.json({
    room: room
      ? {
          ...room,
          permissions: { ...defaultPermissions, ...room.permissions }
        }
      : null,
    strokes: room?.strokes ?? []
  });
});
