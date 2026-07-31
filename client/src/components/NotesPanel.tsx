import { Star } from "lucide-react";

type NotesPanelProps = {
  notes: string;
  onChange: (notes: string) => void;
};

export function NotesPanel({ notes, onChange }: NotesPanelProps) {
  const points = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <section className="notes-panel" aria-label="Session notes">
      <div className="participants-heading">
        <Star size={18} aria-hidden />
        Notes
      </div>
      <textarea
        aria-label="Session notes"
        maxLength={1800}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write lesson notes, formulas, action items, or important points..."
        value={notes}
      />
      <div className="important-points" aria-label="Important points">
        <strong>Important points</strong>
        {points.length ? (
          points.map((point) => <span key={point}>{point}</span>)
        ) : (
          <p>Add one point per line to build a quick lesson summary.</p>
        )}
      </div>
    </section>
  );
}
