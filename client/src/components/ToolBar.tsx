import {
  Axis3d,
  Brush,
  Circle,
  Eraser,
  ImagePlus,
  Minus,
  MousePointer2,
  NotebookText,
  RotateCcw,
  RotateCw,
  Rows3,
  Square,
  Trash2,
  Type
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

const colors = ["#162033", "#f26d55", "#0d9488", "#2563eb", "#d99a16"];

const templates: Array<{
  icon: typeof Square;
  label: string;
  value: BoardTemplate;
}> = [
  { icon: Square, label: "Blank board", value: "plain" },
  { icon: NotebookText, label: "Graph grid", value: "grid" },
  { icon: Rows3, label: "Ruled paper", value: "ruled" },
  { icon: Axis3d, label: "Coordinate axes", value: "axes" }
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
    <aside className="toolbar" aria-label="Drawing tools">
      <div className="tool-group segmented" role="group" aria-label="Tool">
        <button
          aria-pressed={settings.tool === "select"}
          className={settings.tool === "select" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("select")}
          title="Select and move"
          type="button"
        >
          <MousePointer2 size={19} aria-hidden />
        </button>
        <button
          aria-pressed={settings.tool === "pencil"}
          className={settings.tool === "pencil" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("pencil")}
          title="Pencil"
          type="button"
        >
          <Brush size={19} aria-hidden />
        </button>
        <button
          aria-pressed={settings.tool === "eraser"}
          className={settings.tool === "eraser" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("eraser")}
          title="Eraser"
          type="button"
        >
          <Eraser size={19} aria-hidden />
        </button>
        <button
          aria-pressed={settings.tool === "line"}
          className={settings.tool === "line" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("line")}
          title="Line"
          type="button"
        >
          <Minus size={19} aria-hidden />
        </button>
        <button
          aria-pressed={settings.tool === "rectangle"}
          className={settings.tool === "rectangle" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("rectangle")}
          title="Rectangle"
          type="button"
        >
          <Square size={19} aria-hidden />
        </button>
        <button
          aria-pressed={settings.tool === "circle"}
          className={settings.tool === "circle" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("circle")}
          title="Circle"
          type="button"
        >
          <Circle size={19} aria-hidden />
        </button>
        <button
          aria-pressed={settings.tool === "text"}
          className={settings.tool === "text" ? "icon-button active" : "icon-button"}
          disabled={disabled}
          onClick={() => setTool("text")}
          title="Text"
          type="button"
        >
          <Type size={19} aria-hidden />
        </button>
        <button
          className="icon-button"
          disabled={disabled}
          onClick={onImportImage}
          title="Import image"
          type="button"
        >
          <ImagePlus size={19} aria-hidden />
        </button>
      </div>

      <div className="tool-group template-control" role="group" aria-label="Board template">
        {templates.map((template) => {
          const Icon = template.icon;

          return (
            <button
              aria-pressed={boardTemplate === template.value}
              className={boardTemplate === template.value ? "template-button active" : "template-button"}
              disabled={disabled}
              key={template.value}
              onClick={() => onBoardTemplateChange(template.value)}
              title={template.label}
              type="button"
            >
              <Icon size={16} aria-hidden />
              <span>{template.label.replace(" board", "").replace(" paper", "")}</span>
            </button>
          );
        })}
      </div>

      <div className="tool-group color-control" aria-label="Colors">
        <label className="range-label" htmlFor="custom-color">
          Color
          <span>{settings.color.toUpperCase()}</span>
        </label>
        <div className="color-picker-row">
          <div className="spectrum-picker">
            <input
              aria-label="Choose custom color"
              className="color-input"
              disabled={disabled}
              id="custom-color"
              onChange={(event) => setColor(event.target.value)}
              title="Choose custom color"
              type="color"
              value={settings.color}
            />
          </div>
          <span className="color-preview" style={{ backgroundColor: settings.color }} />
        </div>
        <div className="swatches" aria-label="Quick colors">
          {colors.map((color) => (
            <button
              aria-label={`Use color ${color}`}
              className={settings.color === color ? "swatch active-swatch" : "swatch"}
              disabled={disabled}
              key={color}
              onClick={() => setColor(color)}
              style={{ backgroundColor: color }}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="tool-group size-control">
        <label className="range-label" htmlFor="brush-size">
          {settings.tool === "text" ? "Font" : "Size"}
          <span>{sizeValue}px</span>
        </label>
        <div className="brush-preview" aria-hidden>
          <span
            style={{
              backgroundColor: settings.tool === "eraser" || settings.tool === "select" ? "#ffffff" : settings.color,
              height: `${Math.max(6, Math.min(sizeValue, 30))}px`,
              width: `${Math.max(6, Math.min(sizeValue, 30))}px`
            }}
          />
        </div>
        <input
          id="brush-size"
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

      <div className="tool-group toolbar-actions">
        <button className="icon-button" disabled={disabled || !canUndo} onClick={onUndo} title="Undo last stroke" type="button">
          <RotateCcw size={19} aria-hidden />
        </button>
        <button className="icon-button" disabled={disabled || !canRedo} onClick={onRedo} title="Redo stroke" type="button">
          <RotateCw size={19} aria-hidden />
        </button>
        <button
          aria-label="Clear all board content"
          className="danger-button clear-all-button"
          disabled={disabled}
          onClick={onClear}
          title="Clear all board content"
          type="button"
        >
          <Trash2 size={19} aria-hidden />
          <span>Clear all</span>
        </button>
      </div>
    </aside>
  );
}
