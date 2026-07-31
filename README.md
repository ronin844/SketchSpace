# SketchSpace MERN

SketchSpace is a professional collaborative whiteboard for live sessions, tutoring, meetings, explanations, and brainstorming. It uses React, TypeScript, Canvas, Node.js, Express, Socket.IO, and MongoDB with an in-memory fallback for local development.

## Features

- Create or join a room by code
- Copy invite link and leave room
- Room title and professional permission controls
- Owner, editor, and viewer roles
- Viewer editing toggle, viewer chat mute, request-attention mode, follow-presenter toggle, and room lock
- Real-time shared canvas with pencil, eraser, line, rectangle, circle, text, selection, move, and resize
- Per-page board backgrounds: blank, graph grid, ruled paper, and coordinate axes
- Multi-page whiteboard with page switching and page sidebar
- Participants, chat, notes, and pages in a tabbed right sidebar
- Live clock, countdown timer, and keyboard shortcuts modal
- Export current page as PNG
- MongoDB-ready room, board, message, and session history models

## Stack

- Frontend: React, TypeScript, Vite, Canvas, Socket.IO client
- Backend: Node.js, Express, Socket.IO, Mongoose
- Database: MongoDB when `MONGO_URI` is set, in-memory fallback otherwise

## Quick Start

```bash
npm install
npm run dev
```

Client: `http://localhost:5173`
Server: `http://localhost:4500`

## Environment

Create `server/.env` when you want persistence:

```bash
PORT=4500
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/sketchspace
```

## Testing Collaboration

1. Start the app with `npm run dev`.
2. Open `http://localhost:5173` in two browser tabs.
3. Create a room in the first tab.
4. Copy the invite link or room code.
5. Join from the second tab.
6. Draw, change pages, send chat messages, and test permission toggles.

## Keyboard Shortcuts

- `P`: Pen
- `E`: Eraser
- `T`: Text
- `V`: Select
- `L`: Line
- `R`: Rectangle
- `C`: Circle
- `Ctrl + Z`: Undo
- `Ctrl + Y`: Redo
- `Ctrl + S`: Save status
- `?`: Shortcuts help

## REST API

Rooms:

- `GET /api/rooms/:code`

Boards:

- `GET /api/boards/:roomCode`
- `POST /api/boards/:roomCode/save`
- `GET /api/boards/recent`
- `GET /api/boards/:roomCode/history`

Messages:

- `GET /api/messages/:roomCode`
- `POST /api/messages/:roomCode`
- `PATCH /api/messages/:messageId/pin`
- `DELETE /api/messages/:messageId`

Exports:

- `POST /api/export/png`
- `POST /api/export/pdf`

## Socket Events

Current implemented events include:

- Room: `room:create`, `room:join`, `room:update`, `participant:update`
- Board: `stroke:start`, `stroke:draw`, `stroke:end`, `stroke:update`, `canvas:clear`, `canvas:undo`, `canvas:redo`, `board:template`, `page:create`, `page:switch`
- Chat: `chat:message`

Planned next events include cursor sync, request attention, poll, announcements, page rename/delete/reorder, and owner moderation actions.

## Project Structure

```text
client/src/
  components/
  boardTemplates.ts
  socket.ts
  types.ts
server/src/
  config/
  models/
  routes/
  socket/
  state/
  types.ts
```

## Future Improvements

- Synced cursor layer with user names
- Host-controlled kick/transfer-host actions
- Page rename, duplicate, delete, and reorder
- Sticky notes, arrows, highlighter, laser pointer, image upload, and PDF import
- Autosave worker and restore previous session UI
- Export all pages as PDF
- Polls, quizzes, announcements, and raised-hand queue
- Zustand or Context split for room, board, tools, chat, notes, and page state
