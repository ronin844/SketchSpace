import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, required: true, default: "#2563eb" }
  },
  { timestamps: true }
);

export const UserModel = model("User", userSchema);
