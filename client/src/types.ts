export type StrokeTool = "pencil" | "eraser" | "line" | "rectangle" | "circle" | "text" | "image";
export type Tool = StrokeTool | "select";
export type BoardTemplate = "plain" | "grid" | "ruled" | "axes";
export type UserRole = "host" | "editor" | "viewer";

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

export type User = {
  id: string;
  name: string;
  color: string;
  role?: UserRole;
  online?: boolean;
  handRaised?: boolean;
};

export type Stroke = {
  id: string;
  roomCode: string;
  pageId: string;
  userId: string;
  tool: StrokeTool;
  color: string;
  size: number;
  points: Point[];
  text?: string;
  imageSrc?: string;
  createdAt?: string;
};

export type RoomState = {
  roomCode: string;
  roomTitle: string;
  user: User;
  participants: User[];
  permissions: RoomPermissions;
  strokes: Stroke[];
  pages: BoardPage[];
  activePageId: string;
};

export type ChatMessage = {
  id: string;
  roomCode: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

export type DrawingSettings = {
  tool: Tool;
  color: string;
  size: number;
  textSize: number;
};
