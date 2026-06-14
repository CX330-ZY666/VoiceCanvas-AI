import { NextResponse } from "next/server";
import { parseCommandSequence, type DrawCommand, type SpatialTargetQuery } from "../../command-parser";

export const runtime = "nodejs";

type ResponseContentItem = {
  text?: string;
};

type ResponseOutputItem = {
  content?: ResponseContentItem[];
};

type OpenAIResponseBody = {
  output_text?: string;
  output?: ResponseOutputItem[];
};

type ChatCompletionBody = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ApiFormat = "responses" | "chat";

const fallbackMessage = "大模型解析暂时不可用，已切换到本地解析。";
const allowedShapeTypes = ["circle", "rect", "diamond", "text"] as const;
const allowedRelations = ["leftOf", "rightOf", "above", "below"] as const;
const allowedQueries: SpatialTargetQuery[] = ["leftmost", "rightmost", "topmost", "bottommost"];
const allowedMoves = ["left", "right", "up", "down"] as const;
const allowedScales = ["up", "down"] as const;
type CreateRelation = typeof allowedRelations[number];
type MoveDirection = typeof allowedMoves[number];
type ScaleDirection = typeof allowedScales[number];

function localFallback(text: string, message = fallbackMessage) {
  const commands = parseCommandSequence(text);

  return NextResponse.json({
    commands,
    source: "local",
    message
  });
}

function extractResponseText(data: OpenAIResponseBody | ChatCompletionBody) {
  if ("choices" in data && Array.isArray(data.choices)) {
    return data.choices[0]?.message?.content?.trim() ?? "";
  }

  if ("output_text" in data && typeof data.output_text === "string") {
    return data.output_text;
  }

  return "output" in data ? data.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? "")
    .join("\n")
    .trim() ?? "" : "";
}

function parseJsonPayload(outputText: string) {
  const fencedMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch?.[1] ?? outputText;
  const parsed = JSON.parse(jsonText.trim()) as unknown;

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { commands?: unknown }).commands)) {
    return (parsed as { commands: unknown[] }).commands;
  }

  return [];
}

