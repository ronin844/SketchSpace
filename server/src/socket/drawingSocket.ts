import type { Server, Socket } from "socket.io";
import { isMongoReady } from "../config/db.js";
import { RoomModel } from "../models/Room.js";
import { StrokeModel } from "../models/Stroke.js";
import {
  addPage,
  addStroke,
  defaultPermissions,
  getOrCreateRoom,
  removeParticipant,
  replaceStrokes,
  setActivePage,
  setBoardTemplate,
  updateRoomSettings,
  upsertParticipant
} from "../state/memoryStore.js";
import type {
  BoardPage,
  BoardTemplate,
  ChatMessagePayload,
  JoinRoomPayload,
  Participant,
  RoomPermissions,
  StrokePayload
} from "../types.js";

const MAX_ROOM_SIZE = 4;
const MAX_PAGES = 24;
const DEFAULT_PAGE_ID = "page-1";
const ROOM_CODE_PATTERN = /^[A-Z0-9-]{3,16}$/;
const BOARD_TEMPLATES = new Set<BoardTemplate>(["plain", "grid", "ruled", "axes"]);

function defaultPages(boardTemplate: BoardTemplate = "plain"): BoardPage[] {
  return [{ id: DEFAULT_PAGE_ID, title: "Page 1", boardTemplate }];
}

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}

function isValidParticipant(user: Participant) {
  return Boolean(user?.id && user?.name && user.name.length <= 40 && user?.color);
}

async function loadStrokes(roomCode: string) {
  if (!isMongoReady()) {
    return getOrCreateRoom(roomCode).strokes;
  }

  const strokes = await StrokeModel.find({ roomCode }).sort({ createdAt: 1 }).lean();
  return strokes.map((stroke) => ({
    id: stroke.id,
    roomCode: stroke.roomCode,
    pageId: stroke.pageId ?? DEFAULT_PAGE_ID,
    userId: stroke.userId,
    tool: stroke.tool,
    color: stroke.color,
    size: stroke.size,
    points: stroke.points,
    text: stroke.text,
    imageSrc: stroke.imageSrc,
    createdAt: stroke.createdAt?.toISOString()
  }));
}

async function getParticipants(roomCode: string) {
  if (!isMongoReady()) {
    return getOrCreateRoom(roomCode).participants;
  }

  const room = await RoomModel.findOne({ code: roomCode }).lean();
  return (room?.participants ?? []).map((participant) => ({
    id: participant.id,
    name: participant.name,
    color: participant.color,
    role: participant.role,
    online: participant.online ?? true,
    handRaised: participant.handRaised ?? false
  }));
}

async function getRoomMeta(roomCode: string) {
  if (!isMongoReady()) {
    const room = getOrCreateRoom(roomCode);
    return {
      roomTitle: room.roomTitle,
      permissions: room.permissions
    };
  }

  const room = await RoomModel.findOne({ code: roomCode }).lean();
  return {
    roomTitle: room?.roomTitle ?? "Untitled Board",
    permissions: { ...defaultPermissions, ...(room?.permissions ?? {}) }
  };
}

async function getRoomPages(roomCode: string): Promise<BoardPage[]> {
  if (!isMongoReady()) {
    return getOrCreateRoom(roomCode).pages;
  }

  const room = await RoomModel.findOne({ code: roomCode }).lean();
  const pages = room?.pages as BoardPage[] | undefined;

  if (pages?.length) {
    return pages;
  }

  return defaultPages((room?.boardTemplate as BoardTemplate | undefined) ?? "plain");
}

async function getActivePageId(roomCode: string) {
  if (!isMongoReady()) {
    return getOrCreateRoom(roomCode).activePageId;
  }

  const room = await RoomModel.findOne({ code: roomCode }).lean();
  return room?.activePageId ?? DEFAULT_PAGE_ID;
}

