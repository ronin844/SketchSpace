import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    roomCode: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true, trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: ["chat", "announcement", "system"], default: "chat" },
    pinned: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const MessageModel = model("Message", messageSchema);