function normalizeId(value: unknown) {
  return typeof value === "string" && /^[A-Z]$/i.test(value) ? value.toUpperCase() : undefined;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isCreateRelation(value: unknown): value is CreateRelation {
  return typeof value === "string" && allowedRelations.includes(value as CreateRelation);
}

function isMoveDirection(value: unknown): value is MoveDirection {
  return typeof value === "string" && allowedMoves.includes(value as MoveDirection);
}

function isScaleDirection(value: unknown): value is ScaleDirection {
  return typeof value === "string" && allowedScales.includes(value as ScaleDirection);
}

function isAllowedQuery(value: unknown): value is SpatialTargetQuery {
  return typeof value === "string" && allowedQueries.includes(value as SpatialTargetQuery);
}

function clarify(message: string): DrawCommand {
  return {
    action: "clarify",
    message
  };
}

function sanitizeCommand(rawCommand: unknown): DrawCommand {
  if (!rawCommand || typeof rawCommand !== "object") {
    return clarify("我没有理解这条指令，请换一种说法。");
  }

  const command = rawCommand as Record<string, unknown>;

  switch (command.action) {
    case "create": {
      const shapeType = allowedShapeTypes.find((item) => item === command.shapeType);

      if (!shapeType) {
        return clarify("我没有找到要创建的图形类型。");
      }

      const relation = typeof command.position === "object" && command.position
        ? (command.position as Record<string, unknown>).relation
        : undefined;
      const targetId = typeof command.position === "object" && command.position
        ? normalizeId((command.position as Record<string, unknown>).targetId)
        : undefined;
      const normalizedCommand: DrawCommand = {
        action: "create",
        shapeType
      };

      if (isHexColor(command.color)) {
        normalizedCommand.color = command.color;
      }

      if (typeof command.text === "string" && command.text.trim()) {
        normalizedCommand.text = command.text.trim().slice(0, 24);
      }

      if (isCreateRelation(relation) && targetId) {
        normalizedCommand.position = {
          relation,
          targetId
        };
      }

      return normalizedCommand;
    }

    case "update": {
      const targetId = normalizeId(command.targetId);
      const targetQuery = isAllowedQuery(command.targetQuery) ? command.targetQuery : undefined;
      const properties = command.properties && typeof command.properties === "object"
        ? command.properties as Record<string, unknown>
        : {};
      const normalizedProperties: {
        color?: string;
        move?: MoveDirection;
        scale?: ScaleDirection;
        text?: string;
      } = {};

      if (isHexColor(properties.color)) {
        normalizedProperties.color = properties.color;
      }

      if (isMoveDirection(properties.move)) {
        normalizedProperties.move = properties.move;
      }

      if (isScaleDirection(properties.scale)) {
        normalizedProperties.scale = properties.scale;
      }

      if (typeof properties.text === "string" && properties.text.trim()) {
        normalizedProperties.text = properties.text.trim().slice(0, 24);
      }

      if ((!targetId && !targetQuery) || Object.keys(normalizedProperties).length === 0) {
        return clarify("我没有找到明确的修改目标或修改内容。");
      }

      return targetId
        ? {
            action: "update",
            targetId,
            properties: normalizedProperties
          }
        : {
            action: "update",
            targetQuery,
            properties: normalizedProperties
          };
    }

    case "connect": {
      const fromId = normalizeId(command.fromId);
      const toId = normalizeId(command.toId);

      return fromId && toId
        ? {
            action: "connect",
            fromId,
            toId
          }
        : clarify("我没有找到要连接的两个对象编号。");
    }

    case "delete":
    case "duplicate": {
      const targetId = normalizeId(command.targetId);
      const targetQuery = isAllowedQuery(command.targetQuery) ? command.targetQuery : undefined;

      if (!targetId && !targetQuery) {
        return clarify(command.action === "delete" ? "我没有找到明确的删除对象。" : "我没有找到明确的复制对象。");
      }

      return targetId
        ? {
            action: command.action,
            targetId
          }
        : {
            action: command.action,
            targetQuery
          };
    }

    case "auto_layout":
      return { action: "auto_layout" };

    case "clear":
      return { action: "clear" };

    case "undo":
      return { action: "undo" };

    case "generate_template":
      return { action: "generate_template", template: "login_flow" };

    case "clarify":
      return clarify(typeof command.message === "string" && command.message.trim()
        ? command.message.trim().slice(0, 80)
        : "我还需要更明确的指令。");

    default:
      return clarify("我暂时无法把这句话转换成绘图动作。");
  }
}

function sanitizeCommands(rawCommands: unknown[]) {
  const commands = rawCommands.map(sanitizeCommand).slice(0, 6);

  return commands.length > 0
    ? commands
    : [clarify("我没有理解这条指令，请换一种说法。")];
}

function buildPrompt(text: string) {
  return [
    "你是 VoiceCanvas AI 的指令解析器，只把中文自然语言转换为 JSON，不解释。",
    "输出格式必须是：{\"commands\":[...]}。",
    "只能使用这些 action：create、update、connect、delete、duplicate、auto_layout、clear、undo、generate_template、clarify。",
    "create 字段：shapeType=circle|rect|diamond|text，可选 color=#rrggbb，可选 text，可选 position={relation:leftOf|rightOf|above|below,targetId:A}。",
    "update 字段：targetId=A 或 targetQuery=leftmost|rightmost|topmost|bottommost，properties 可含 color、move=left|right|up|down、scale=up|down、text。",
    "connect 字段：fromId=A，toId=B。",
    "delete/duplicate 字段：targetId=A 或 targetQuery。",
    "generate_template 只用于登录流程图，字段 template=login_flow。",
    "如果目标含糊，例如“那个图形”，返回 clarify，并要求用户给出对象编号。",
    `用户指令：${text}`
  ].join("\n");
}

function resolveApiFormat(apiUrl: string): ApiFormat {
  const configuredFormat = process.env.OPENAI_API_FORMAT;

  if (configuredFormat === "chat" || configuredFormat === "responses") {
    return configuredFormat;
  }

  return apiUrl.includes("/chat/completions") ? "chat" : "responses";
}

function resolveModel(apiUrl: string) {
  if (process.env.OPENAI_MODEL) {
    return process.env.OPENAI_MODEL;
  }

  return apiUrl.includes("deepseek.com") ? "deepseek-v4-flash" : "gpt-4.1-mini";
}

function buildRequestBody(format: ApiFormat, model: string, prompt: string) {
  if (format === "chat") {
    return {
      model,
      messages: [
        {
          role: "system",
          content: "你是 VoiceCanvas AI 的指令解析器。只输出 JSON，不输出解释。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      }
    };
  }

  return {
    model,
    input: prompt
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({
      commands: [clarify("请输入一条指令，例如“画一个红色圆形”。")],
      source: "local"
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return localFallback(text, "未配置 OPENAI_API_KEY，已使用本地解析。");
  }

  const apiUrl = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/responses";
  const apiFormat = resolveApiFormat(apiUrl);
  const model = resolveModel(apiUrl);
  const prompt = buildPrompt(text);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildRequestBody(apiFormat, model, prompt))
    });

    if (!response.ok) {
      return localFallback(text);
    }

    const data = await response.json() as OpenAIResponseBody | ChatCompletionBody;
    const outputText = extractResponseText(data);
    const rawCommands = parseJsonPayload(outputText);
    const commands = sanitizeCommands(rawCommands);

    return NextResponse.json({
      commands,
      source: "llm"
    });
  } catch {
    return localFallback(text);
  }
}
