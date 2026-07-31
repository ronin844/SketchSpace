import type { BoardPage, BoardTemplate, Participant, RoomPermissions, StrokePayload } from "../types.js";

type RoomRecord = {
  code: string;
  roomTitle: string;
  permissions: RoomPermissions;
  participants: Participant[];
  strokes: StrokePayload[];
  pages: BoardPage[];
  activePageId: string;
};

const rooms = new Map<string, RoomRecord>();

export const defaultPermissions: RoomPermissions = {
  studentsCanDraw: false,
  chatMuted: false,
  raiseHandEnabled: true,
  waitingRoomEnabled: false,
  roomLocked: false,
  followTeacherView: false,
  showStudentCursors: true
};

export function getOrCreateRoom(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const existing = rooms.get(normalizedCode);

  if (existing) {
    return existing;
  }

  const room: RoomRecord = {
    code: normalizedCode,
    roomTitle: "Untitled Board",
    permissions: { ...defaultPermissions },
    participants: [],
    strokes: [],
    pages: [{ id: "page-1", title: "Page 1", boardTemplate: "plain" }],
    activePageId: "page-1"
  };
  rooms.set(normalizedCode, room);
  return room;
}

export function getRoom(code: string) {
  return rooms.get(code.trim().toUpperCase());
}

export function upsertParticipant(roomCode: string, participant: Participant) {
  const room = getOrCreateRoom(roomCode);
  const existingIndex = room.participants.findIndex((item) => item.id === participant.id);
  const role = participant.role ?? (room.participants.length === 0 ? "host" : "viewer");
  const nextParticipant = { ...participant, role, online: true };

  if (existingIndex >= 0) {
    room.participants[existingIndex] = { ...room.participants[existingIndex], ...nextParticipant };
  } else {
    room.participants.push(nextParticipant);
  }

  return room;
}

export function removeParticipant(roomCode: string, participantId: string) {
  const room = getRoom(roomCode);

  if (!room) {
    return undefined;
  }

  room.participants = room.participants.filter((participant) => participant.id !== participantId);
  return room;
}

export function addStroke(roomCode: string, stroke: StrokePayload) {
  const room = getOrCreateRoom(roomCode);
  const existingIndex = room.strokes.findIndex((item) => item.id === stroke.id);

  if (existingIndex >= 0) {
    room.strokes[existingIndex] = stroke;
  } else {
    room.strokes.push(stroke);
  }

  return room;
}

export function replaceStrokes(roomCode: string, strokes: StrokePayload[]) {
  const room = getOrCreateRoom(roomCode);
  room.strokes = strokes;
  return room;
}

export function setBoardTemplate(roomCode: string, pageId: string, boardTemplate: BoardTemplate) {
  const room = getOrCreateRoom(roomCode);
  room.pages = room.pages.map((page) => (page.id === pageId ? { ...page, boardTemplate } : page));
  return room;
}

export function addPage(roomCode: string, page: BoardPage) {
  const room = getOrCreateRoom(roomCode);
  const exists = room.pages.some((existingPage) => existingPage.id === page.id);

  if (!exists) {
    room.pages.push(page);
  }

  room.activePageId = page.id;
  return room;
}

export function setActivePage(roomCode: string, pageId: string) {
  const room = getOrCreateRoom(roomCode);

  if (room.pages.some((page) => page.id === pageId)) {
    room.activePageId = pageId;
  }

  return room;
}

export function updateRoomSettings(
  roomCode: string,
  updates: { roomTitle?: string; permissions?: Partial<RoomPermissions> }
) {
  const room = getOrCreateRoom(roomCode);

  if (typeof updates.roomTitle === "string") {
    room.roomTitle = updates.roomTitle.trim().slice(0, 64) || room.roomTitle;
  }

  if (updates.permissions) {
    room.permissions = { ...room.permissions, ...updates.permissions };
  }

  return room;
}
