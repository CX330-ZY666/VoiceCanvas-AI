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
