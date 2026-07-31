import type { BoardTemplate } from "./types";

function drawLine(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

export function drawBoardTemplate(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: BoardTemplate
) {
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (template === "plain") {
    context.restore();
    return;
  }

  if (template === "grid" || template === "axes") {
    const minor = 32;
    const major = minor * 4;

    for (let x = 0; x <= width; x += minor) {
      context.strokeStyle = x % major === 0 ? "rgba(13, 148, 136, 0.18)" : "rgba(15, 23, 42, 0.06)";
      context.lineWidth = x % major === 0 ? 1.2 : 1;
      drawLine(context, x, 0, x, height);
    }

    for (let y = 0; y <= height; y += minor) {
      context.strokeStyle = y % major === 0 ? "rgba(13, 148, 136, 0.18)" : "rgba(15, 23, 42, 0.06)";
      context.lineWidth = y % major === 0 ? 1.2 : 1;
      drawLine(context, 0, y, width, y);
    }
  }

  if (template === "ruled") {
    const lineHeight = 42;
    context.strokeStyle = "rgba(37, 99, 235, 0.14)";
    context.lineWidth = 1;

    for (let y = lineHeight; y <= height; y += lineHeight) {
      drawLine(context, 0, y, width, y);
    }

    context.strokeStyle = "rgba(242, 109, 85, 0.22)";
    context.lineWidth = 1.5;
    drawLine(context, 82, 0, 82, height);
  }

  if (template === "axes") {
    const centerX = width / 2;
    const centerY = height / 2;
    context.strokeStyle = "rgba(22, 32, 51, 0.42)";
    context.lineWidth = 2;
    drawLine(context, centerX, 0, centerX, height);
    drawLine(context, 0, centerY, width, centerY);

    context.fillStyle = "rgba(22, 32, 51, 0.58)";
    context.font = "700 18px Inter, ui-sans-serif, system-ui, sans-serif";
    context.fillText("x", width - 24, centerY - 10);
    context.fillText("y", centerX + 10, 24);
  }

  context.restore();
}
