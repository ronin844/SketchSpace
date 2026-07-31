import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("MONGO_URI not set. Running without persistence.");
    return false;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed. Continuing without persistence.", error);
    return false;
  }
}

export function isMongoReady() {
  return mongoose.connection.readyState === 1;
}
