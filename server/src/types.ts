export type Participant = {
  id: string;
  name: string;
  color: string;
  role?: "host" | "editor" | "viewer";
  online?: boolean;
  handRaised?: boolean;
};

export type Tool = "pencil" | "eraser" | "line" | "rectangle" | "circle" | "text" | "image";
export type BoardTemplate = "plain" | "grid" | "ruled" | "axes";

export type RoomPermissions = {
  studentsCanDraw: boolean;
  chatMuted: boolean;
  raiseHandEnabled: boolean;
  waitingRoomEnabled: boolean;
  roomLocked: boolean;
  followTeacherView: boolean;
  showStudentCursors: boolean;
};

export type BoardPage = {
  id: string;
  title: string;
  boardTemplate: BoardTemplate;
};

export type Point = {
  x: number;
  y: number;
};

export type StrokePayload = {
  id: string;
  roomCode: string;
  pageId: string;
  userId: string;
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
  text?: string;
  imageSrc?: string;
  createdAt?: string;
};

export type JoinRoomPayload = {
  roomCode: string;
  user: Participant;
};

export type ChatMessagePayload = {
  id: string;
  roomCode: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};
