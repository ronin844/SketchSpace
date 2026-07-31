type ShortcutsModalProps = {
  onClose: () => void;
  open: boolean;
};

const shortcuts = [
  ["P", "Pen"],
  ["E", "Eraser"],
  ["T", "Text"],
  ["V", "Select"],
  ["L", "Line"],
  ["R", "Rectangle"],
  ["C", "Circle"],
  ["Ctrl + Z", "Undo"],
  ["Ctrl + Y", "Redo"],
  ["Ctrl + S", "Save status"],
  ["+", "Zoom in"],
  ["-", "Zoom out"]
];

export function ShortcutsModal({ onClose, open }: ShortcutsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="shortcuts-modal" aria-label="Keyboard shortcuts" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <h2>Keyboard shortcuts</h2>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="shortcuts-grid">
          {shortcuts.map(([key, action]) => (
            <div className="shortcut-row" key={key}>
              <kbd>{key}</kbd>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
