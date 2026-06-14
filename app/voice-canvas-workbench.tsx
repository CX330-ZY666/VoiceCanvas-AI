"use client";

import { Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CanvasElement,
  createDemoElement,
  demoCanvasElements,
  getElementLabel,
  getNextElementId
} from "./canvas-data";
import { CommandPanel } from "./command-panel";
import { executeCommand } from "./command-executor";
import type { DrawCommand } from "./command-parser";
import { ObjectList } from "./object-list";
import { SvgCanvas } from "./svg-canvas";

function describeCanvasElement(element: CanvasElement) {
  if (element.type === "arrow") {
    return `箭头 ${element.id}，从 ${element.fromId ?? "未知对象"} 指向 ${element.toId ?? "未知对象"}`;
  }

  const text = element.text ? `，文字是${element.text}` : "";
  return `${getElementLabel(element)} ${element.id}${text}`;
}

function summarizeCanvasElements(elements: CanvasElement[]) {
  if (elements.length === 0) {
    return "当前画布是空的。";
  }

  const arrows = elements.filter((element) => element.type === "arrow");
  const drawableElements = elements.filter((element) => element.type !== "arrow");
  const descriptions = elements.map(describeCanvasElement).join("；");

  return `当前画布有 ${drawableElements.length} 个对象和 ${arrows.length} 条箭头：${descriptions}。`;
}

export function VoiceCanvasWorkbench() {
  const [elements, setElements] = useState<CanvasElement[]>(demoCanvasElements);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const elementsRef = useRef(elements);
  const historyRef = useRef(history);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  function addDemoObject() {
    setElements((current) => {
      const nextId = getNextElementId(current);
      const createdCount = current.filter((element) => element.type !== "arrow").length;
      const nextElements = [...current, createDemoElement(nextId, createdCount)];

      setHistory((items) => [...items, current]);
      elementsRef.current = nextElements;
      historyRef.current = [...historyRef.current, current];
      return nextElements;
    });
  }

  const handleCommand = useCallback((command: DrawCommand) => {
    const currentElements = elementsRef.current;
    const currentHistory = historyRef.current;

    if (command.action === "undo") {
      if (currentHistory.length === 0) {
        return "没有可撤销的操作。";
      }

      const previous = currentHistory[currentHistory.length - 1];
      const nextHistory = currentHistory.slice(0, -1);

      elementsRef.current = previous;
      historyRef.current = nextHistory;
      setElements(previous);
      setHistory(nextHistory);

      return "已撤销上一步操作。";
    }

    const result = executeCommand(currentElements, command);

    if (result.didChange) {
      const nextHistory = [...currentHistory, currentElements];
      historyRef.current = nextHistory;
      setHistory(nextHistory);
    }

    elementsRef.current = result.elements;
    setElements(result.elements);

    return result.message;
  }, []);

  const handleSummarizeCanvas = useCallback(() => summarizeCanvasElements(elementsRef.current), []);

  return (
    <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <CommandPanel onCommand={handleCommand} onSummarizeCanvas={handleSummarizeCanvas} />

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
