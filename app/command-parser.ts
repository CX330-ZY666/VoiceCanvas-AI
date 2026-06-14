import type { ShapeType } from "./canvas-data";

type Relation = "leftOf" | "rightOf" | "above" | "below";
export type SpatialTargetQuery = "leftmost" | "rightmost" | "topmost" | "bottommost";

export type DrawCommand =
  | {
      action: "create";
      shapeType: ShapeType;
      color?: string;
      text?: string;
      position?: {
        relation?: Relation;
        targetId?: string;
      };
    }
  | {
      action: "update";
      targetId?: string;
      targetQuery?: SpatialTargetQuery;
      properties: {
        color?: string;
        move?: "left" | "right" | "up" | "down";
        scale?: "up" | "down";
        text?: string;
      };
    }
  | {
      action: "connect";
      fromId: string;
      toId: string;
    }
  | {
      action: "delete";
      targetId?: string;
      targetQuery?: SpatialTargetQuery;
    }
  | {
      action: "duplicate";
      targetId?: string;
      targetQuery?: SpatialTargetQuery;
    }
  | {
      action: "auto_layout";
    }
  | {
      action: "clear";
    }
  | {
      action: "undo";
    }
  | {
      action: "generate_template";
      template: "login_flow";
    }
  | {
      action: "clarify";
      message: string;
    };

const colorMap: Record<string, string> = {
  红色: "#ef4444",
  红: "#ef4444",
  蓝色: "#3b82f6",
  蓝: "#3b82f6",
  绿色: "#22c55e",
  绿: "#22c55e",
  黄色: "#facc15",
  黄: "#facc15",
  黑色: "#20242a",
  黑: "#20242a",
  灰色: "#9ca3af",
  灰: "#9ca3af",
  紫色: "#8b5cf6",
  紫: "#8b5cf6",
  橙色: "#f97316",
  橙: "#f97316"
};

const shapeMap: Record<string, ShapeType> = {
  圆形: "circle",
  圆: "circle",
  矩形: "rect",
  方形: "rect",
  长方形: "rect",
  菱形: "diamond",
  文本: "text",
  文字: "text"
};

const relationMap: Record<string, Relation> = {
  左边: "leftOf",
  左侧: "leftOf",
  右边: "rightOf",
  右侧: "rightOf",
  上方: "above",
  上面: "above",
  下方: "below",
  下面: "below"
};

const moveMap = {
  左: "left",
  右: "right",
  上: "up",
  下: "down"
} as const;

function normalizeCommand(input: string) {
  return input.trim().replace(/\s+/g, " ").replace(/[，。！？]/g, "");
}

function findColor(input: string) {
  return Object.entries(colorMap).find(([label]) => input.includes(label))?.[1];
}

function findShape(input: string) {
  return Object.entries(shapeMap).find(([label]) => input.includes(label))?.[1];
}

function findTargetId(input: string) {
  return input.match(/[A-Z]/i)?.[0]?.toUpperCase();
}

function findSpatialTargetQuery(input: string): SpatialTargetQuery | undefined {
  if (input.includes("最右")) {
    return "rightmost";
  }

  if (input.includes("最左")) {
    return "leftmost";
  }

  if (input.includes("最上")) {
    return "topmost";
  }

  if (input.includes("最下")) {
    return "bottommost";
  }

  return undefined;
}

function findLabelText(input: string) {
  const quotedText = input.match(/[“"']([^”"']+)[”"']/)?.[1]?.trim();

  if (quotedText) {
    return quotedText;
  }

  const labelMatch =
    input.match(/(?:文字|文本|标签)(?:改成|设为|设置为|写成|为|成)?(.+)$/) ??
    input.match(/(?:标注|命名为|叫做)(.+)$/);
  const labelText = labelMatch?.[1]
    ?.replace(/^(为|成|叫|做|是|:|：|\s)+/, "")
    .trim();

  return labelText || undefined;
}

function hasAmbiguousReference(input: string) {
  return ["这个", "那个", "这条", "那条", "它", "图形", "线"].some((label) => input.includes(label));
}

function clarifyTargetMessage(action: "delete" | "update") {
  if (action === "delete") {
    return "我没有找到明确的删除对象。你可以说“删除箭头 C”或“删除圆形 A”。";
  }

  return "我没有找到明确的修改对象。你可以说“把圆形 A 改成红色”或“把矩形 B 往下移动一点”。";
}

function parsePosition(input: string): DrawCommand & { action: "create" } {
  const positionMatch = input.match(/在.*?([A-Z])\s*(左边|左侧|右边|右侧|上方|上面|下方|下面)/i);
  const position = positionMatch
    ? {
        targetId: positionMatch[1].toUpperCase(),
        relation: relationMap[positionMatch[2]]
      }
    : undefined;

  const textMatch = input.match(/[“"']([^”"']+)[”"']/);
  const shapeType = input.includes("文字") || input.includes("文本") ? "text" : findShape(input);

  if (shapeType === "text") {
    return {
      action: "create",
      shapeType: "text",
      text: textMatch?.[1] ?? "文本",
      color: findColor(input),
      position
    };
  }

  return {
    action: "create",
    shapeType: shapeType ?? "rect",
    color: findColor(input) ?? colorMap.灰色,
    position
  };
}

