import type { CanvasElement } from "./canvas-data";
import { getElementLabel } from "./canvas-data";

function describeElement(element: CanvasElement) {
  if (element.type === "arrow") {
    return {
      color: element.color ?? "黑色",
      position: `${element.fromId} -> ${element.toId}`,
      description: `箭头：${element.fromId} 指向 ${element.toId}`
    };
  }

  return {
    color: element.color ?? "灰色",
    position: `x: ${Math.round(element.x)}, y: ${Math.round(element.y)}`,
    description:
      element.type === "text"
        ? `文本：${element.text ?? ""}`
        : `${getElementLabel(element)}：${element.color ?? "灰色"}`
  };
}

export function ObjectList({ elements }: Readonly<{ elements: CanvasElement[] }>) {
  return (
    <aside className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between border-b border-canvas-line pb-3">
        <h2 className="text-base font-bold">对象列表</h2>
        <span className="text-xs font-medium text-canvas-muted">{elements.length} 个对象</span>
      </div>
      <div className="mt-4 divide-y divide-canvas-line overflow-hidden rounded-md border border-canvas-line">
        {elements.length === 0 ? (
          <div className="bg-white p-4 text-sm leading-6 text-canvas-muted">
            画布暂无对象。后续可以通过文本或语音指令创建图形。
          </div>
        ) : (
          elements.map((item) => {
            const detail = describeElement(item);

            return (
              <div className="grid gap-2 bg-white p-3 text-sm" key={item.id}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">对象 {item.id}</span>
                  <span className="rounded bg-canvas-wash px-2 py-1 text-xs text-canvas-muted">
                    {getElementLabel(item)}
                  </span>
                </div>
                <p className="text-canvas-muted">颜色：{detail.color}</p>
                <p className="font-mono text-xs text-canvas-muted">{detail.position}</p>
                <p className="text-xs leading-5 text-canvas-muted">{detail.description}</p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
