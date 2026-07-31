import { Schema, model } from "mongoose";

const participantSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    role: { type: String, enum: ["host", "editor", "viewer"], default: "viewer" },
    online: { type: Boolean, default: true },
    handRaised: { type: Boolean, default: false }
  },
  { _id: false }
);

const pageSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    boardTemplate: { type: String, enum: ["plain", "grid", "ruled", "axes"], default: "plain" }
  },
  { _id: false }
);

const roomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    roomTitle: { type: String, trim: true, maxlength: 64, default: "Untitled Board" },
    permissions: {
      studentsCanDraw: { type: Boolean, default: false },
      chatMuted: { type: Boolean, default: false },
      raiseHandEnabled: { type: Boolean, default: true },
      waitingRoomEnabled: { type: Boolean, default: false },
      roomLocked: { type: Boolean, default: false },
      followTeacherView: { type: Boolean, default: false },
      showStudentCursors: { type: Boolean, default: true }
    },
    participants: { type: [participantSchema], default: [] },
    boardTemplate: { type: String, enum: ["plain", "grid", "ruled", "axes"], default: "plain" },
    pages: {
      type: [pageSchema],
      default: () => [{ id: "page-1", title: "Page 1", boardTemplate: "plain" }]
    },
    activePageId: { type: String, default: "page-1" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const RoomModel = model("Room", roomSchema);
