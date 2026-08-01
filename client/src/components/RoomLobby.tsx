import { FormEvent, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { User } from "../types";

type RoomLobbyProps = {
  user: User;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  onToggleTheme: () => void;
  status: string;
  theme: "light" | "dark";
};

const tools = [
  { glyph: "↖", active: false },
  { glyph: "✎", active: true },
  { glyph: "◻", active: false },
  { glyph: "◯", active: false },
  { glyph: "▤", active: false },
  { glyph: "T", active: false },
  { glyph: "⌫", active: false }
];

const features = [
  {
    id: "draw",
    eyebrow: "Draw",
    title: "A full toolset for live sketching",
    body: "Pencil, shapes, text, and eraser — synced stroke by stroke for everyone in the room."
  },
  {
    id: "organize",
    eyebrow: "Organize",
    title: "Multi-page boards",
    body: "Switch between pages from a sidebar, each with its own grid, ruled, or blank background."
  },
  {
    id: "moderate",
    eyebrow: "Moderate",
    title: "Roles built for classrooms",
    body: "Owner, editor, and viewer permissions, plus lock, mute, and follow-presenter controls."
  }
];

const steps = [
  { n: "01", t: "Create or join", d: "Pick a display name and either spin up a room or drop in a code." },
  { n: "02", t: "Draw together", d: "Everyone's strokes, notes, and cursors sync live on one canvas." },
  { n: "03", t: "Wrap up", d: "Export the page as PNG, or pick up the same board again next time." }
];

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

  function handleCreate() {
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
    <main className="landing-shell">
      <div className="landing-nav-wrap">
        <nav className="landing-nav">
          <span className="brand-wordmark">SketchSpace</span>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </div>
          <button className="landing-theme-toggle" onClick={onToggleTheme} title="Toggle theme" type="button">
            {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
        </nav>
      </div>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow-tag">Real-time whiteboard</span>
          <h1 id="app-title">Sketch it out, together.</h1>
          <p className="intro">
            Four seats. One shared canvas. Quick sketches that move in real time.
          </p>

          <form className="hero-form" onSubmit={handleJoin}>
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
              <button className="primary-button" disabled={!canSubmit || roomCode.trim().length < 3} type="submit">
                Join
              </button>
            </div>

            <div className="or-divider">
              <span />
              or
              <span />
            </div>

            <button className="secondary-button full-width" disabled={!canSubmit} onClick={handleCreate} type="button">
              + Create a new board
            </button>

            {status ? (
              <p className="status-line" role="status">
                {status}
              </p>
            ) : null}
          </form>
        </div>

        <div className="hero-preview" aria-hidden>
          <svg className="hero-preview-arc" viewBox="0 0 700 140">
            <path d="M20 100 Q220 -20 420 60 T700 30" />
          </svg>
          <div className="preview-frame">
            <div className="preview-titlebar">
              <span className="preview-dot orange" />
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-titlebar-label">Board / friday-jam</span>
            </div>
            <div className="preview-canvas">
              <div className="preview-note note-yellow">
                Kickoff notes
                <br />
                <span>— Razy</span>
              </div>
              <div className="preview-note note-green">Bring snacks</div>
              <div className="preview-note note-orange">Vote on the logo</div>
              <div className="preview-pill">Ready for review</div>
              <span className="preview-ring" />
              <div className="preview-cursor cursor-ink">
                <span className="cursor-caret" />
                <span className="cursor-label">Aanya</span>
              </div>
              <div className="preview-cursor cursor-blue">
                <span className="cursor-caret" />
                <span className="cursor-label">Kabir</span>
              </div>
            </div>
            <div className="preview-toolbar">
              {tools.map((tool, index) => (
                <span className={tool.active ? "preview-tool active" : "preview-tool"} key={index}>
                  {tool.glyph}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        {features.map((feature) => (
          <div className="feature-card" key={feature.id}>
            <span className="eyebrow-tag">{feature.eyebrow}</span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="landing-how" id="how">
        <h2>How it works</h2>
        <div className="how-steps">
          {steps.map((step) => (
            <div className="how-step" key={step.n}>
              <span className="step-number">{step.n}</span>
              <h4>{step.t}</h4>
              <p>{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-headline">Four seats or forty — the canvas is always shared.</div>
        <button className="secondary-button" disabled={!canSubmit} onClick={handleCreate} type="button">
          Start a board
        </button>
        <div className="footer-bottom">
          <span>© 2026 SketchSpace</span>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
