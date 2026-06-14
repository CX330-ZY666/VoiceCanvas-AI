"use client";

import { useCallback, useState } from "react";

function getSpeechSynthesis() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.speechSynthesis;
}

export function useSpeechSynthesis() {
  const [message, setMessage] = useState("语音反馈待启动。");

  const speak = useCallback((text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    const synthesis = getSpeechSynthesis();

    if (!synthesis || typeof SpeechSynthesisUtterance === "undefined") {
      setMessage("当前浏览器不支持语音反馈。");
      return;
    }

    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "zh-CN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setMessage("语音反馈播放完成。");
    utterance.onerror = () => setMessage("语音反馈播放失败。");

    setMessage(cleanText);
    synthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    getSpeechSynthesis()?.cancel();
    setMessage("已停止语音反馈。");
  }, []);

  return {
    isSupported: Boolean(getSpeechSynthesis()),
    message,
    speak,
    stop
  };
}
