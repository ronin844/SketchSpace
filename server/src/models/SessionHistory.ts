import { Schema, model } from "mongoose";

const sessionHistorySchema = new Schema(
  {
    roomCode: { type: String, required: true, index: true },
    boardSnapshot: { type: Schema.Types.Mixed, required: true },
    participants: { type: [Schema.Types.Mixed], default: [] },
    duration: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const SessionHistoryModel = model("SessionHistory", sessionHistorySchema);