async function saveBoardTemplate(roomCode: string, pageId: string, boardTemplate: BoardTemplate) {
  if (!isMongoReady()) {
    setBoardTemplate(roomCode, pageId, boardTemplate);
    return;
  }

  await RoomModel.findOneAndUpdate(
    { code: roomCode, "pages.id": pageId },
    { $set: { "pages.$.boardTemplate": boardTemplate, boardTemplate } }
  );
}

async function savePage(roomCode: string, page: BoardPage) {
  if (!isMongoReady()) {
    return addPage(roomCode, page);
  }

  const room = await RoomModel.findOne({ code: roomCode });
  const existingPages = (room?.pages ?? []) as BoardPage[];
  const pages = existingPages.length ? existingPages : defaultPages();

  if (!pages.some((existingPage) => existingPage.id === page.id) && pages.length < MAX_PAGES) {
    pages.push(page);
  }

  await RoomModel.findOneAndUpdate(
    { code: roomCode },
    {
      $set: { pages, activePageId: page.id },
      $setOnInsert: { code: roomCode, isActive: true }
    },
    { upsert: true }
  );

  return { pages, activePageId: page.id };
}

async function saveActivePage(roomCode: string, pageId: string) {
  if (!isMongoReady()) {
    return setActivePage(roomCode, pageId);
  }

  await RoomModel.findOneAndUpdate({ code: roomCode, "pages.id": pageId }, { $set: { activePageId: pageId } });
}

async function saveParticipant(roomCode: string, user: Participant) {
  if (!isMongoReady()) {
    return upsertParticipant(roomCode, user).participants;
  }

  const existingRoom = await RoomModel.findOne({ code: roomCode }).lean();
  const existingParticipant = existingRoom?.participants?.find((participant) => participant.id === user.id);
  const role = existingParticipant?.role ?? ((existingRoom?.participants?.length ?? 0) === 0 ? "host" : "viewer");
  const participant = { ...user, role, online: true };

  await RoomModel.findOneAndUpdate(
    { code: roomCode },
    {
      $setOnInsert: { code: roomCode, isActive: true },
      $pull: { participants: { id: user.id } }
    },
    { upsert: true }
  );

  const room = await RoomModel.findOneAndUpdate(
    { code: roomCode },
    { $push: { participants: participant } },
    { new: true }
  ).lean();

  return (room?.participants ?? []).map((participant) => ({
    id: participant.id,
    name: participant.name,
    color: participant.color,
    role: participant.role,
    online: participant.online ?? true,
    handRaised: participant.handRaised ?? false
  }));
}

async function deleteParticipant(roomCode: string, participantId: string) {
  if (!isMongoReady()) {
    return removeParticipant(roomCode, participantId)?.participants ?? [];
  }

  const room = await RoomModel.findOneAndUpdate(
    { code: roomCode },
    { $pull: { participants: { id: participantId } } },
    { new: true }
  ).lean();

  return (room?.participants ?? []).map((participant) => ({
    id: participant.id,
    name: participant.name,
    color: participant.color,
    role: participant.role,
    online: participant.online ?? true,
    handRaised: participant.handRaised ?? false
  }));
}

async function saveRoomSettings(
  roomCode: string,
  updates: { roomTitle?: string; permissions?: Partial<RoomPermissions> }
) {
  if (!isMongoReady()) {
    return updateRoomSettings(roomCode, updates);
  }

  const set: Record<string, unknown> = {};

  if (updates.roomTitle) {
    set.roomTitle = updates.roomTitle.trim().slice(0, 64);
  }

  if (updates.permissions) {
    for (const [key, value] of Object.entries(updates.permissions)) {
      set[`permissions.${key}`] = value;
    }
  }

  await RoomModel.findOneAndUpdate({ code: roomCode }, { $set: set }, { upsert: true });
  const meta = await getRoomMeta(roomCode);
  return { code: roomCode, ...meta };
}

