"use client";

import {
  ArrowCounterClockwise,
  Broom,
  Microphone,
  PaperPlaneTilt,
  Repeat,
  StopCircle
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { type DrawCommand, parseCommandSequence } from "./command-parser";
import { useSpeechRecognition } from "./use-speech-recognition";

function ToolbarButton({
  label,
  children,
  onClick,
  variant = "secondary"
}: Readonly<{
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}>) {
  const variantClass =
    variant === "primary"
      ? "border-canvas-accent bg-canvas-accent text-white hover:bg-[#18765f]"
      : "border-canvas-line bg-white text-canvas-ink hover:bg-[#f0f3f5]";

  return (
    <button
      className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition duration-200 active:translate-y-px ${variantClass}`}
      onClick={onClick}
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function commandSummary(command: DrawCommand) {
  const summaries: Record<DrawCommand["action"], string> = {
    create: "已解析为创建对象指令。",
    update: "已解析为修改对象指令。",
    connect: "已解析为连接对象指令。",
    delete: "已解析为删除对象指令。",
    clear: "已解析为清空画布指令。",
    undo: "已解析为撤销指令。",
    generate_template: "已解析为生成模板指令。",
    clarify: "需要补充更明确的指令。"
  };

  return summaries[command.action];
}

function isStopSpeechCommand(text: string) {
  return /(停止|结束|关闭).*(语音|监听|输入)?/.test(text);
}

export function CommandPanel({
  onCommand
}: Readonly<{
  onCommand?: (command: DrawCommand) => string;
}>) {
  const [input, setInput] = useState("画一个红色圆形");
  const [recognizedText, setRecognizedText] = useState("等待语音输入。");
  const [parsedCommands, setParsedCommands] = useState<DrawCommand[]>([]);
  const [executionMessage, setExecutionMessage] = useState("");
  const executeParsedCommands = useCallback((commands: DrawCommand[]) => {
    if (!onCommand) {
      return "";
    }

    const messages: string[] = [];

    for (const command of commands) {
      const message = onCommand(command);
      messages.push(message);

      if (command.action === "clarify") {
        break;
      }
    }

    return messages.join(" ");
  }, [onCommand]);
  const handleSpeechText = useCallback((text: string) => {
    setInput(text);

    if (isStopSpeechCommand(text)) {
      setRecognizedText(text);
      setExecutionMessage("已停止连续语音输入。");
      setParsedCommands([{
        action: "clarify",
        message: "已停止连续语音输入。"
      }]);
      return;
    }

    const results = parseCommandSequence(text);
    setParsedCommands(results);
    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(executeParsedCommands(results));
  }, [executeParsedCommands]);
  const speech = useSpeechRecognition(handleSpeechText);

  const feedback = useMemo(() => {
    if (parsedCommands.length === 0) {
      return "输入文本指令后点击执行，可以查看本地规则解析结果。";
    }

    if (executionMessage) {
      return executionMessage;
    }

    if (parsedCommands.length === 1) {
      const [command] = parsedCommands;
      return command.action === "clarify" ? command.message : commandSummary(command);
    }

    return `已拆解为 ${parsedCommands.length} 条指令。`;
  }, [executionMessage, parsedCommands]);

  function executeTextCommand(text: string) {
    if (isStopSpeechCommand(text)) {
      speech.stopListening();
      setInput(text);
      setRecognizedText(text);
      setExecutionMessage("已停止连续语音输入。");
      setParsedCommands([{
        action: "clarify",
        message: "已停止连续语音输入。"
      }]);
      return;
    }

    const results = parseCommandSequence(text);
    setParsedCommands(results);
    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(executeParsedCommands(results));
  }

  function executeCommand() {
    executeTextCommand(input);
  }

  return (
    <aside className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between border-b border-canvas-line pb-3">
        <h2 className="text-base font-bold">控制区</h2>
        <span className="text-xs font-medium text-canvas-muted">
          {speech.isContinuous ? "连续语音" : speech.isListening ? "正在听" : "PR 11 连续语音"}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <ToolbarButton
          label="开始语音输入"
          onClick={() => {
            speech.startListening();
            setRecognizedText(speech.isSupported ? "正在听，请说出绘图指令。" : speech.message);
          }}
        >
          <Microphone size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label="连续语音模式"
          onClick={() => {
            speech.startListening({ continuous: true });
            setRecognizedText(speech.isSupported ? "连续语音模式已开启。" : speech.message);
          }}
        >
          <Repeat size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label="停止语音输入"
          onClick={() => {
            speech.stopListening();
            setRecognizedText("已停止语音输入。");
          }}
        >
          <StopCircle size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label="清空画布"
          onClick={() => {
            setInput("清空画布");
            executeTextCommand("清空画布");
          }}
        >
          <Broom size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label="撤销"
          onClick={() => {
            setInput("撤销");
            executeTextCommand("撤销");
          }}
        >
          <ArrowCounterClockwise size={18} weight="bold" />
        </ToolbarButton>
      </div>

      <label className="mt-5 block text-sm font-semibold" htmlFor="command">
        文本指令
      </label>
      <textarea
        className="mt-2 min-h-28 w-full resize-none rounded-md border border-canvas-line bg-canvas-wash px-3 py-3 text-sm outline-none transition focus:border-canvas-accent focus:bg-white"
        id="command"
        onChange={(event) => setInput(event.target.value)}
        placeholder="例如：画一个红色圆形"
        value={input}
      />
      <div className="mt-3">
        <ToolbarButton label="执行指令" onClick={executeCommand} variant="primary">
          <PaperPlaneTilt size={18} weight="bold" />
        </ToolbarButton>
      </div>

      <div className="mt-5 rounded-md border border-canvas-line bg-canvas-wash p-3">
        <p className="text-xs font-semibold text-canvas-muted">当前识别文本</p>
        <p className="mt-2 text-sm">
          {speech.isListening || speech.isContinuous ? speech.message : recognizedText}
        </p>
      </div>
      <div className="mt-3 rounded-md border border-canvas-line bg-white p-3">
        <p className="text-xs font-semibold text-canvas-muted">系统反馈</p>
        <p className="mt-2 text-sm">{feedback}</p>
        {parsedCommands.length > 0 ? (
          <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-canvas-wash p-3 text-xs leading-5 text-canvas-ink">
            {JSON.stringify(parsedCommands.length === 1 ? parsedCommands[0] : parsedCommands, null, 2)}
          </pre>
        ) : null}
      </div>
    </aside>
  );
}
