import { PointerEvent, useEffect, useRef, useState } from "react";
import { drawBoardTemplate } from "../boardTemplates";
import type { BoardTemplate, DrawingSettings, Point, Stroke } from "../types";

type CanvasStageProps = {
  roomCode: string;
  pageId: string;
  userId: string;
  settings: DrawingSettings;
  textRequestId: number;
  boardTemplate: BoardTemplate;
  canEdit: boolean;
  strokes: Stroke[];
  onStrokeStart: (stroke: Stroke) => void;
  onStrokeChange: (stroke: Stroke) => void;
  onStrokeEnd: (stroke: Stroke) => void;
  onStrokeUpdate: (stroke: Stroke) => void;
  onTextSizeChange: (textSize: number) => void;
};

type TextDraft = {
  point: Point;
  size: {
    width: number;
    height: number;
  };
  value: string;
};

type StrokeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ResizeHandle = "nw" | "ne" | "sw" | "se";

const imageCache = new Map<string, HTMLImageElement>();
const DEFAULT_TEXT_BOX = {
  height: 0.12,
  width: 0.34
};
const MIN_TEXT_BOX = {
  height: 0.055,
  width: 0.12
};

function createStrokeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  };
}

function getTextBoxEndPoint(start: Point, size = DEFAULT_TEXT_BOX): Point {
  return {
    x: clamp(start.x + size.width, 0.04, 0.98),
    y: clamp(start.y + size.height, 0.04, 0.98)
  };
}

function getTextDraftFromPoints(start: Point, current: Point): Pick<TextDraft, "point" | "size"> {
  const minX = clamp(Math.min(start.x, current.x), 0, 0.98);
  const minY = clamp(Math.min(start.y, current.y), 0, 0.98);
  const rawWidth = Math.abs(current.x - start.x);
  const rawHeight = Math.abs(current.y - start.y);

  return {
    point: { x: minX, y: minY },
    size: {
      width: Math.min(0.98 - minX, Math.max(MIN_TEXT_BOX.width, rawWidth)),
      height: Math.min(0.98 - minY, Math.max(MIN_TEXT_BOX.height, rawHeight))
    }
  };
}

function clampTextSize(size: number) {
  return Math.min(72, Math.max(10, size));
}

function getTextToolbarTransform(point: Point) {
  return point.y < 0.12 ? "translateY(8px)" : "translateY(calc(-100% - 8px))";
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number
) {
  const paragraphs = text.split("\n");
  let currentY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    if (words.length === 0) {
      currentY += lineHeight;
      continue;
    }

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;

      if (context.measureText(testLine).width > maxWidth && line) {
        if (currentY + lineHeight > y + maxHeight) {
          return;
        }

        context.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line && currentY + lineHeight <= y + maxHeight) {
      context.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  }
}