async function saveStroke(stroke: StrokePayload) {
  const normalizedStroke = {
    ...stroke,
    pageId: stroke.pageId ?? DEFAULT_PAGE_ID
  };

  if (!isMongoReady()) {
    addStroke(normalizedStroke.roomCode, normalizedStroke);
    return;
  }

  await StrokeModel.findOneAndUpdate({ id: normalizedStroke.id }, normalizedStroke, { upsert: true });
}

async function deleteStroke(roomCode: string, strokeId: string) {
  if (!isMongoReady()) {
    const room = getOrCreateRoom(roomCode);
    replaceStrokes(
      roomCode,
      room.strokes.filter((stroke) => stroke.id !== strokeId)
    );
    return;
  }

  await StrokeModel.deleteOne({ roomCode, id: strokeId });
}

async function clearRoomStrokes(roomCode: string, pageId?: string) {
  if (!isMongoReady()) {
    const room = getOrCreateRoom(roomCode);
    replaceStrokes(roomCode, pageId ? room.strokes.filter((stroke) => stroke.pageId !== pageId) : []);
    return;
  }

  await StrokeModel.deleteMany(pageId ? { roomCode, pageId } : { roomCode });
}

export function registerDrawingSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("room:create", async ({ user }: { user: Participant }, callback) => {
      const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      await joinRoom(io, socket, { roomCode, user }, callback);
    });

    socket.on("room:join", async (payload: JoinRoomPayload, callback) => {
      await joinRoom(io, socket, payload, callback);
    });

    socket.on(
      "room:update",
      async ({
        roomCode,
        roomTitle,
        permissions
      }: {
        roomCode: string;
        roomTitle?: string;
        permissions?: Partial<RoomPermissions>;
      }) => {
        const normalizedCode = normalizeRoomCode(roomCode);
        const nextRoom = await saveRoomSettings(normalizedCode, { roomTitle, permissions });
        io.to(normalizedCode).emit("room:update", nextRoom);
      }
    );

    socket.on("stroke:start", (stroke: StrokePayload) => {
      socket.to(stroke.roomCode).emit("stroke:remote-start", stroke);
    });

    socket.on("stroke:draw", (stroke: StrokePayload) => {
      socket.to(stroke.roomCode).emit("stroke:remote-draw", stroke);
    });

    socket.on("stroke:end", async (stroke: StrokePayload) => {
      await saveStroke(stroke);
      socket.to(stroke.roomCode).emit("stroke:remote-end", stroke);
    });

    socket.on("stroke:update", async (stroke: StrokePayload) => {
      await saveStroke(stroke);
      socket.to(stroke.roomCode).emit("stroke:remote-update", stroke);
    });

    socket.on("canvas:clear", async ({ roomCode, pageId }: { roomCode: string; pageId?: string }) => {
      const normalizedCode = normalizeRoomCode(roomCode);
      const normalizedPageId = pageId?.trim();
      await clearRoomStrokes(normalizedCode, normalizedPageId);
      io.to(normalizedCode).emit("canvas:cleared", normalizedPageId ? { pageId: normalizedPageId } : {});
    });

    socket.on("canvas:undo", async ({ roomCode, strokeId }: { roomCode: string; strokeId: string }) => {
      const normalizedCode = normalizeRoomCode(roomCode);
      await deleteStroke(normalizedCode, strokeId);
      io.to(normalizedCode).emit("canvas:stroke-removed", { strokeId });
    });

    socket.on("canvas:redo", async (stroke: StrokePayload) => {
      await saveStroke(stroke);
      io.to(stroke.roomCode).emit("canvas:stroke-restored", stroke);
    });

    socket.on(
      "board:template",
      async ({ roomCode, pageId, boardTemplate }: { roomCode: string; pageId?: string; boardTemplate: BoardTemplate }) => {
        const normalizedCode = normalizeRoomCode(roomCode);
        const normalizedPageId = pageId ?? DEFAULT_PAGE_ID;

        if (!BOARD_TEMPLATES.has(boardTemplate)) {
          return;
        }

        await saveBoardTemplate(normalizedCode, normalizedPageId, boardTemplate);
        io.to(normalizedCode).emit("board:template-update", { pageId: normalizedPageId, boardTemplate });
      }
    );

    socket.on("page:create", async ({ roomCode, title }: { roomCode: string; title?: string }) => {
      const normalizedCode = normalizeRoomCode(roomCode);
      const currentPages = await getRoomPages(normalizedCode);

      if (currentPages.length >= MAX_PAGES) {
        socket.emit("page:limit", { maxPages: MAX_PAGES });
        return;
      }

      const page: BoardPage = {
        id: `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        title: (title?.trim() || `Page ${currentPages.length + 1}`).slice(0, 40),
        boardTemplate: "plain"
      };
      const result = await savePage(normalizedCode, page);
      const pages = result?.pages ?? getOrCreateRoom(normalizedCode).pages;

      io.to(normalizedCode).emit("page:created", { pages, activePageId: page.id });
    });

    socket.on("page:switch", async ({ roomCode, pageId }: { roomCode: string; pageId: string }) => {
      const normalizedCode = normalizeRoomCode(roomCode);
      const pages = await getRoomPages(normalizedCode);

      if (!pages.some((page) => page.id === pageId)) {
        return;
      }

      await saveActivePage(normalizedCode, pageId);
      io.to(normalizedCode).emit("page:active-update", pageId);
    });

    socket.on("chat:message", (message: ChatMessagePayload) => {
      const roomCode = normalizeRoomCode(message.roomCode);
      const text = message.text.trim().slice(0, 160);

      if (!roomCode || !text) {
        return;
      }

      io.to(roomCode).emit("chat:message", {
        ...message,
        roomCode,
        text,
        createdAt: message.createdAt || new Date().toISOString()
      });
    });

    socket.on("disconnect", async () => {
      const roomCode = socket.data.roomCode as string | undefined;
      const userId = socket.data.userId as string | undefined;

      if (!roomCode || !userId) {
        return;
      }

      const participants = await deleteParticipant(roomCode, userId);
      socket.to(roomCode).emit("participant:update", participants);
    });
  });
}

async function joinRoom(
  io: Server,
  socket: Socket,
  payload: JoinRoomPayload,
  callback?: (response: unknown) => void
) {
  const roomCode = normalizeRoomCode(payload.roomCode);

  if (!ROOM_CODE_PATTERN.test(roomCode)) {
    callback?.({ ok: false, message: "Use a 3-16 character room code." });
    return;
  }

  if (!isValidParticipant(payload.user)) {
    callback?.({ ok: false, message: "Enter a valid display name." });
    return;
  }

  const participants = await getParticipants(roomCode);
  const isAlreadyInRoom = participants.some((participant) => participant.id === payload.user.id);
  const meta = await getRoomMeta(roomCode);

  if (!isAlreadyInRoom && participants.length >= MAX_ROOM_SIZE) {
    socket.emit("room:full", { roomCode });
    callback?.({ ok: false, message: `This room already has ${MAX_ROOM_SIZE} players.` });
    return;
  }

  if (!isAlreadyInRoom && meta.permissions.roomLocked && participants.length > 0) {
    callback?.({ ok: false, message: "This room is locked by the host." });
    return;
  }

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.userId = payload.user.id;

  const updatedParticipants = await saveParticipant(roomCode, payload.user);
  const strokes = await loadStrokes(roomCode);
  const pages = await getRoomPages(roomCode);
  const activePageId = await getActivePageId(roomCode);

  callback?.({
    ok: true,
    roomCode,
    roomTitle: meta.roomTitle,
    permissions: meta.permissions,
    participants: updatedParticipants,
    strokes,
    pages,
    activePageId
  });

  io.to(roomCode).emit("participant:update", updatedParticipants);
}
