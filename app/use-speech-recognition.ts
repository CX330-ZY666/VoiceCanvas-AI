"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type SpeechRecognitionInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechRecognition() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const speechWindow = window as SpeechWindow;

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function useSpeechRecognition(onFinalText: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("语音输入待启动。");

  useEffect(() => {
    const Recognition = getSpeechRecognition();

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setMessage(`语音识别失败：${event.error}`);
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      const currentText = finalText || interimText;

      if (currentText) {
        setMessage(currentText);
      }

      if (finalText.trim()) {
        onFinalText(finalText.trim());
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.stop();
    };
  }, [onFinalText]);

  function startListening() {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setMessage("当前浏览器不支持 Web Speech API，请使用文本输入。");
      return;
    }

    try {
      recognition.start();
      setIsListening(true);
      setMessage("正在听，请说出绘图指令。");
    } catch {
      setMessage("语音识别已经在运行。");
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setMessage("已停止语音输入。");
  }

  return {
    isListening,
    isSupported: Boolean(getSpeechRecognition()),
    message,
    startListening,
    stopListening
  };
}