function drawStroke(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, stroke: Stroke) {
  if (stroke.points.length === 0) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.size * (canvas.width / canvas.clientWidth);

  if (stroke.tool === "eraser") {
    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = "rgba(0, 0, 0, 1)";
  } else {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = stroke.color;
  }

  const firstPoint = stroke.points[0];
  const lastPoint = stroke.points[stroke.points.length - 1];
  const startX = firstPoint.x * canvas.width;
  const startY = firstPoint.y * canvas.height;
  const endX = lastPoint.x * canvas.width;
  const endY = lastPoint.y * canvas.height;

  if (stroke.tool === "image") {
    const image = stroke.imageSrc ? imageCache.get(stroke.imageSrc) : undefined;

    if (image?.complete && image.naturalWidth > 0) {
      context.drawImage(image, startX, startY, endX - startX, endY - startY);
      context.strokeStyle = "rgba(22, 32, 51, 0.12)";
      context.lineWidth = 1;
      context.strokeRect(startX, startY, endX - startX, endY - startY);
    }

    context.restore();
    return;
  }

  if (stroke.tool === "text") {
    const boxEndPoint = stroke.points[1] ?? getTextBoxEndPoint(firstPoint);
    const fontSize = Math.max(10, stroke.size) * (canvas.width / canvas.clientWidth);
    const lineHeight = fontSize * 1.28;
    const boxWidth = Math.max(40, (boxEndPoint.x - firstPoint.x) * canvas.width);
    const boxHeight = Math.max(lineHeight, (boxEndPoint.y - firstPoint.y) * canvas.height);
    context.fillStyle = stroke.color;
    context.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
    context.textBaseline = "top";
    drawWrappedText(context, stroke.text ?? "", startX, startY, boxWidth, boxHeight, lineHeight);
    context.restore();
    return;
  }

  if (stroke.tool === "line") {
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    context.restore();
    return;
  }

  if (stroke.tool === "rectangle") {
    context.strokeRect(startX, startY, endX - startX, endY - startY);
    context.restore();
    return;
  }

  if (stroke.tool === "circle") {
    const centerX = startX + (endX - startX) / 2;
    const centerY = startY + (endY - startY) / 2;
    const radiusX = Math.abs(endX - startX) / 2;
    const radiusY = Math.abs(endY - startY) / 2;
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    return;
  }

  context.beginPath();
  context.moveTo(startX, startY);

  if (stroke.points.length === 1) {
    context.lineTo(firstPoint.x * canvas.width + 0.1, firstPoint.y * canvas.height + 0.1);
  }

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x * canvas.width, point.y * canvas.height);
  }

  context.stroke();
  context.restore();
}

function getStrokeBounds(stroke: Stroke): StrokeBounds {
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function getStrokeVisualBounds(stroke: Stroke, canvas: HTMLCanvasElement | null): StrokeBounds {
  const bounds = getStrokeBounds(stroke);
  const brushPadding = canvas ? Math.max(0.008, stroke.size / Math.max(canvas.clientWidth, canvas.clientHeight)) : 0.012;

  if (stroke.tool === "text") {
    const endPoint = stroke.points[1] ?? getTextBoxEndPoint(stroke.points[0]);

    return {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: clamp(endPoint.x),
      maxY: clamp(endPoint.y)
    };
  }

  if (stroke.tool === "image") {
    return bounds;
  }

  return {
    minX: clamp(bounds.minX - brushPadding),
    minY: clamp(bounds.minY - brushPadding),
    maxX: clamp(bounds.maxX + brushPadding),
    maxY: clamp(bounds.maxY + brushPadding)
  };
}

function isPointInStroke(stroke: Stroke, point: Point, canvas: HTMLCanvasElement) {
  if (stroke.points.length === 0) {
    return false;
  }

  const bounds = getStrokeVisualBounds(stroke, canvas);
  const tolerance = Math.max(0.018, stroke.size / Math.max(canvas.clientWidth, canvas.clientHeight));

  return (
    point.x >= bounds.minX - tolerance &&
    point.x <= bounds.maxX + tolerance &&
    point.y >= bounds.minY - tolerance &&
    point.y <= bounds.maxY + tolerance
  );
}

function translateStroke(stroke: Stroke, deltaX: number, deltaY: number) {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({
      x: clamp(point.x + deltaX),
      y: clamp(point.y + deltaY)
    }))
  };
}

function getResizeAnchor(bounds: StrokeBounds, handle: ResizeHandle): Point {
  if (handle === "nw") {
    return { x: bounds.maxX, y: bounds.maxY };
  }

  if (handle === "ne") {
    return { x: bounds.minX, y: bounds.maxY };
  }

  if (handle === "sw") {
    return { x: bounds.maxX, y: bounds.minY };
  }

  return { x: bounds.minX, y: bounds.minY };
}

function scaleStroke(stroke: Stroke, handle: ResizeHandle, point: Point, canvas: HTMLCanvasElement): Stroke {
  const bounds = getStrokeVisualBounds(stroke, canvas);
  const anchor = getResizeAnchor(bounds, handle);
  const originalWidth = Math.max(0.001, bounds.maxX - bounds.minX);
  const originalHeight = Math.max(0.001, bounds.maxY - bounds.minY);
  const nextWidth = Math.max(0.015, Math.abs(point.x - anchor.x));
  const nextHeight = Math.max(0.015, Math.abs(point.y - anchor.y));
  const scaleX = nextWidth / originalWidth;
  const scaleY = nextHeight / originalHeight;

  return {
    ...stroke,
    points: stroke.points.map((strokePoint) => ({
      x: clamp(anchor.x + (strokePoint.x - anchor.x) * scaleX),
      y: clamp(anchor.y + (strokePoint.y - anchor.y) * scaleY)
    }))
  };
}

