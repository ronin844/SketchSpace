import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  HelpCircle,
  LogOut,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Timer
} from "lucide-react";
import { drawBoardTemplate } from "./boardTemplates";
import { CanvasStage } from "./components/CanvasStage";
import { PageStrip } from "./components/PageStrip";
import { RightSidebar } from "./components/RightSidebar";
import { RoomLobby } from "./components/RoomLobby";
import { RoomControlPanel } from "./components/RoomControlPanel";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { ToolBar } from "./components/ToolBar";
import { socket } from "./socket";
import type {
  BoardPage,
  BoardTemplate,
  ChatMessage,
  DrawingSettings,
  RoomPermissions,
  RoomState,
  Stroke,
  User
} from "./types";

type RoomResponse = {
  ok: boolean;
  message?: string;
  roomCode?: string;
  participants?: User[];
  strokes?: Stroke[];
  boardTemplate?: BoardTemplate;
  pages?: BoardPage[];
  activePageId?: string;
  roomTitle?: string;
  permissions?: RoomPermissions;
};

type Theme = "light" | "dark";

const defaultSettings: DrawingSettings = {
  tool: "pencil",
  color: "#162033",
  size: 8,
  textSize: 24
};

const defaultPage: BoardPage = {
  id: "page-1",
  title: "Page 1",
  boardTemplate: "plain"
};

const defaultPermissions: RoomPermissions = {
  studentsCanDraw: false,
  chatMuted: false,
  raiseHandEnabled: true,
  waitingRoomEnabled: false,
  roomLocked: false,
  followTeacherView: false,
  showStudentCursors: true
};

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function createStrokeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Could not load this image."));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

async function compressImageFile(file: File) {
  const dataUrl = await readImageFile(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare this image.");
  }

  context.drawImage(image, 0, 0, width, height);
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    ratio: width / height
  };
}

function randomUserColor() {
  const colors = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getStoredUser(): User {
  const existing =
    localStorage.getItem("sketchspace:user") ??
    localStorage.getItem("edusketch:user") ??
    localStorage.getItem("scribble:user");

  if (existing) {
    const user = JSON.parse(existing) as User;
    localStorage.setItem("sketchspace:user", JSON.stringify(user));
    return user;
  }

  const user = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Guest",
    color: randomUserColor()
  };

  localStorage.setItem("sketchspace:user", JSON.stringify(user));
  return user;
}

function getStoredTheme(): Theme {
  const storedTheme =
    localStorage.getItem("sketchspace:theme") ??
    localStorage.getItem("edusketch:theme") ??
    localStorage.getItem("scribble:theme");
  return storedTheme === "dark" ? "dark" : "light";
}

function upsertStroke(strokes: Stroke[], nextStroke: Stroke) {
  const existingIndex = strokes.findIndex((stroke) => stroke.id === nextStroke.id);

  if (existingIndex === -1) {
    return [...strokes, nextStroke];
  }

  return strokes.map((stroke, index) => (index === existingIndex ? nextStroke : stroke));
}

function updateStoredName(user: User, name: string) {
  const nextUser = { ...user, name };
  localStorage.setItem("sketchspace:user", JSON.stringify(nextUser));
  return nextUser;
}

