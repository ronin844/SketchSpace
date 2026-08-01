import {
  Axis3d,
  Brush,
  Circle,
  Eraser,
  ImagePlus,
  Minus,
  MousePointer2,
  Redo2,
  Rows3,
  Square,
  Trash2,
  Type,
  Undo2
} from "lucide-react";
import type { BoardTemplate, DrawingSettings, Tool } from "../types";

type ToolBarProps = {
  settings: DrawingSettings;
  canUndo: boolean;
  canRedo: boolean;
  boardTemplate: BoardTemplate;
  disabled?: boolean;
  onBoardTemplateChange: (boardTemplate: BoardTemplate) => void;
  onImportImage: () => void;
  onTextToolRequest: () => void;
  onSettingsChange: (settings: DrawingSettings) => void;
  onClear: () => void;
  onRedo: () => void;
  onUndo: () => void;
};

const colors = ["#141413", "#f26d55", "#0d9488", "#2563eb", "#d99a16"];

const templates: Array<{
  glyph: string;
  label: string;
  value: BoardTemplate;
}> = [
  { glyph: "▢", label: "Blank", value: "plain" },
  { glyph: "▦", label: "Graph grid", value: "grid" },
  { glyph: "☰", label: "Ruled", value: "ruled" },
  { glyph: "✛", label: "Axes", value: "axes" }
];

const tools: Array<{ icon: typeof Square; label: string; value: Tool }> = [
  { icon: MousePointer2, label: "Select and move", value: "select" },
  { icon: Brush, label: "Pencil", value: "pencil" },
  { icon: Eraser, label: "Eraser", value: "eraser" },
  { icon: Minus, label: "Line", value: "line" },
  { icon: Square, label: "Rectangle", value: "rectangle" },
  { icon: Circle, label: "Circle", value: "circle" },
  { icon: Type, label: "Text", value: "text" }
];

export function ToolBar({
  settings,
  canUndo,
  canRedo,
  boardTemplate,
  disabled = false,
  onBoardTemplateChange,
  onImportImage,
  onTextToolRequest,
  onSettingsChange,
  onClear,
  onRedo,
  onUndo
}: ToolBarProps) {
  const sizeValue = settings.tool === "text" ? settings.textSize : settings.size;

  function setTool(tool: Tool) {
    onSettingsChange({ ...settings, tool });

    if (tool === "text") {
      onTextToolRequest();
    }
  }

  function setColor(color: string) {
    onSettingsChange({
      ...settings,
      color,
      tool: settings.tool === "eraser" || settings.tool === "select" ? "pencil" : settings.tool
    });
  }

  return (
    <>
      <div className="floating-settings-panel" aria-label="Board settings">
        <div className="settings-group">
          <p className="settings-group-label">Background</p>
          <div className="settings-circle-row" role="group" aria-label="Board template">
            {templates.map((template) => (
              <button
                aria-label={template.label}
                aria-pressed={boardTemplate === template.value}
                className={boardTemplate === template.value ? "settings-circle-button active" : "settings-circle-button"}
                disabled={disabled}
                key={template.value}
                onClick={() => onBoardTemplateChange(template.value)}
                title={template.label}
                type="button"
              >
                {template.glyph}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-heading">
            <span className="settings-group-label">Color</span>
            <span className="settings-group-value">{settings.color.toUpperCase()}</span>
          </div>
          <div className="settings-color-row" aria-label="Colors">
            {colors.map((color) => (
              <button
                aria-label={`Use color ${color}`}
                className={settings.color === color ? "settings-swatch active" : "settings-swatch"}
                disabled={disabled}
                key={color}
                onClick={() => setColor(color)}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
            <span className="settings-custom-color">
              <input
                aria-label="Choose custom color"
                disabled={disabled}
                onChange={(event) => setColor(event.target.value)}
                title="Choose custom color"
                type="color"
                value={settings.color}
              />
            </span>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-heading">
            <span className="settings-group-label">{settings.tool === "text" ? "Font size" : "Size"}</span>
            <span className="settings-group-value">{sizeValue}px</span>
          </div>
          <input
            aria-label={settings.tool === "text" ? "Font size" : "Brush size"}
            max={settings.tool === "text" ? 72 : 48}
            min={settings.tool === "text" ? 10 : 2}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              onSettingsChange(
                settings.tool === "text" ? { ...settings, textSize: nextSize } : { ...settings, size: nextSize }
              );
            }}
            disabled={disabled}
            type="range"
            value={sizeValue}
          />
        </div>
      </div>

      <div className="floating-tool-dock" role="group" aria-label="Drawing tools">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              aria-label={tool.label}
              aria-pressed={settings.tool === tool.value}
              className={settings.tool === tool.value ? "dock-button active" : "dock-button"}
              disabled={disabled}
              key={tool.value}
              onClick={() => setTool(tool.value)}
              title={tool.label}
              type="button"
            >
              <Icon size={18} aria-hidden />
            </button>
          );
        })}
        <button className="dock-button" disabled={disabled} onClick={onImportImage} title="Import image" type="button">
          <ImagePlus size={18} aria-hidden />
        </button>
        <span className="dock-divider" aria-hidden />
        <button className="dock-button" disabled={disabled || !canUndo} onClick={onUndo} title="Undo last stroke" type="button">
          <Undo2 size={17} aria-hidden />
        </button>
        <button className="dock-button" disabled={disabled || !canRedo} onClick={onRedo} title="Redo stroke" type="button">
          <Redo2 size={17} aria-hidden />
        </button>
        <button
          aria-label="Clear all board content"
          className="dock-clear-button"
          disabled={disabled}
          onClick={onClear}
          title="Clear all board content"
          type="button"
        >
          <Trash2 size={16} aria-hidden />
          Clear all
        </button>
      </div>
    </>
  );
}
