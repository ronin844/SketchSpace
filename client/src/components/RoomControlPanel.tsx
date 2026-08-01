import { Lock } from "lucide-react";
import type { RoomPermissions } from "../types";

type RoomControlPanelProps = {
  isHost: boolean;
  onClose: () => void;
  onUpdateSettings: (updates: { permissions?: Partial<RoomPermissions> }) => void;
  permissions: RoomPermissions;
};

export function RoomControlPanel({ isHost, onClose, onUpdateSettings, permissions }: RoomControlPanelProps) {
  const rows: Array<{ icon?: typeof Lock; key: keyof RoomPermissions; label: string }> = [
    { key: "studentsCanDraw", label: "Viewer editing" },
    { key: "chatMuted", label: "Mute viewer chat" },
    { key: "raiseHandEnabled", label: "Request attention" },
    { key: "followTeacherView", label: "Follow presenter" },
    { key: "roomLocked", label: "Lock room", icon: Lock }
  ];

  return (
    <section aria-label="Room settings" className="room-settings-popover">
      <p className="room-settings-title">Room settings</p>
      {rows.map((row) => {
        const Icon = row.icon;

        return (
          <label className="room-settings-row" key={row.key}>
            <span>
              {Icon ? <Icon size={13} aria-hidden /> : null}
              {row.label}
            </span>
            <span className="rb-switch">
              <input
                checked={permissions[row.key]}
                disabled={!isHost}
                onChange={(event) => onUpdateSettings({ permissions: { [row.key]: event.target.checked } })}
                type="checkbox"
              />
              <span aria-hidden className="rb-switch-track" />
            </span>
          </label>
        );
      })}
      <div className="room-settings-footer">
        <button onClick={onClose} type="button">
          Close
        </button>
      </div>
    </section>
  );
}
