import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceCanvas AI",
  description: "用语音创建流程图、结构图和简单示意图"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
