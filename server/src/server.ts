import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import dns from "node:dns";
import http from "node:http";
import { Server } from "socket.io";
import { connectMongo } from "./config/db.js";
import { boardsRouter } from "./routes/boards.js";
import { exportsRouter } from "./routes/exports.js";
import { messagesRouter } from "./routes/messages.js";
import { roomsRouter } from "./routes/rooms.js";
import { registerDrawingSocket } from "./socket/drawingSocket.js";

// The default DNS resolver on this machine times out on SRV lookups
// (needed for mongodb+srv:// connection strings), so use a public resolver instead.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sketchspace-server" });
});

app.use("/api/rooms", roomsRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/export", exportsRouter);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 5e6
});

registerDrawingSocket(io);

await connectMongo();

server.listen(port, () => {
  console.log(`SketchSpace server listening on http://localhost:${port}`);
});
