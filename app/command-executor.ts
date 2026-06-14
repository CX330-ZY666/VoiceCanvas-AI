import {
  type CanvasElement,
  createArrowElement,
  createCanvasElement,
  getElementLabel,
  getNextElementId,
  loginFlowTemplateElements
} from "./canvas-data";
import type { DrawCommand } from "./command-parser";
import type { SpatialTargetQuery } from "./command-parser";

const MOVE_DISTANCE = 40;
const SCALE_RATIO = 1.2;

type ExecuteResult = {
  elements: CanvasElement[];
  message: string;
  didChange?: boolean;
};

function findElement(elements: CanvasElement[], id?: string) {
  if (!id) {
    return undefined;
  }

  return elements.find((element) => element.id.toUpperCase() === id.toUpperCase());
}

function findElementBySpatialQuery(elements: CanvasElement[], query?: SpatialTargetQuery) {
  if (!query) {
    return undefined;
  }

  const candidates = elements.filter((element) => element.type !== "arrow");

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((selected, current) => {
    if (query === "rightmost") {
      return current.x > selected.x ? current : selected;
    }

    if (query === "leftmost") {
      return current.x < selected.x ? current : selected;
    }

    if (query === "topmost") {
      return current.y < selected.y ? current : selected;
    }

    return current.y > selected.y ? current : selected;
  });
}

function findTargetElement(elements: CanvasElement[], command: { targetId?: string; targetQuery?: SpatialTargetQuery }) {
  return findElement(elements, command.targetId) ?? findElementBySpatialQuery(elements, command.targetQuery);
}

function getDefaultPosition(elements: CanvasElement[]) {
  const shapeCount = elements.filter((element) => element.type !== "arrow").length;

  return {
    x: 260 + (shapeCount % 4) * 120,
    y: 180 + Math.floor(shapeCount / 4) * 95
  };
}

function getRelativePosition(target: CanvasElement, relation?: string) {
  const offset = 170;

  if (relation === "leftOf") {
    return { x: target.x - offset, y: target.y };
  }

  if (relation === "rightOf") {
    return { x: target.x + offset, y: target.y };
  }

  if (relation === "above") {
    return { x: target.x, y: target.y - 120 };
  }

  if (relation === "below") {
    return { x: target.x, y: target.y + 120 };
  }

  return { x: target.x + offset, y: target.y };
}

function scaleElement(element: CanvasElement, direction: "up" | "down") {
  const ratio = direction === "up" ? SCALE_RATIO : 1 / SCALE_RATIO;

  return {
    ...element,
    radius: element.radius ? Math.round(element.radius * ratio) : element.radius,
    width: element.width ? Math.round(element.width * ratio) : element.width,
    height: element.height ? Math.round(element.height * ratio) : element.height
  };
}

function moveElement(element: CanvasElement, direction: "left" | "right" | "up" | "down") {
  const delta = {
    left: { x: -MOVE_DISTANCE, y: 0 },
    right: { x: MOVE_DISTANCE, y: 0 },
    up: { x: 0, y: -MOVE_DISTANCE },
    down: { x: 0, y: MOVE_DISTANCE }
  }[direction];

  return {
    ...element,
    x: element.x + delta.x,
    y: element.y + delta.y
  };
}

function removeElementAndRelatedArrows(elements: CanvasElement[], targetId: string) {
  return elements.filter((element) => {
    if (element.id.toUpperCase() === targetId.toUpperCase()) {
      return false;
    }

    if (element.type === "arrow") {
      return element.fromId !== targetId && element.toId !== targetId;
    }

    return true;
  });
}

export function executeCommand(elements: CanvasElement[], command: DrawCommand): ExecuteResult {
  if (command.action === "clarify") {
    return { elements, message: command.message, didChange: false };
  }

  if (command.action === "clear") {
    return { elements: [], message: "已清空画布。", didChange: elements.length > 0 };
  }

  if (command.action === "create") {
    const nextId = getNextElementId(elements);
    const target = findElement(elements, command.position?.targetId);
    const position = target
      ? getRelativePosition(target, command.position?.relation)
      : getDefaultPosition(elements);

    return {
      elements: [
        ...elements,
        createCanvasElement(
          nextId,
          command.shapeType,
          position.x,
          position.y,
          command.color,
          command.text
        )
      ],
      message: `已创建${nextId}号对象。`,
      didChange: true
    };
  }

  if (command.action === "update") {
    const target = findTargetElement(elements, command);

    if (!target) {
      return {
        elements,
        message: "没有找到要修改的对象，请使用对象编号，例如“把矩形 B 改成绿色”。",
        didChange: false
      };
    }

    const updatedElements = elements.map((element) => {
      if (element.id !== target.id) {
        return element;
      }

      let nextElement = { ...element };

      if (command.properties.color) {
        nextElement = { ...nextElement, color: command.properties.color };
      }

      if (command.properties.move) {
        nextElement = moveElement(nextElement, command.properties.move);
      }

      if (command.properties.scale) {
        nextElement = scaleElement(nextElement, command.properties.scale);
      }

      return nextElement;
    });

    return {
      elements: updatedElements,
      message: `已更新${getElementLabel(target)} ${target.id}。`,
      didChange: true
    };
  }

  if (command.action === "delete") {
    const target = findTargetElement(elements, command);

    if (!target) {
      return {
        elements,
        message: "没有找到要删除的对象，请使用对象编号，例如“删除圆形 A”。",
        didChange: false
      };
    }

    return {
      elements: removeElementAndRelatedArrows(elements, target.id),
      message: `已删除${getElementLabel(target)} ${target.id}，相关箭头也会一并移除。`,
      didChange: true
    };
  }

  if (command.action === "connect") {
    const from = findElement(elements, command.fromId);
    const to = findElement(elements, command.toId);

    if (!from || !to) {
      return {
        elements,
        message: "没有找到要连接的对象，请确认两个对象编号都存在。",
        didChange: false
      };
    }

    if (from.type === "arrow" || to.type === "arrow") {
      return {
        elements,
        message: "箭头连接目前只支持连接基础图形和文本对象。",
        didChange: false
      };
    }

    const nextId = getNextElementId(elements);

    return {
      elements: [...elements, createArrowElement(nextId, from.id, to.id)],
      message: `已创建箭头 ${nextId}，连接 ${from.id} 到 ${to.id}。`,
      didChange: true
    };
  }

  if (command.action === "undo") {
    return {
      elements,
      message: "撤销功能由工作台历史记录处理。",
      didChange: false
    };
  }

  if (command.action === "generate_template") {
    return {
      elements: loginFlowTemplateElements,
      message: "已生成登录流程图模板。",
      didChange: true
    };
  }

  return { elements, message: "暂不支持该指令。", didChange: false };
}
