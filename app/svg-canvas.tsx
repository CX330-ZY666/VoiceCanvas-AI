import type { CanvasElement } from "./canvas-data";
import { getElementLabel } from "./canvas-data";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

function getCenter(element: CanvasElement) {
  return {
    x: element.x,
    y: element.y
  };
}

function getLabelY(element: CanvasElement) {
  if (element.type === "circle") {
    return element.y - (element.radius ?? 45) - 16;
  }

  if (element.type === "rect" || element.type === "diamond") {
    return element.y - (element.height ?? 70) / 2 - 16;
  }

  return element.y - 28;
}

function renderShape(element: CanvasElement) {
  const label = `${getElementLabel(element)} ${element.id}`;
  const fill = element.color ?? "#9ca3af";
  const innerText = element.text;

  if (element.type === "circle") {
    return (
      <g key={element.id}>
        <circle
          cx={element.x}
          cy={element.y}
          fill={fill}
          r={element.radius ?? 45}
          stroke="#20242a"
          strokeWidth="2"
        />
        <text className="fill-canvas-ink text-[18px] font-bold" textAnchor="middle" x={element.x} y={getLabelY(element)}>
          {label}
        </text>
        {innerText ? (
          <text className="fill-white text-[17px] font-bold" textAnchor="middle" x={element.x} y={element.y + 6}>
            {innerText}
          </text>
        ) : null}
      </g>
    );
  }

  if (element.type === "rect") {
    const width = element.width ?? 120;
    const height = element.height ?? 70;

    return (
      <g key={element.id}>
        <rect
          fill={fill}
          height={height}
          rx="10"
          stroke="#20242a"
          strokeWidth="2"
          width={width}
          x={element.x - width / 2}
          y={element.y - height / 2}
        />
        <text className="fill-canvas-ink text-[18px] font-bold" textAnchor="middle" x={element.x} y={getLabelY(element)}>
          {label}
        </text>
        {innerText ? (
          <text className="fill-canvas-ink text-[17px] font-bold" textAnchor="middle" x={element.x} y={element.y + 6}>
            {innerText}
          </text>
        ) : null}
      </g>
    );
  }

  if (element.type === "diamond") {
    const width = element.width ?? 120;
    const height = element.height ?? 90;
    const points = [
      `${element.x},${element.y - height / 2}`,
      `${element.x + width / 2},${element.y}`,
      `${element.x},${element.y + height / 2}`,
      `${element.x - width / 2},${element.y}`
    ].join(" ");

    return (
      <g key={element.id}>
        <polygon fill={fill} points={points} stroke="#20242a" strokeWidth="2" />
        <text className="fill-canvas-ink text-[18px] font-bold" textAnchor="middle" x={element.x} y={getLabelY(element)}>
          {label}
        </text>
        {innerText ? (
          <text className="fill-canvas-ink text-[17px] font-bold" textAnchor="middle" x={element.x} y={element.y + 6}>
            {innerText}
          </text>
        ) : null}
      </g>
    );
  }

  if (element.type === "text") {
    return (
      <g key={element.id}>
        <text
          className="fill-canvas-ink text-[30px] font-bold"
          textAnchor="middle"
          x={element.x}
          y={element.y}
        >
          {element.text}
        </text>
        <text className="fill-canvas-muted text-[16px] font-bold" textAnchor="middle" x={element.x} y={getLabelY(element)}>
          {label}
        </text>
      </g>
    );
  }

  return null;
}

function renderArrow(element: CanvasElement, elements: CanvasElement[]) {
  const from = elements.find((item) => item.id === element.fromId);
  const to = elements.find((item) => item.id === element.toId);

  if (!from || !to) {
    return null;
  }

  const start = getCenter(from);
  const end = getCenter(to);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  return (
    <g key={element.id}>
      <line
        markerEnd="url(#arrowhead)"
        stroke={element.color ?? "#20242a"}
        strokeLinecap="round"
        strokeWidth="3"
        x1={start.x}
        x2={end.x}
        y1={start.y}
        y2={end.y}
      />
      <text
        className="fill-canvas-ink text-[16px] font-bold"
        textAnchor="middle"
        x={midX}
        y={midY - 14}
      >
        {getElementLabel(element)} {element.id}
      </text>
    </g>
  );
}

export function SvgCanvas({ elements }: Readonly<{ elements: CanvasElement[] }>) {
  const arrows = elements.filter((element) => element.type === "arrow");
  const shapes = elements.filter((element) => element.type !== "arrow");

  return (
    <div className="overflow-hidden rounded bg-white">
      <svg
        aria-label="VoiceCanvas AI SVG canvas preview"
        className="block aspect-[3/2] min-h-[320px] w-full"
        role="img"
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      >
        <defs>
          <pattern height="30" id="grid" patternUnits="userSpaceOnUse" width="30">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8ecf1" strokeWidth="1" />
          </pattern>
          <marker
            id="arrowhead"
            markerHeight="10"
            markerWidth="10"
            orient="auto"
            refX="9"
            refY="3"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#20242a" />
          </marker>
        </defs>
        <rect fill="#ffffff" height={CANVAS_HEIGHT} width={CANVAS_WIDTH} x="0" y="0" />
        <rect fill="url(#grid)" height={CANVAS_HEIGHT} width={CANVAS_WIDTH} x="0" y="0" />
        {arrows.map((element) => renderArrow(element, elements))}
        {shapes.map(renderShape)}
      </svg>
    </div>
  );
}
