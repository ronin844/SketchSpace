import { FormEvent, useEffect, useMemo, useState } from "react";
import { DoorOpen, Moon, Plus, Sun } from "lucide-react";
import type { User } from "../types";

type RoomLobbyProps = {
  user: User;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  onToggleTheme: () => void;
  status: string;
  theme: "light" | "dark";
};

export function RoomLobby({ user, onCreateRoom, onJoinRoom, onToggleTheme, status, theme }: RoomLobbyProps) {
  const [name, setName] = useState(user.name);
  const [roomCode, setRoomCode] = useState("");
  const canSubmit = useMemo(() => name.trim().length >= 2, [name]);

  useEffect(() => {
    const codeFromUrl = new URLSearchParams(window.location.search).get("room");

    if (codeFromUrl) {
      setRoomCode(codeFromUrl.trim().toUpperCase().slice(0, 16));
    }
  }, []);

  function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onCreateRoom(name.trim());
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit || roomCode.trim().length < 3) {
      return;
    }

    onJoinRoom(roomCode.trim().toUpperCase(), name.trim());
  }

  return (
    <main className="lobby-shell">
      <section className="lobby-panel" aria-labelledby="app-title">
        <button className="theme-button" onClick={onToggleTheme} title="Toggle theme" type="button">
          {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        <div className="lobby-copy">
          <h1 id="app-title">SketchSpace</h1>
          <p className="intro">Four seats. One shared canvas. Quick sketches that move in real time.</p>
        </div>

        <div className="lobby-preview" aria-hidden>
          <span className="preview-stroke stroke-one" />
          <span className="preview-stroke stroke-two" />
          <span className="preview-stroke stroke-three" />
          <span className="preview-dot dot-one" />
          <span className="preview-dot dot-two" />
        </div>

        <form className="lobby-form" onSubmit={handleJoin}>
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            maxLength={40}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            value={name}
          />

          <label htmlFor="room-code">Room code</label>
          <div className="join-row">
            <input
              id="room-code"
              maxLength={16}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              value={roomCode}
            />
            <button className="primary-button" disabled={!canSubmit || roomCode.length < 3} type="submit">
              <DoorOpen size={18} aria-hidden />
              Join
            </button>
          </div>
        </form>

        <button className="secondary-button" disabled={!canSubmit} onClick={handleCreate} type="button">
          <Plus size={18} aria-hidden />
          Create new room
        </button>

        <p className="status-line" role="status">
          {status}
        </p>
      </section>
    </main>
  );
}
