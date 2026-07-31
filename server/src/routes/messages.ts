import { Router } from "express";
import { isMongoReady } from "../config/db.js";
import { MessageModel } from "../models/Message.js";

export const messagesRouter = Router();

messagesRouter.get("/:roomCode", async (req, res) => {
  if (!isMongoReady()) {
    res.json([]);
    return;
  }

  const roomCode = req.params.roomCode.trim().toUpperCase();
  const messages = await MessageModel.find({ roomCode }).sort({ createdAt: 1 }).limit(100).lean();
  res.json(messages);
});

messagesRouter.post("/:roomCode", async (req, res) => {
  if (!isMongoReady()) {
    res.status(202).json({ ok: true, persisted: false });
    return;
  }

  const roomCode = req.params.roomCode.trim().toUpperCase();
  const message = await MessageModel.create({ ...req.body, roomCode });
  res.status(201).json(message);
});

messagesRouter.patch("/:messageId/pin", async (req, res) => {
  if (!isMongoReady()) {
    res.status(202).json({ ok: true, persisted: false });
    return;
  }

  const message = await MessageModel.findByIdAndUpdate(
    req.params.messageId,
    { pinned: Boolean(req.body.pinned) },
    { new: true }
  );
  res.json(message);
});

messagesRouter.delete("/:messageId", async (req, res) => {
  if (isMongoReady()) {
    await MessageModel.findByIdAndDelete(req.params.messageId);
  }

  res.status(204).end();
});
