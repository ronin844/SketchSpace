import { Users } from "lucide-react";
import type { User } from "../types";

const MAX_PLAYERS = 4;

type ParticipantListProps = {
  participants: User[];
  currentUserId: string;
};

export function ParticipantList({ participants, currentUserId }: ParticipantListProps) {
  return (
    <section className="participants" aria-label="Participants">
      <div className="participants-heading">
        <Users size={18} aria-hidden />
        <span>
          {participants.length}/{MAX_PLAYERS} players
        </span>
      </div>
      <div className="participant-list">
        {participants.map((participant) => (
          <div className="participant" key={participant.id}>
            <span className="avatar-dot" style={{ backgroundColor: participant.color }} />
            <span>{participant.id === currentUserId ? `${participant.name} (you)` : participant.name}</span>
            <small>{participant.role === "host" ? "Host" : participant.role === "editor" ? "Editor" : "Viewer"}</small>
          </div>
        ))}
        {participants.length < MAX_PLAYERS ? (
          <div className="waiting-slot">
            Waiting for {MAX_PLAYERS - participants.length} more{" "}
            {MAX_PLAYERS - participants.length === 1 ? "player" : "players"}
          </div>
        ) : null}
      </div>
    </section>
  );
}