export function parseCommand(input: string): DrawCommand {
  const command = normalizeCommand(input);

  if (!command) {
    return {
      action: "clarify",
      message: "请输入一条指令，例如“画一个红色圆形”。"
    };
  }

  if (command.includes("清空")) {
    return { action: "clear" };
  }

  if (command.includes("撤销")) {
    return { action: "undo" };
  }

  if (command.includes("整理画布") || command.includes("自动排版") || command.includes("重新排版") || command.includes("排列整齐")) {
    return { action: "auto_layout" };
  }

  if (command.includes("生成") && command.includes("登录") && command.includes("流程图")) {
    return { action: "generate_template", template: "login_flow" };
  }

  const connectMatch =
    command.match(/(?:连接|连线).*?([A-Z])\s*(?:和|到|至|指向)\s*([A-Z])/i) ??
    command.match(/从\s*([A-Z])\s*指向\s*([A-Z])/i) ??
    command.match(/([A-Z])\s*指向\s*([A-Z])/i);

  if (connectMatch) {
    return {
      action: "connect",
      fromId: connectMatch[1].toUpperCase(),
      toId: connectMatch[2].toUpperCase()
    };
  }

  if (command.includes("删除")) {
    const targetId = findTargetId(command);
    const targetQuery = findSpatialTargetQuery(command);

    if (targetId) {
      return { action: "delete", targetId };
    }

    if (targetQuery) {
      return { action: "delete", targetQuery };
    }

    return {
      action: "clarify",
      message: clarifyTargetMessage("delete")
    };
  }

  if (command.includes("复制") || command.includes("拷贝") || command.includes("再来一个")) {
    const targetId = findTargetId(command);
    const targetQuery = findSpatialTargetQuery(command);

    if (targetId) {
      return { action: "duplicate", targetId };
    }

    if (targetQuery) {
      return { action: "duplicate", targetQuery };
    }

    return {
      action: "clarify",
      message: "我没有找到要复制的对象。你可以说“复制 A”或“复制最右边的图形”。"
    };
  }

  if (command.includes("文字") || command.includes("文本") || command.includes("标签") || command.includes("标注") || command.includes("命名为") || command.includes("叫做")) {
    const targetId = findTargetId(command);
    const targetQuery = findSpatialTargetQuery(command);
    const text = findLabelText(command);

    if (!targetId && !targetQuery) {
      return {
        action: "clarify",
        message: clarifyTargetMessage("update")
      };
    }

    if (!text) {
      return {
        action: "clarify",
        message: "我没有找到要写入的文字。你可以说“把 A 的文字改成开始”。"
      };
    }

    return targetId
      ? {
          action: "update",
          targetId,
          properties: { text }
        }
      : {
          action: "update",
          targetQuery,
          properties: { text }
        };
  }

  if (command.includes("改成") || command.includes("变成")) {
    const targetId = findTargetId(command);
    const targetQuery = findSpatialTargetQuery(command);
    const color = findColor(command);

    if (!targetId && !targetQuery && (color || hasAmbiguousReference(command))) {
      return {
        action: "clarify",
        message: clarifyTargetMessage("update")
      };
    }

    if (targetId && color) {
      return {
        action: "update",
        targetId,
        properties: { color }
      };
    }

    if (targetQuery && color) {
      return {
        action: "update",
        targetQuery,
        properties: { color }
      };
    }
  }

  const moveMatch = command.match(/([A-Z]).*?(?:往|向)?(左|右|上|下)移/i);
  if (moveMatch) {
    return {
      action: "update",
      targetId: moveMatch[1].toUpperCase(),
      properties: { move: moveMap[moveMatch[2] as keyof typeof moveMap] }
    };
  }

  const spatialMoveMatch = command.match(/(最左|最右|最上|最下).*?(?:往|向)?(左|右|上|下)移/);
  if (spatialMoveMatch) {
    const targetQuery = findSpatialTargetQuery(spatialMoveMatch[1]);

    if (targetQuery) {
      return {
        action: "update",
        targetQuery,
        properties: { move: moveMap[spatialMoveMatch[2] as keyof typeof moveMap] }
      };
    }
  }

  const targetId = findTargetId(command);
  const targetQuery = findSpatialTargetQuery(command);
  if (!targetId && !targetQuery && hasAmbiguousReference(command) && (command.includes("移动") || command.includes("放大") || command.includes("缩小"))) {
    return {
      action: "clarify",
      message: clarifyTargetMessage("update")
    };
  }

  if (targetId && (command.includes("放大") || command.includes("缩小"))) {
    return {
      action: "update",
      targetId,
      properties: { scale: command.includes("放大") ? "up" : "down" }
    };
  }

  if (targetQuery && (command.includes("放大") || command.includes("缩小"))) {
    return {
      action: "update",
      targetQuery,
      properties: { scale: command.includes("放大") ? "up" : "down" }
    };
  }

  if (command.includes("画") || command.includes("添加") || command.includes("创建")) {
    return parsePosition(command);
  }

  return {
    action: "clarify",
    message: "我暂时无法解析这条指令。你可以试试“画一个红色圆形”或“连接 A 和 B”。"
  };
}

export function parseCommandSequence(input: string) {
  const parts = input
    .split(/(?:然后|接着|并且|，再|再)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [parseCommand(input)];
  }

  return parts.map(parseCommand);
}