export function CanvasStage({
  roomCode,
  pageId,
  userId,
  settings,
  textRequestId,
  boardTemplate,
  canEdit,
  strokes,
  onStrokeStart,
  onStrokeChange,
  onStrokeEnd,
  onStrokeUpdate,
  onTextSizeChange
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const movingStrokeRef = useRef<{ stroke: Stroke; lastPoint: Point } | null>(null);
  const resizingStrokeRef = useRef<{ stroke: Stroke; handle: ResizeHandle } | null>(null);
  const creatingTextBoxRef = useRef<{ start: Point } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const ignoreNextTextBlurRef = useRef(false);
  const lastTextRequestRef = useRef(textRequestId);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCreatingTextBox, setIsCreatingTextBox] = useState(false);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const selectedStroke = selectedStrokeId ? strokes.find((stroke) => stroke.id === selectedStrokeId) ?? null : null;
  const selectedBounds =
    selectedStroke && canvasRef.current ? getStrokeVisualBounds(selectedStroke, canvasRef.current) : null;
  const canvasClassName =
    settings.tool === "select"
      ? "drawing-canvas select-mode"
      : settings.tool === "text"
        ? "drawing-canvas text-mode"
        : "drawing-canvas";

  useEffect(() => {
    const canvas = canvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;

    if (!canvas || !backgroundCanvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const width = Math.floor(rect.width * scale);
      const height = Math.floor(rect.height * scale);
      canvas.width = width;
      canvas.height = height;
      backgroundCanvas.width = width;
      backgroundCanvas.height = height;
      setCanvasVersion((version) => version + 1);
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const context = backgroundCanvas?.getContext("2d");

    if (!backgroundCanvas || !context) {
      return;
    }

    drawBoardTemplate(context, backgroundCanvas.width, backgroundCanvas.height, boardTemplate);
  }, [boardTemplate, canvasVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    // The strokes canvas stays transparent so eraser strokes (drawn with
    // destination-out compositing) punch real holes that reveal the
    // background canvas underneath, instead of painting over it.
    context.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => drawStroke(context, canvas, stroke));
  }, [strokes, canvasVersion]);

  useEffect(() => {
    if (textDraft) {
      textInputRef.current?.focus();
    }
  }, [textDraft]);

  useEffect(() => {
    if (lastTextRequestRef.current === textRequestId) {
      return;
    }

    lastTextRequestRef.current = textRequestId;

    if (!canEdit || settings.tool !== "text") {
      return;
    }

    setSelectedStrokeId(null);
    setTextDraft(null);
  }, [canEdit, settings.tool, textRequestId]);

  useEffect(() => {
    strokes.forEach((stroke) => {
      if (stroke.tool !== "image" || !stroke.imageSrc || imageCache.has(stroke.imageSrc)) {
        return;
      }

      const image = new Image();
      image.onload = () => setCanvasVersion((version) => version + 1);
      image.src = stroke.imageSrc;
      imageCache.set(stroke.imageSrc, image);
    });
  }, [strokes]);

  useEffect(() => {
    if (selectedStrokeId && !strokes.some((stroke) => stroke.id === selectedStrokeId)) {
      setSelectedStrokeId(null);
    }
  }, [selectedStrokeId, strokes]);

  function commitTextDraft() {
    const canvas = canvasRef.current;
    if (!textDraft) {
      return;
    }

    const text = textDraft.value.trim();
    const nextSize = { ...textDraft.size };

    if (canvas && textEditorRef.current) {
      const canvasRect = canvas.getBoundingClientRect();
      const editorRect = textEditorRef.current.getBoundingClientRect();

      nextSize.width = clamp(editorRect.width / canvasRect.width, 0.12, 0.86);
      nextSize.height = clamp(editorRect.height / canvasRect.height, 0.06, 0.5);
    }

    setTextDraft(null);

    if (!text) {
      return;
    }

    const stroke: Stroke = {
      id: createStrokeId(),
      roomCode,
      pageId,
      userId,
      tool: "text",
      color: settings.color,
      size: settings.textSize,
      points: [textDraft.point, getTextBoxEndPoint(textDraft.point, nextSize)],
      text
    };

    onStrokeStart(stroke);
    onStrokeEnd(stroke);
  }

  function cancelTextDraft() {
    setTextDraft(null);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(canvas, event);

    if (!canEdit) {
      return;
    }

    if (settings.tool === "select") {
      const selectedStroke = [...strokes]
        .reverse()
        .find((stroke) => stroke.userId === userId && isPointInStroke(stroke, point, canvas));

      if (selectedStroke) {
        setSelectedStrokeId(selectedStroke.id);
        movingStrokeRef.current = { stroke: selectedStroke, lastPoint: point };
        setIsMoving(true);
      } else {
        setSelectedStrokeId(null);
      }

      return;
    }

    if (settings.tool === "text") {
      commitTextDraft();
      creatingTextBoxRef.current = { start: point };
      setIsCreatingTextBox(true);
      setTextDraft({ point, size: MIN_TEXT_BOX, value: "" });
      setSelectedStrokeId(null);
      return;
    }

    const stroke: Stroke = {
      id: createStrokeId(),
      roomCode,
      pageId,
      userId,
      tool: settings.tool,
      color: settings.color,
      size: settings.size,
      points: [point]
    };

    activeStrokeRef.current = stroke;
    setSelectedStrokeId(null);
    setIsDrawing(true);
    onStrokeStart(stroke);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const activeStroke = activeStrokeRef.current;

    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event);

    if (isMoving && movingStrokeRef.current) {
      const deltaX = point.x - movingStrokeRef.current.lastPoint.x;
      const deltaY = point.y - movingStrokeRef.current.lastPoint.y;
      const movedStroke = translateStroke(movingStrokeRef.current.stroke, deltaX, deltaY);

      movingStrokeRef.current = { stroke: movedStroke, lastPoint: point };
      setSelectedStrokeId(movedStroke.id);
      onStrokeUpdate(movedStroke);
      return;
    }

    if (isResizing && resizingStrokeRef.current) {
      const resizedStroke = scaleStroke(
        resizingStrokeRef.current.stroke,
        resizingStrokeRef.current.handle,
        point,
        canvas
      );

      resizingStrokeRef.current = { ...resizingStrokeRef.current, stroke: resizedStroke };
      setSelectedStrokeId(resizedStroke.id);
      onStrokeUpdate(resizedStroke);
      return;
    }

    if (isCreatingTextBox && creatingTextBoxRef.current) {
      const draftBox = getTextDraftFromPoints(creatingTextBoxRef.current.start, point);
      setTextDraft((currentDraft) => ({ ...draftBox, value: currentDraft?.value ?? "" }));
      return;
    }

    if (!activeStroke || !isDrawing) {
      return;
    }

    const nextStroke = {
      ...activeStroke,
      points:
        activeStroke.tool === "pencil" || activeStroke.tool === "eraser"
          ? [...activeStroke.points, point]
          : [activeStroke.points[0], point]
    };

    activeStrokeRef.current = nextStroke;
    onStrokeChange(nextStroke);
  }

  function finishStroke(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const activeStroke = activeStrokeRef.current;

    if (!canvas) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (isMoving) {
      movingStrokeRef.current = null;
      setIsMoving(false);
      return;
    }

    if (isResizing) {
      resizingStrokeRef.current = null;
      setIsResizing(false);
      return;
    }

    if (isCreatingTextBox) {
      creatingTextBoxRef.current = null;
      setIsCreatingTextBox(false);
      window.requestAnimationFrame(() => textInputRef.current?.focus());
      return;
    }

    if (!activeStroke) {
      return;
    }

    activeStrokeRef.current = null;
    setIsDrawing(false);
    onStrokeEnd(activeStroke);
  }

  function startResize(handle: ResizeHandle, event: PointerEvent<HTMLButtonElement>) {
    if (!selectedStroke) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    resizingStrokeRef.current = { stroke: selectedStroke, handle };
    setIsResizing(true);
  }

  function resizeSelectedStroke(event: PointerEvent<HTMLButtonElement>) {
    const canvas = canvasRef.current;

    if (!canvas || !isResizing || !resizingStrokeRef.current) {
      return;
    }

    const point = getCanvasPoint(canvas, event as unknown as PointerEvent<HTMLCanvasElement>);
    const resizedStroke = scaleStroke(resizingStrokeRef.current.stroke, resizingStrokeRef.current.handle, point, canvas);

    resizingStrokeRef.current = { ...resizingStrokeRef.current, stroke: resizedStroke };
    setSelectedStrokeId(resizedStroke.id);
    onStrokeUpdate(resizedStroke);
  }

  function finishResize(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resizingStrokeRef.current = null;
    setIsResizing(false);
  }

  return (
    <div className="canvas-wrap">
      <canvas aria-hidden className="background-canvas" ref={backgroundCanvasRef} />
      <canvas
        aria-label="Shared drawing canvas"
        className={canvasClassName}
        onPointerCancel={finishStroke}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        ref={canvasRef}
      />
      {settings.tool === "select" && selectedBounds ? (
        <div
          aria-hidden
          className="selection-boundary"
          style={{
            height: `${(selectedBounds.maxY - selectedBounds.minY) * 100}%`,
            left: `${selectedBounds.minX * 100}%`,
            top: `${selectedBounds.minY * 100}%`,
            width: `${(selectedBounds.maxX - selectedBounds.minX) * 100}%`
          }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((handle) => (
            <button
              className={`resize-handle ${handle}`}
              key={handle}
              onPointerCancel={finishResize}
              onPointerDown={(event) => startResize(handle, event)}
              onPointerMove={resizeSelectedStroke}
              onPointerUp={finishResize}
              type="button"
            />
          ))}
        </div>
      ) : null}
      {textDraft ? (
        <>
          <textarea
            aria-label="Canvas text"
            className={isCreatingTextBox ? "canvas-text-editor creating" : "canvas-text-editor"}
            maxLength={420}
            onBlur={() => {
              if (ignoreNextTextBlurRef.current) {
                ignoreNextTextBlurRef.current = false;
                return;
              }

              commitTextDraft();
            }}
            onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.ctrlKey) {
                event.preventDefault();
                commitTextDraft();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                cancelTextDraft();
              }
            }}
            placeholder="Type text"
            ref={(node) => {
              textInputRef.current = node;
              textEditorRef.current = node;
            }}
            style={{
              color: settings.color,
              fontSize: `${settings.textSize}px`,
              height: `${textDraft.size.height * 100}%`,
              left: `${textDraft.point.x * 100}%`,
              top: `${textDraft.point.y * 100}%`,
              width: `${textDraft.size.width * 100}%`
            }}
            value={textDraft.value}
          />
          <div
            className="text-size-popover"
            onMouseDown={() => {
              ignoreNextTextBlurRef.current = true;
            }}
            style={{
              left: `${textDraft.point.x * 100}%`,
              top: `${textDraft.point.y * 100}%`,
              transform: getTextToolbarTransform(textDraft.point)
            }}
            aria-label="Text size controls"
          >
            <button
              aria-label="Decrease text size"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onTextSizeChange(clampTextSize(settings.textSize - 2))}
              type="button"
            >
              A-
            </button>
            <label>
              <span className="visually-hidden">Font size</span>
              <input
                aria-label="Font size"
                max={72}
                min={10}
                onChange={(event) => onTextSizeChange(clampTextSize(Number(event.target.value)))}
                type="number"
                value={settings.textSize}
              />
            </label>
            <button
              aria-label="Increase text size"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onTextSizeChange(clampTextSize(settings.textSize + 2))}
              type="button"
            >
              A+
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
