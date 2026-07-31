import { Schema, model } from "mongoose";

const pointSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  { _id: false }
);

const strokeSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    roomCode: { type: String, required: true, index: true },
    pageId: { type: String, required: true, default: "page-1", index: true },
    userId: { type: String, required: true },
    tool: { type: String, enum: ["pencil", "eraser", "line", "rectangle", "circle", "text", "image"], required: true },
    color: { type: String, required: true },
    size: { type: Number, required: true, min: 1, max: 80 },
    points: { type: [pointSchema], required: true, default: [] },
    text: { type: String, trim: true, maxlength: 120 },
    imageSrc: { type: String }
  },
  { timestamps: true }
);

export const StrokeModel = model("Stroke", strokeSchema);
