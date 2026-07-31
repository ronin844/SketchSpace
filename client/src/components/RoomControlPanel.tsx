import { Lock, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { RoomPermissions, UserRole } from "../types";

type RoomControlPanelProps = {
  currentRole: UserRole;
  isHost: boolean;
  onUpdateSettings: (updates: { roomTitle?: string; permissions?: Partial<RoomPermissions> }) => void;
  permissions: RoomPermissions;
  roomTitle: string;
};

const roleLabels: Record<UserRole, string> = {
  host: "Owner",
  editor: "Editor",
  viewer: "Viewer"
};

export function RoomControlPanel({
  currentRole,
  isHost,
  onUpdateSettings,
  permissions,
  roomTitle
}: RoomControlPanelProps) {
  return (
    <section className="room-control-panel" aria-label="Room controls">
      <div className="room-title-field">
        <label htmlFor="room-title">Board name</label>
        <input
          disabled={!isHost}
          id="room-title"
          maxLength={64}
          onBlur={(event) => onUpdateSettings({ roomTitle: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          placeholder="Untitled Board"
          defaultValue={roomTitle}
        />
      </div>

      <div className="role-summary" aria-label="Your role">
        <ShieldCheck size={18} aria-hidden />
        <span>{roleLabels[currentRole]}</span>
      </div>

      <details className="settings-dropdown">
        <summary aria-label="Open room settings">
          <SlidersHorizontal size={17} aria-hidden />
          Room settings
        </summary>
        <div className="permission-grid" aria-label="Room permissions">
          <label>
            <input
              checked={permissions.studentsCanDraw}
              disabled={!isHost}
              onChange={(event) => onUpdateSettings({ permissions: { studentsCanDraw: event.target.checked } })}
              type="checkbox"
            />
            Viewer editing
          </label>
          <label>
            <input
              checked={permissions.chatMuted}
              disabled={!isHost}
              onChange={(event) => onUpdateSettings({ permissions: { chatMuted: event.target.checked } })}
              type="checkbox"
            />
            Mute viewer chat
          </label>
          <label>
            <input
              checked={permissions.raiseHandEnabled}
              disabled={!isHost}
              onChange={(event) => onUpdateSettings({ permissions: { raiseHandEnabled: event.target.checked } })}
              type="checkbox"
            />
            Request attention
          </label>
          <label>
            <input
              checked={permissions.followTeacherView}
              disabled={!isHost}
              onChange={(event) => onUpdateSettings({ permissions: { followTeacherView: event.target.checked } })}
              type="checkbox"
            />
            Follow presenter view
          </label>
          <label>
            <input
              checked={permissions.roomLocked}
              disabled={!isHost}
              onChange={(event) => onUpdateSettings({ permissions: { roomLocked: event.target.checked } })}
              type="checkbox"
            />
            <Lock size={14} aria-hidden />
            Lock room
          </label>
        </div>
      </details>
    </section>
  );
}
