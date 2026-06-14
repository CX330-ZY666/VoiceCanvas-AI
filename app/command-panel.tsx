"use client";

import {
  ArrowCounterClockwise,
  Broom,
  DownloadSimple,
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
    duplicate: "已解析为复制对象指令。",
    auto_layout: "已解析为自动整理画布指令。",
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

function isConfirmClearCommand(text: string) {
  return /(确认|确定|同意|执行).*(清空|清除|删除全部)/.test(text.replace(/\s+/g, ""));
}

function isCancelCommand(text: string) {
  return /(取消|算了|不用|不要|放弃)/.test(text.replace(/\s+/g, ""));
}

function isRepeatCommand(text: string) {
  return /(重复上一条|重复上一个|再来一次|再执行一次|再画一个|再做一次)/.test(text.replace(/\s+/g, ""));
}

function isExportSvgCommand(text: string) {
  return /(导出|下载|保存).*(画布|SVG|svg)|(?:导出|下载|保存)SVG/i.test(text.replace(/\s+/g, ""));
}

function isRepeatableCommand(command: DrawCommand) {
  return ["create", "update", "connect", "delete", "duplicate", "auto_layout", "generate_template"].includes(command.action);
}

function findSelectionTargetId(text: string) {
  return text.match(/(?:选中|选择|定位到|聚焦)\s*(?:对象|图形|箭头)?\s*([A-Z])/i)?.[1]?.toUpperCase();
}

function hasPronounTarget(text: string) {
  return /(它|这个|那个|当前对象|选中的|选中对象)/.test(text);
}

function resolveContextualCommand(text: string, selectedTargetId: string) {
  if (!selectedTargetId || !hasPronounTarget(text)) {
    return text;
  }

  return text.replace(/它|这个图形|那个图形|这个对象|那个对象|当前对象|选中的对象|选中对象|这个|那个/g, selectedTargetId);
}

type CommandHistoryItem = {
  text: string;
  message: string;
};

const voiceHelpExamples = [
  "画一个红色圆形",
  "在圆形 A 右边画一个蓝色矩形",
  "连接 A 和 B",
  "把最右边的图形改成绿色",
  "选中 A",
  "把它改成绿色",
  "删除最上面的图形",
  "画布里有什么",
  "生成一个登录流程图",
  "整理画布",
  "导出画布",
  "重复上一条",
  "历史记录",
  "确认清空",
  "开启语音反馈",
  "关闭语音反馈"
];

const clearConfirmationMessage = "清空画布会删除所有对象。请说“确认清空”继续，或说“取消”放弃。";
const clearCancelledMessage = "已取消清空画布。";

type AppControlCommand = {
  kind:
    | "enable_feedback"
    | "disable_feedback"
    | "stop_feedback"
    | "show_help"
    | "summarize_canvas"
    | "show_history";
  message: string;
};

function parseAppControlCommand(text: string): AppControlCommand | null {
  const normalizedText = text.replace(/\s+/g, "");

  if (/(历史记录|命令历史|操作历史|刚才说了什么|之前说了什么|上一些指令)/.test(normalizedText)) {
    return {
      kind: "show_history",
      message: "正在读取最近的命令历史。"
    };
  }

  if (/(画布里有什么|画布有什么|当前.*对象|有哪些对象|对象列表|总结画布|描述画布|读一下画布)/.test(normalizedText)) {
    return {
      kind: "summarize_canvas",
      message: "正在读取当前画布。"
    };
  }

  if (/(帮助|说明|怎么用|能说什么|支持什么|支持哪些|指令列表|命令列表)/.test(normalizedText)) {
    return {
      kind: "show_help",
      message: "你可以说：画一个红色圆形、连接 A 和 B、把最右边的图形改成绿色，或生成一个登录流程图。"
    };
  }

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
  onCommand,
  onExportSvg,
  onSummarizeCanvas
}: Readonly<{
  onCommand?: (command: DrawCommand) => string;
  onExportSvg?: () => string;
  onSummarizeCanvas?: () => string;
}>) {
  const [input, setInput] = useState("画一个红色圆形");
  const [recognizedText, setRecognizedText] = useState("等待语音输入。");
  const [parsedCommands, setParsedCommands] = useState<DrawCommand[]>([]);
  const [executionMessage, setExecutionMessage] = useState("");
  const [isSpeechFeedbackEnabled, setIsSpeechFeedbackEnabled] = useState(true);
  const [isVoiceHelpVisible, setIsVoiceHelpVisible] = useState(false);
  const [isClearConfirmationPending, setIsClearConfirmationPending] = useState(false);
  const [lastRepeatableCommandText, setLastRepeatableCommandText] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistoryItem[]>([]);
  const [isCommandHistoryVisible, setIsCommandHistoryVisible] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState("");
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
      if (command.action === "clear") {
        setIsClearConfirmationPending(true);
        messages.push(clearConfirmationMessage);
        break;
      }

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
  const appendCommandHistory = useCallback((text: string, message: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setCommandHistory((items) => [
      { text: cleanText, message },
      ...items.filter((item) => item.text !== cleanText)
    ].slice(0, 5));
  }, []);
  const applyAppControlCommand = useCallback((text: string) => {
    const controlCommand = parseAppControlCommand(text);

    if (!controlCommand) {
      return false;
    }

    const resolvedMessage = controlCommand.kind === "summarize_canvas"
      ? onSummarizeCanvas?.() ?? "当前无法读取画布状态。"
      : controlCommand.message;
    const historyMessage = commandHistory.length === 0
      ? "还没有命令历史。"
      : `最近 ${commandHistory.length} 条命令：${commandHistory.map((item, index) => `${index + 1}. ${item.text}`).join("；")}。`;

    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(controlCommand.kind === "show_history" ? historyMessage : resolvedMessage);
    setIsVoiceHelpVisible(controlCommand.kind === "show_help");
    setIsCommandHistoryVisible(controlCommand.kind === "show_history");
    setParsedCommands([{
      action: "clarify",
      message: controlCommand.kind === "show_history" ? historyMessage : resolvedMessage
    }]);

    if (controlCommand.kind === "show_history") {
      speakFeedback(historyMessage);
      return true;
    }

    if (controlCommand.kind === "summarize_canvas") {
      setIsVoiceHelpVisible(false);
      appendCommandHistory(text, resolvedMessage);
      speakFeedback(resolvedMessage);
      return true;
    }

    if (controlCommand.kind === "show_help") {
      appendCommandHistory(text, controlCommand.message);
      if (isSpeechFeedbackEnabled) {
        speakSpeechFeedback(controlCommand.message);
      }
      return true;
    }

    if (controlCommand.kind === "enable_feedback") {
      setIsSpeechFeedbackEnabled(true);
      appendCommandHistory(text, controlCommand.message);
      speakSpeechFeedback(controlCommand.message);
      return true;
    }

    stopSpeechFeedback();

    if (controlCommand.kind === "disable_feedback") {
      setIsSpeechFeedbackEnabled(false);
    }

    appendCommandHistory(text, controlCommand.message);
    return true;
  }, [
    appendCommandHistory,
    commandHistory,
    isSpeechFeedbackEnabled,
    onSummarizeCanvas,
    speakFeedback,
    speakSpeechFeedback,
    stopSpeechFeedback
  ]);
  const handleSpeechText = useCallback((text: string) => {
    setInput(text);

    const selectionTargetId = findSelectionTargetId(text);
    if (selectionTargetId) {
      const message = `已选中对象 ${selectionTargetId}。接下来可以说“把它改成绿色”或“删除它”。`;
      setSelectedTargetId(selectionTargetId);
      setParsedCommands([{
        action: "clarify",
        message
      }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(message);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, message);
      speakFeedback(message);
      return;
    }

    if (isClearConfirmationPending && isConfirmClearCommand(text)) {
      const message = onCommand?.({ action: "clear" }) ?? "";
      setIsClearConfirmationPending(false);
      setParsedCommands([{ action: "clear" }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(message);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, message);
      speakFeedback(message);
      return;
    }

    if (isClearConfirmationPending && isCancelCommand(text)) {
      setIsClearConfirmationPending(false);
      setParsedCommands([{
        action: "clarify",
        message: clearCancelledMessage
      }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(clearCancelledMessage);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, clearCancelledMessage);
      speakFeedback(clearCancelledMessage);
      return;
    }

    if (isClearConfirmationPending) {
      setIsClearConfirmationPending(false);
    }

    if (isExportSvgCommand(text)) {
      const message = onExportSvg?.() ?? "当前无法导出 SVG。";
      setParsedCommands([{
        action: "clarify",
        message
      }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(message);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, message);
      speakFeedback(message);
      return;
    }

    if (isRepeatCommand(text)) {
      if (!lastRepeatableCommandText) {
        const message = "还没有可重复的绘图指令。";
        setParsedCommands([{
          action: "clarify",
          message
        }]);
        setRecognizedText(text.trim() || "未输入文本。");
        setExecutionMessage(message);
        setIsVoiceHelpVisible(false);
        setIsCommandHistoryVisible(false);
        appendCommandHistory(text, message);
        speakFeedback(message);
        return;
      }

      const results = parseCommandSequence(lastRepeatableCommandText);
      const message = executeParsedCommands(results);
      const repeatMessage = `已重复上一条指令：${lastRepeatableCommandText}。${message}`;
      setInput(lastRepeatableCommandText);
      setParsedCommands(results);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(repeatMessage);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, repeatMessage);
      speakFeedback(repeatMessage);
      return;
    }

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
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, stopMessage);
      speakFeedback(stopMessage);
      return;
    }

    const resolvedText = resolveContextualCommand(text, selectedTargetId);
    const results = parseCommandSequence(resolvedText);
    const message = executeParsedCommands(results);
    setParsedCommands(results);
    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(message);
    setIsVoiceHelpVisible(false);
    setIsCommandHistoryVisible(false);
    if (results.every(isRepeatableCommand)) {
      setLastRepeatableCommandText(resolvedText.trim());
    }
    appendCommandHistory(text, message);
    speakFeedback(message);
  }, [
    appendCommandHistory,
    applyAppControlCommand,
    executeParsedCommands,
    isClearConfirmationPending,
    lastRepeatableCommandText,
    onCommand,
    onExportSvg,
    selectedTargetId,
    speakFeedback
  ]);
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
    const selectionTargetId = findSelectionTargetId(text);
    if (selectionTargetId) {
      const message = `已选中对象 ${selectionTargetId}。接下来可以说“把它改成绿色”或“删除它”。`;
      setSelectedTargetId(selectionTargetId);
      setInput(text);
      setParsedCommands([{
        action: "clarify",
        message
      }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(message);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, message);
      speakFeedback(message);
      return;
    }

    if (isClearConfirmationPending && isConfirmClearCommand(text)) {
      const message = onCommand?.({ action: "clear" }) ?? "";
      setIsClearConfirmationPending(false);
      setInput(text);
      setParsedCommands([{ action: "clear" }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(message);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, message);
      speakFeedback(message);
      return;
    }

    if (isClearConfirmationPending && isCancelCommand(text)) {
      setIsClearConfirmationPending(false);
      setInput(text);
      setParsedCommands([{
        action: "clarify",
        message: clearCancelledMessage
      }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(clearCancelledMessage);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, clearCancelledMessage);
      speakFeedback(clearCancelledMessage);
      return;
    }

    if (isClearConfirmationPending) {
      setIsClearConfirmationPending(false);
    }

    if (isExportSvgCommand(text)) {
      const message = onExportSvg?.() ?? "当前无法导出 SVG。";
      setInput(text);
      setParsedCommands([{
        action: "clarify",
        message
      }]);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(message);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, message);
      speakFeedback(message);
      return;
    }

    if (isRepeatCommand(text)) {
      if (!lastRepeatableCommandText) {
        const message = "还没有可重复的绘图指令。";
        setInput(text);
        setParsedCommands([{
          action: "clarify",
          message
        }]);
        setRecognizedText(text.trim() || "未输入文本。");
        setExecutionMessage(message);
        setIsVoiceHelpVisible(false);
        setIsCommandHistoryVisible(false);
        appendCommandHistory(text, message);
        speakFeedback(message);
        return;
      }

      const results = parseCommandSequence(lastRepeatableCommandText);
      const message = executeParsedCommands(results);
      const repeatMessage = `已重复上一条指令：${lastRepeatableCommandText}。${message}`;
      setInput(lastRepeatableCommandText);
      setParsedCommands(results);
      setRecognizedText(text.trim() || "未输入文本。");
      setExecutionMessage(repeatMessage);
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, repeatMessage);
      speakFeedback(repeatMessage);
      return;
    }

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
      setIsVoiceHelpVisible(false);
      setIsCommandHistoryVisible(false);
      appendCommandHistory(text, stopMessage);
      speakFeedback(stopMessage);
      return;
    }

    const resolvedText = resolveContextualCommand(text, selectedTargetId);
    const results = parseCommandSequence(resolvedText);
    const message = executeParsedCommands(results);
    setParsedCommands(results);
    setRecognizedText(text.trim() || "未输入文本。");
    setExecutionMessage(message);
    setIsVoiceHelpVisible(false);
    setIsCommandHistoryVisible(false);
    if (results.every(isRepeatableCommand)) {
      setLastRepeatableCommandText(resolvedText.trim());
    }
    appendCommandHistory(text, message);
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
          {speech.isContinuous ? "连续语音" : speech.isListening ? "正在听" : "PR 25 导出 SVG"}
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
          label="导出 SVG"
          onClick={() => {
            setInput("导出画布");
            executeTextCommand("导出画布");
          }}
        >
          <DownloadSimple size={18} weight="bold" />
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
        {isClearConfirmationPending ? (
          <p className="mt-2 rounded-md border border-[#f59e0b] bg-[#fffbeb] px-3 py-2 text-sm font-semibold text-[#92400e]">
            等待确认：请说“确认清空”或“取消”。
          </p>
        ) : null}
        {lastRepeatableCommandText ? (
          <p className="mt-2 text-xs text-canvas-muted">
            可重复上一条：{lastRepeatableCommandText}
          </p>
        ) : null}
        {selectedTargetId ? (
          <p className="mt-2 text-xs text-canvas-muted">
            当前选中：对象 {selectedTargetId}
          </p>
        ) : null}
        {isVoiceHelpVisible ? (
          <div className="mt-3 rounded-md border border-canvas-line bg-canvas-wash p-3">
            <p className="text-xs font-semibold text-canvas-muted">可说的指令示例</p>
            <ul className="mt-2 grid gap-1 text-sm">
              {voiceHelpExamples.map((example) => (
                <li key={example}>“{example}”</li>
              ))}
            </ul>
          </div>
        ) : null}
        {isCommandHistoryVisible ? (
          <div className="mt-3 rounded-md border border-canvas-line bg-canvas-wash p-3">
            <p className="text-xs font-semibold text-canvas-muted">最近命令</p>
            {commandHistory.length > 0 ? (
              <ol className="mt-2 grid gap-2 text-sm">
                {commandHistory.map((item) => (
                  <li key={`${item.text}-${item.message}`}>
                    <span className="font-semibold">“{item.text}”</span>
                    <span className="block text-xs text-canvas-muted">{item.message}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm">还没有命令历史。</p>
            )}
          </div>
        ) : null}
        {parsedCommands.length > 0 ? (
          <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-canvas-wash p-3 text-xs leading-5 text-canvas-ink">
            {JSON.stringify(parsedCommands.length === 1 ? parsedCommands[0] : parsedCommands, null, 2)}
          </pre>
        ) : null}
      </div>
    </aside>
  );
}
