"use client";

import {
  ArrowCounterClockwise,
  Broom,
  Microphone,
  PaperPlaneTilt,
  Repeat,
  SpeakerHigh,
  SpeakerSlash,
  StopCircle
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { type DrawCommand, parseCommandSequence } from "./command-parser";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useSpeechSynthesis } from "./use-speech-synthesis";

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

type AppControlCommand = {
  kind: "enable_feedback" | "disable_feedback" | "stop_feedback";
  message: string;
};

function parseAppControlCommand(text: string): AppControlCommand | null {
  const normalizedText = text.replace(/\s+/g, "");

  if (/(开启|打开|启动).*(语音反馈|语音播报|播报|朗读)/.test(normalizedText)) {
    return {
      kind: "enable_feedback",
      message: "语音反馈已开启。"
    };
  }

  if (/(关闭|关掉|取消).*(语音反馈|语音播报|播报|朗读)/.test(normalizedText)) {
    return {
      kind: "disable_feedback",
      message: "语音反馈已关闭。"
    };
  }

  if (/(停止|结束).*(播报|朗读|语音反馈)/.test(normalizedText)) {
    return {
      kind: "stop_feedback",
      message: "已停止语音反馈播报。"
    };
  }

  return null;
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
  const [isSpeechFeedbackEnabled, setIsSpeechFeedbackEnabled] = useState(true);
  const {
    message: speechFeedbackMessage,
    speak: speakSpeechFeedback,
    stop: stopSpeechFeedback
  } = useSpeechSynthesis();
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
  const speakFeedback = useCallback((message: string) => {
    if (isSpeechFeedbackEnabled && message) {
      speakSpeechFeedback(message);
    }
  }, [isSpeechFeedbackEnabled, speakSpeechFeedback]);
  const applyAppControlCommand = useCallback((text: string) => {
    const controlCommand = parseAppControlCommand(text);

    if (!controlCommand) {
      return false;
    }

    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(controlCommand.message);
    setParsedCommands([{
      action: "clarify",
      message: controlCommand.message
    }]);

    if (controlCommand.kind === "enable_feedback") {
      setIsSpeechFeedbackEnabled(true);
      speakSpeechFeedback(controlCommand.message);
      return true;
    }

    stopSpeechFeedback();

    if (controlCommand.kind === "disable_feedback") {
      setIsSpeechFeedbackEnabled(false);
    }

    return true;
  }, [speakSpeechFeedback, stopSpeechFeedback]);
  const handleSpeechText = useCallback((text: string) => {
    setInput(text);

    if (applyAppControlCommand(text)) {
      return;
    }

    if (isStopSpeechCommand(text)) {
      const stopMessage = "已停止连续语音输入。";
      setRecognizedText(text);
      setExecutionMessage(stopMessage);
      setParsedCommands([{
        action: "clarify",
        message: stopMessage
      }]);
      speakFeedback(stopMessage);
      return;
    }

    const results = parseCommandSequence(text);
    const message = executeParsedCommands(results);
    setParsedCommands(results);
    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(message);
    speakFeedback(message);
  }, [applyAppControlCommand, executeParsedCommands, speakFeedback]);
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
    if (applyAppControlCommand(text)) {
      setInput(text);
      return;
    }

    if (isStopSpeechCommand(text)) {
      const stopMessage = "已停止连续语音输入。";
      speech.stopListening();
      setInput(text);
      setRecognizedText(text);
      setExecutionMessage(stopMessage);
      setParsedCommands([{
        action: "clarify",
        message: stopMessage
      }]);
      speakFeedback(stopMessage);
      return;
    }

    const results = parseCommandSequence(text);
    const message = executeParsedCommands(results);
    setParsedCommands(results);
    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(message);
    speakFeedback(message);
  }

  function executeCommand() {
    executeTextCommand(input);
  }

  return (
    <aside className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between border-b border-canvas-line pb-3">
        <h2 className="text-base font-bold">控制区</h2>
        <span className="text-xs font-medium text-canvas-muted">
          {speech.isContinuous ? "连续语音" : speech.isListening ? "正在听" : "PR 15 语音控制"}
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
            stopSpeechFeedback();
            setRecognizedText("已停止语音输入。");
          }}
        >
          <StopCircle size={18} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          label={isSpeechFeedbackEnabled ? "关闭语音反馈" : "开启语音反馈"}
          onClick={() => {
            if (isSpeechFeedbackEnabled) {
              setIsSpeechFeedbackEnabled(false);
              stopSpeechFeedback();
              return;
            }

            setIsSpeechFeedbackEnabled(true);
            speakSpeechFeedback("语音反馈已开启。");
          }}
        >
          {isSpeechFeedbackEnabled ? (
            <SpeakerHigh size={18} weight="bold" />
          ) : (
            <SpeakerSlash size={18} weight="bold" />
          )}
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
        <p className="mt-2 text-xs text-canvas-muted">
          语音反馈：{isSpeechFeedbackEnabled ? speechFeedbackMessage : "已关闭"}
        </p>
        {parsedCommands.length > 0 ? (
          <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-canvas-wash p-3 text-xs leading-5 text-canvas-ink">
            {JSON.stringify(parsedCommands.length === 1 ? parsedCommands[0] : parsedCommands, null, 2)}
          </pre>
        ) : null}
      </div>
    </aside>
  );
}
