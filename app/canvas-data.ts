export type ShapeType = "circle" | "rect" | "diamond" | "text";
export type ElementType = ShapeType | "arrow";

export type CanvasElement = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  text?: string;
  fromId?: string;
  toId?: string;
};

export const demoCanvasElements: CanvasElement[] = [
  {
    id: "A",
    type: "circle",
    x: 190,
    y: 230,
    radius: 45,
    color: "#ef4444"
  },
  {
    id: "B",
    type: "rect",
    x: 395,
    y: 230,
    width: 120,
    height: 70,
    color: "#3b82f6"
  },
  {
    id: "C",
    type: "diamond",
    x: 610,
    y: 230,
    width: 120,
    height: 90,
    color: "#facc15"
  },
  {
    id: "D",
    type: "text",
    x: 395,
    y: 385,
    text: "开始",
    color: "#20242a"
  },
  {
    id: "E",
    type: "arrow",
    x: 0,
    y: 0,
    color: "#20242a",
    fromId: "A",
    toId: "B"
  }
];

export function getNextElementId(elements: CanvasElement[]) {
  const usedIds = new Set(elements.map((element) => element.id.toUpperCase()));
  let code = "A".charCodeAt(0);

  while (usedIds.has(String.fromCharCode(code))) {
    code += 1;
  }

  return String.fromCharCode(code);
}

export function createDemoElement(id: string, index: number): CanvasElement {
  const shapes: ShapeType[] = ["circle", "rect", "diamond"];
  const colors = ["#22c55e", "#f97316", "#8b5cf6"];
  const shapeType = shapes[index % shapes.length];

  return {
    id,
    type: shapeType,
    x: 180 + (index % 4) * 145,
    y: 390 + Math.floor(index / 4) * 90,
    width: shapeType === "circle" ? undefined : 110,
    height: shapeType === "circle" ? undefined : 68,
    radius: shapeType === "circle" ? 38 : undefined,
    color: colors[index % colors.length]
  };
}

export function createCanvasElement(
  id: string,
  type: ShapeType,
  x: number,
  y: number,
  color?: string,
  text?: string
): CanvasElement {
  if (type === "circle") {
    return {
      id,
      type,
      x,
      y,
      radius: 45,
      color: color ?? "#9ca3af"
    };
  }

  if (type === "text") {
    return {
      id,
      type,
      x,
      y,
      text: text ?? "文本",
      color: color ?? "#20242a"
    };
  }

  return {
    id,
    type,
    x,
    y,
    width: type === "diamond" ? 120 : 120,
    height: type === "diamond" ? 90 : 70,
    color: color ?? "#9ca3af"
  };
}

export function getElementLabel(element: CanvasElement) {
  const labels: Record<ElementType, string> = {
    circle: "圆形",
    rect: "矩形",
    diamond: "菱形",
    text: "文本",
    arrow: "箭头"
  };

  return labels[element.type];
}