function roomUrl(roomCode: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function replaceRoomInUrl(roomCode?: string) {
  const url = new URL(window.location.href);

  if (roomCode) {
    url.searchParams.set("room", roomCode);
  } else {
    url.searchParams.delete("room");
  }

  window.history.replaceState({}, "", url);
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number
) {
  const paragraphs = text.split("\n");
  let currentY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    if (words.length === 0) {
      currentY += lineHeight;
      continue;
    }

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;

      if (context.measureText(testLine).width > maxWidth && line) {
        if (currentY + lineHeight > y + maxHeight) {
          return;
        }

        context.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line && currentY + lineHeight <= y + maxHeight) {
      context.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  }
}

function drawStrokeToContext(context: CanvasRenderingContext2D, width: number, height: number, stroke: Stroke) {
  if (stroke.points.length === 0) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.size;
  context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;

  const firstPoint = stroke.points[0];
  const lastPoint = stroke.points[stroke.points.length - 1];
  const startX = firstPoint.x * width;
  const startY = firstPoint.y * height;
  const endX = lastPoint.x * width;
  const endY = lastPoint.y * height;

  if (stroke.tool === "text") {
    const textEndPoint = stroke.points[1] ?? {
      x: Math.min(firstPoint.x + 0.34, 0.98),
      y: Math.min(firstPoint.y + 0.12, 0.98)
    };
    const fontSize = Math.max(10, stroke.size);
    const lineHeight = fontSize * 1.28;
    const boxWidth = Math.max(40, (textEndPoint.x - firstPoint.x) * width);
    const boxHeight = Math.max(lineHeight, (textEndPoint.y - firstPoint.y) * height);
    context.fillStyle = stroke.color;
    context.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
    context.textBaseline = "top";
    drawWrappedText(context, stroke.text ?? "", startX, startY, boxWidth, boxHeight, lineHeight);
    context.restore();
    return;
  }

  if (stroke.tool === "image") {
    const image = new Image();
    image.src = stroke.imageSrc ?? "";
    context.fillStyle = "#f8fafc";
    context.fillRect(startX, startY, endX - startX, endY - startY);
    context.strokeStyle = "#cbd5e1";
    context.strokeRect(startX, startY, endX - startX, endY - startY);
    context.restore();
    return;
  }

  if (stroke.tool === "line") {
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    context.restore();
    return;
  }

  if (stroke.tool === "rectangle") {
    context.strokeRect(startX, startY, endX - startX, endY - startY);
    context.restore();
    return;
  }

  if (stroke.tool === "circle") {
    const centerX = startX + (endX - startX) / 2;
    const centerY = startY + (endY - startY) / 2;
    const radiusX = Math.abs(endX - startX) / 2;
    const radiusY = Math.abs(endY - startY) / 2;
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    return;
  }

  context.beginPath();
  context.moveTo(startX, startY);

  if (stroke.points.length === 1) {
    context.lineTo(startX + 0.1, startY + 0.1);
  }

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x * width, point.y * height);
  }

  context.stroke();
  context.restore();
}

