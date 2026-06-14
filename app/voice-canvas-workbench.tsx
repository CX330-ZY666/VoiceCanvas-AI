"use client";

import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import {
  type CanvasElement,
  createDemoElement,
  demoCanvasElements,
  getNextElementId
} from "./canvas-data";
import { CommandPanel } from "./command-panel";
import { ObjectList } from "./object-list";
import { SvgCanvas } from "./svg-canvas";

export function VoiceCanvasWorkbench() {
  const [elements, setElements] = useState<CanvasElement[]>(demoCanvasElements);

  function addDemoObject() {
    setElements((current) => {
      const nextId = getNextElementId(current);
      const createdCount = current.filter((element) => element.type !== "arrow").length;

      return [...current, createDemoElement(nextId, createdCount)];
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <CommandPanel />

      <section className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 border-b border-canvas-line pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">SVG 画布</h2>
            <p className="mt-1 text-xs text-canvas-muted">对象编号来自当前画布状态。</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-canvas-muted">900 x 600</span>
            <button
              className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-canvas-line bg-white px-3 text-xs font-semibold text-canvas-ink transition hover:bg-canvas-wash active:translate-y-px"
              onClick={addDemoObject}
              type="button"
            >
              <Plus size={16} weight="bold" />
              添加示例对象
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-canvas-line bg-canvas-wash p-3">
          <SvgCanvas elements={elements} />
        </div>
      </section>

      <ObjectList elements={elements} />
    </section>
  );
}
