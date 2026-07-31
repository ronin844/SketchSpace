import { Schema, model } from "mongoose";

const boardObjectSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    pageId: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const boardPageSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    backgroundType: { type: String, enum: ["plain", "grid", "ruled", "axes", "dotted", "dark"], default: "plain" }
  },
  { _id: false }
);

const boardSchema = new Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true },
    title: { type: String, trim: true, maxlength: 80, default: "Untitled Board" },
    pages: { type: [boardPageSchema], default: [] },
    objects: { type: [boardObjectSchema], default: [] },
    version: { type: Number, default: 1 },
    lastSavedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const BoardModel = model("Board", boardSchema);