export default function App() {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<User>(() => getStoredUser());
  const [room, setRoom] = useState<RoomState | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [status, setStatus] = useState("Ready to draw.");
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(5 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [textRequestId, setTextRequestId] = useState(0);

  const activePageId = room?.activePageId ?? defaultPage.id;
  const activePage = room?.pages.find((page) => page.id === activePageId) ?? defaultPage;
  const boardTemplate = activePage.boardTemplate;
  const activePageStrokes = useMemo(() => {
    return room?.strokes.filter((stroke) => stroke.pageId === activePageId) ?? [];
  }, [activePageId, room?.strokes]);
  const canUndo = useMemo(() => {
    return activePageStrokes.some((stroke) => stroke.userId === user.id);
  }, [activePageStrokes, user.id]);
  const canRedo = redoStack.length > 0;
  const currentParticipant = room?.participants.find((participant) => participant.id === user.id);
  const currentRole = currentParticipant?.role ?? "viewer";
  const isHost = currentRole === "host";
  const canEditBoard = currentRole === "host" || currentRole === "editor" || Boolean(room?.permissions.studentsCanDraw);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sketchspace:theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          setIsTimerRunning(false);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTimerRunning]);

  const countdownLabel = formatCountdown(timerSeconds);

  function changeTimerMinutes(minutes: number) {
    const nextMinutes = Math.min(120, Math.max(1, minutes || 1));

    setTimerMinutes(nextMinutes);
    setTimerSeconds(nextMinutes * 60);
    setIsTimerRunning(false);
  }

  function toggleTimer() {
    if (timerSeconds === 0) {
      setTimerSeconds(timerMinutes * 60);
      setIsTimerRunning(true);
      return;
    }

    setIsTimerRunning((running) => !running);
  }

  function resetTimer() {
    setIsTimerRunning(false);
    setTimerSeconds(timerMinutes * 60);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (isTyping) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastStroke();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoStroke();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setStatus("Saved locally. MongoDB autosave is available when configured.");
        return;
      }

      const shortcutTools: Record<string, DrawingSettings["tool"]> = {
        c: "circle",
        e: "eraser",
        l: "line",
        p: "pencil",
        r: "rectangle",
        t: "text",
        v: "select"
      };
      const tool = shortcutTools[event.key.toLowerCase()];

      if (tool && canEditBoard) {
        setSettings((currentSettings) => ({ ...currentSettings, tool }));

        if (tool === "text") {
          setTextRequestId((requestId) => requestId + 1);
        }
      }

      if (event.key === "?") {
        setIsShortcutsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEditBoard, redoStack, activePageStrokes, room, user.id]);

  function updateRoomSettings(updates: { roomTitle?: string; permissions?: Partial<RoomPermissions> }) {
    if (!room || !isHost) {
      setStatus("Only the host can change room settings.");
      return;
    }

    const nextRoom = {
      ...room,
      roomTitle: updates.roomTitle ?? room.roomTitle,
      permissions: updates.permissions ? { ...room.permissions, ...updates.permissions } : room.permissions
    };

    setRoom(nextRoom);
    socket.emit("room:update", {
      roomCode: room.roomCode,
      roomTitle: updates.roomTitle,
      permissions: updates.permissions
    });
  }

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => setStatus("Connected."));
    socket.on("disconnect", () => setStatus("Disconnected. Drawing is local until you reconnect."));
    socket.on("room:full", () => setStatus("That room already has four players."));
    socket.on("participant:update", (participants: User[]) => {
      setRoom((currentRoom) => (currentRoom ? { ...currentRoom, participants } : currentRoom));
    });

    socket.on(
      "room:update",
      ({ roomTitle, permissions }: { roomTitle?: string; permissions?: RoomPermissions }) => {
        setRoom((currentRoom) =>
          currentRoom
            ? {
                ...currentRoom,
                roomTitle: roomTitle ?? currentRoom.roomTitle,
                permissions: permissions ?? currentRoom.permissions
              }
            : currentRoom
        );
      }
    );

    socket.on("stroke:remote-start", (stroke: Stroke) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
      );
    });

    socket.on("stroke:remote-draw", (stroke: Stroke) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
      );
    });

    socket.on("stroke:remote-end", (stroke: Stroke) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
      );
    });

    socket.on("stroke:remote-update", (stroke: Stroke) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
      );
    });

    socket.on("canvas:cleared", ({ pageId }: { pageId?: string } = {}) => {
      setRoom((currentRoom) =>
        currentRoom
          ? {
              ...currentRoom,
              strokes: pageId ? currentRoom.strokes.filter((stroke) => stroke.pageId !== pageId) : []
            }
          : currentRoom
      );
      setRedoStack([]);
    });

    socket.on("canvas:stroke-removed", ({ strokeId }: { strokeId: string }) => {
      setRoom((currentRoom) =>
        currentRoom
          ? { ...currentRoom, strokes: currentRoom.strokes.filter((stroke) => stroke.id !== strokeId) }
          : currentRoom
      );
    });

    socket.on("canvas:stroke-restored", (stroke: Stroke) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
      );
    });

    socket.on("chat:message", (message: ChatMessage) => {
      setMessages((currentMessages) => [...currentMessages, message].slice(-30));
    });

    socket.on("board:template-update", ({ pageId, boardTemplate: nextBoardTemplate }: { pageId: string; boardTemplate: BoardTemplate }) => {
      setRoom((currentRoom) =>
        currentRoom
          ? {
              ...currentRoom,
              pages: currentRoom.pages.map((page) =>
                page.id === pageId ? { ...page, boardTemplate: nextBoardTemplate } : page
              )
            }
          : currentRoom
      );
    });

    socket.on("page:created", ({ pages, activePageId: nextActivePageId }: { pages: BoardPage[]; activePageId: string }) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, pages, activePageId: nextActivePageId } : currentRoom
      );
      setRedoStack([]);
    });

    socket.on("page:active-update", (nextActivePageId: string) => {
      setRoom((currentRoom) =>
        currentRoom ? { ...currentRoom, activePageId: nextActivePageId } : currentRoom
      );
      setRedoStack([]);
    });

    socket.on("page:limit", ({ maxPages }: { maxPages: number }) => {
      setStatus(`Page limit reached (${maxPages}).`);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:full");
      socket.off("participant:update");
      socket.off("room:update");
      socket.off("stroke:remote-start");
      socket.off("stroke:remote-draw");
      socket.off("stroke:remote-end");
      socket.off("stroke:remote-update");
      socket.off("canvas:cleared");
      socket.off("canvas:stroke-removed");
      socket.off("canvas:stroke-restored");
      socket.off("chat:message");
      socket.off("board:template-update");
      socket.off("page:created");
      socket.off("page:active-update");
      socket.off("page:limit");
      socket.disconnect();
    };
  }, []);

  function handleRoomResponse(nextUser: User, response: RoomResponse) {
    if (!response.ok || !response.roomCode || !response.participants || !response.strokes) {
      setStatus(response.message ?? "Could not join the room.");
      return;
    }

    const pages = response.pages?.length
      ? response.pages
      : [{ ...defaultPage, boardTemplate: response.boardTemplate ?? "plain" }];

    setRoom({
      roomCode: response.roomCode,
      roomTitle: response.roomTitle ?? "Untitled Board",
      user: nextUser,
      participants: response.participants,
      permissions: { ...defaultPermissions, ...(response.permissions ?? {}) },
      strokes: response.strokes,
      pages,
      activePageId: response.activePageId ?? pages[0].id
    });
    setRedoStack([]);
    setMessages([]);
    replaceRoomInUrl(response.roomCode);
    setStatus(`Room ${response.roomCode} is open.`);
  }

  function createRoom(name: string) {
    const nextUser = updateStoredName(user, name);
    setUser(nextUser);
    setStatus("Creating room...");
    socket.emit("room:create", { user: nextUser }, (response: RoomResponse) => {
      handleRoomResponse(nextUser, response);
    });
  }

  function joinRoom(roomCode: string, name: string) {
    const nextUser = updateStoredName(user, name);
    setUser(nextUser);
    setStatus("Joining room...");
    socket.emit("room:join", { roomCode, user: nextUser }, (response: RoomResponse) => {
      handleRoomResponse(nextUser, response);
    });
  }

  function handleStrokeStart(stroke: Stroke) {
    if (!canEditBoard) {
      setStatus("You are viewing. Ask the host for editing access.");
      return;
    }

    setRoom((currentRoom) =>
      currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
    );
    setRedoStack([]);
    socket.emit("stroke:start", stroke);
  }

  function handleStrokeChange(stroke: Stroke) {
    if (!canEditBoard) {
      return;
    }

    setRoom((currentRoom) =>
      currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
    );
    socket.emit("stroke:draw", stroke);
  }

  function handleStrokeEnd(stroke: Stroke) {
    if (!canEditBoard) {
      return;
    }

    setRoom((currentRoom) =>
      currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
    );
    socket.emit("stroke:end", stroke);
  }

  function handleStrokeUpdate(stroke: Stroke) {
    if (!canEditBoard) {
      return;
    }

    setRoom((currentRoom) =>
      currentRoom ? { ...currentRoom, strokes: upsertStroke(currentRoom.strokes, stroke) } : currentRoom
    );
    socket.emit("stroke:update", stroke);
  }

  async function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !room) {
      return;
    }

    if (!canEditBoard) {
      setStatus("Only editors can import images.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Please choose a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setStatus("Image is too large. Choose an image under 6 MB.");
      return;
    }

    try {
      setStatus("Importing image...");
      const { dataUrl, ratio } = await compressImageFile(file);
      const width = ratio >= 1 ? 0.42 : Math.max(0.18, 0.3 * ratio);
      const height = ratio >= 1 ? Math.max(0.16, width / ratio) : 0.36;
      const startX = 0.5 - width / 2;
      const startY = 0.5 - height / 2;
      const stroke: Stroke = {
        id: createStrokeId(),
        roomCode: room.roomCode,
        pageId: activePageId,
        userId: user.id,
        tool: "image",
        color: "#000000",
        size: 1,
        points: [
          { x: startX, y: startY },
          { x: startX + width, y: startY + height }
        ],
        imageSrc: dataUrl
      };

      setRoom({ ...room, strokes: upsertStroke(room.strokes, stroke) });
      socket.emit("stroke:end", stroke);
      setSettings((currentSettings) => ({ ...currentSettings, tool: "select" }));
      setStatus("Image imported. Use Select to move or resize it.");
    } catch {
      setStatus("Could not import that image.");
    }
  }

  function clearCanvas() {
    if (!room || !canEditBoard) {
      setStatus("Only editors can clear the board.");
      return;
    }

    setIsClearConfirmOpen(true);
  }

  function confirmClearCanvas() {
    if (!room || !canEditBoard) {
      setIsClearConfirmOpen(false);
      return;
    }

    setRedoStack([]);
    socket.emit("canvas:clear", { roomCode: room.roomCode });
    setIsClearConfirmOpen(false);
    setStatus("Cleared all board content.");
  }

  function changeBoardTemplate(nextBoardTemplate: BoardTemplate) {
    if (!room || !canEditBoard) {
      setStatus("Only editors can change page backgrounds.");
      return;
    }

    setRoom({
      ...room,
      pages: room.pages.map((page) =>
        page.id === activePageId ? { ...page, boardTemplate: nextBoardTemplate } : page
      )
    });
    socket.emit("board:template", { roomCode: room.roomCode, pageId: activePageId, boardTemplate: nextBoardTemplate });
  }

  function addPage() {
    if (!room || !canEditBoard) {
      setStatus("Only editors can add pages.");
      return;
    }

    socket.emit("page:create", { roomCode: room.roomCode });
  }

  function switchPage(pageId: string) {
    if (!room || pageId === activePageId) {
      return;
    }

    setRoom({ ...room, activePageId: pageId });
    setRedoStack([]);
    socket.emit("page:switch", { roomCode: room.roomCode, pageId });
  }

  function undoLastStroke() {
    if (!room || !canEditBoard) {
      setStatus("Only editors can undo board changes.");
      return;
    }

    const lastOwnStroke = [...activePageStrokes].reverse().find((stroke) => stroke.userId === user.id);

    if (!lastOwnStroke) {
      return;
    }

    const nextStrokes = room.strokes.filter((stroke) => stroke.id !== lastOwnStroke.id);
    setRoom({ ...room, strokes: nextStrokes });
    setRedoStack((currentStack) => [lastOwnStroke, ...currentStack]);
    socket.emit("canvas:undo", { roomCode: room.roomCode, pageId: activePageId, strokeId: lastOwnStroke.id });
  }

  function redoStroke() {
    if (!room || !canEditBoard || redoStack.length === 0) {
      return;
    }

    const [strokeToRestore, ...remainingStrokes] = redoStack;
    setRedoStack(remainingStrokes);
    setRoom({ ...room, strokes: upsertStroke(room.strokes, strokeToRestore) });
    socket.emit("canvas:redo", strokeToRestore);
  }

  async function copyRoomCode() {
    if (!room) {
      return;
    }

    const link = roomUrl(room.roomCode);

    try {
      await navigator.clipboard.writeText(link);
      setStatus("Copied room link.");
    } catch {
      setStatus(`Room code: ${room.roomCode}`);
    }
  }

  function exportCanvas() {
    if (!room) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d");

    if (!context) {
      setStatus("Could not export this canvas.");
      return;
    }

    drawBoardTemplate(context, canvas.width, canvas.height, boardTemplate);
    activePageStrokes.forEach((stroke) => drawStrokeToContext(context, canvas.width, canvas.height, stroke));

    const link = document.createElement("a");
    link.download = `sketchspace-${room.roomCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus("Exported canvas as PNG.");
  }

  function sendMessage(text: string) {
    if (!room) {
      return;
    }

    if (room.permissions.chatMuted && !isHost) {
      setStatus("Viewer chat is muted by the owner.");
      return;
    }

    const message: ChatMessage = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      roomCode: room.roomCode,
      userId: user.id,
      userName: user.name,
      text,
      createdAt: new Date().toISOString()
    };

    socket.emit("chat:message", message);
  }

  if (!room) {
    return (
      <RoomLobby
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onToggleTheme={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
        status={status}
        theme={theme}
        user={user}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Room</p>
          <h1>{room.roomCode}</h1>
        </div>
        <div className="topbar-actions">
          <div className={timerSeconds === 0 ? "countdown-timer done" : "countdown-timer"} aria-label="Countdown timer">
            <Timer size={17} aria-hidden />
            <strong>{countdownLabel}</strong>
            <label>
              <span className="visually-hidden">Timer minutes</span>
              <input
                aria-label="Timer minutes"
                max={120}
                min={1}
                onChange={(event) => changeTimerMinutes(Number(event.target.value))}
                type="number"
                value={timerMinutes}
              />
            </label>
            <button onClick={toggleTimer} title={isTimerRunning ? "Pause timer" : "Start timer"} type="button">
              {isTimerRunning ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            </button>
            <button onClick={resetTimer} title="Reset timer" type="button">
              <RotateCcw size={15} aria-hidden />
            </button>
          </div>
          <span className="connection-status">
            <span className="status-dot" aria-hidden />
            {status}
          </span>
          <details className="header-actions-menu">
            <summary aria-label="Open room actions">
              <MoreHorizontal size={18} aria-hidden />
              Actions
            </summary>
            <div className="header-menu-list">
              <button onClick={copyRoomCode} type="button">
                <Copy size={17} aria-hidden />
                Copy invite
              </button>
              <button onClick={exportCanvas} type="button">
                <Download size={17} aria-hidden />
                Export PNG
              </button>
              <button onClick={() => setIsShortcutsOpen(true)} type="button">
                <HelpCircle size={17} aria-hidden />
                Shortcuts
              </button>
              <button
                onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
                type="button"
              >
                {theme === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                className="danger-menu-item"
                onClick={() => {
                  replaceRoomInUrl();
                  setRoom(null);
                }}
                type="button"
              >
                <LogOut size={17} aria-hidden />
                Leave room
              </button>
            </div>
          </details>
        </div>
      </header>

      <RoomControlPanel
        currentRole={currentRole}
        isHost={isHost}
        onUpdateSettings={updateRoomSettings}
        permissions={room.permissions}
        roomTitle={room.roomTitle}
      />

      <PageStrip
        activePageId={activePageId}
        onAddPage={addPage}
        onSelectPage={switchPage}
        pages={room.pages}
      />
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="visually-hidden"
        onChange={importImage}
        ref={imageInputRef}
        type="file"
      />

      <section className="workspace">
        <ToolBar
          boardTemplate={boardTemplate}
          canRedo={canRedo}
          canUndo={canUndo}
          disabled={!canEditBoard}
          onBoardTemplateChange={changeBoardTemplate}
          onClear={clearCanvas}
          onImportImage={() => imageInputRef.current?.click()}
          onRedo={redoStroke}
          onSettingsChange={setSettings}
          onTextToolRequest={() => setTextRequestId((requestId) => requestId + 1)}
          onUndo={undoLastStroke}
          settings={settings}
        />
        <CanvasStage
          canEdit={canEditBoard}
          onStrokeChange={handleStrokeChange}
          onStrokeEnd={handleStrokeEnd}
          onStrokeStart={handleStrokeStart}
          onStrokeUpdate={handleStrokeUpdate}
          onTextSizeChange={(textSize) => setSettings((currentSettings) => ({ ...currentSettings, textSize }))}
          boardTemplate={boardTemplate}
          pageId={activePageId}
          roomCode={room.roomCode}
          settings={settings}
          strokes={activePageStrokes}
          textRequestId={textRequestId}
          userId={user.id}
        />
        <RightSidebar
          activePageId={activePageId}
          currentUserId={user.id}
          messages={messages}
          notes={notes}
          onNotesChange={setNotes}
          onSelectPage={switchPage}
          onSendMessage={sendMessage}
          pages={room.pages}
          participants={room.participants}
        />
      </section>
      <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} open={isShortcutsOpen} />
      {isClearConfirmOpen ? (
        <div className="modal-backdrop">
          <section aria-modal="true" className="confirm-dialog" role="dialog">
            <div>
              <p className="eyebrow">Clear board</p>
              <h2>Remove all content?</h2>
            </div>
            <p>
              This clears drawings, text boxes, shapes, and images from every page in this room for all participants.
            </p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setIsClearConfirmOpen(false)} type="button">
                Cancel
              </button>
              <button className="danger-button confirm-danger" onClick={confirmClearCanvas} type="button">
                Clear all
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
