import { VoiceCanvasWorkbench } from "./voice-canvas-workbench";

const exampleCommands = [
  "画一个红色圆形",
  "在圆形 A 右边画一个蓝色矩形",
  "用箭头连接圆形 A 和矩形 B",
  "把矩形 B 改成绿色",
  "把圆形 A 放大一点",
  "生成一个登录流程图"
];

export default function Home() {
  return (
    <main className="min-h-[100dvh] px-4 py-5 text-canvas-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <header className="rounded-lg border border-canvas-line bg-white px-5 py-4 shadow-panel">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-canvas-accent">
                Web Demo
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-canvas-ink md:text-4xl">
                VoiceCanvas AI
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-canvas-muted">
                用语音创建流程图、结构图和简单示意图。当前 PR 接入 SVG
                画布示例渲染，后续再逐步实现指令解析与交互执行。
              </p>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-md border border-canvas-line bg-canvas-wash px-3 py-2 text-sm text-canvas-muted">
              <span className="h-2 w-2 rounded-full bg-canvas-accent" />
              当前模式：本地规则解析
            </div>
          </div>
        </header>

        <VoiceCanvasWorkbench />

        <footer className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
          <h2 className="text-base font-bold">可尝试的指令</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {exampleCommands.map((command) => (
              <span
                className="rounded-md border border-canvas-line bg-canvas-wash px-3 py-2 text-sm text-canvas-muted"
                key={command}
              >
                {command}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
