import {
  ArrowCounterClockwise,
  Broom,
  Microphone,
  PaperPlaneTilt,
  StopCircle
} from "@phosphor-icons/react/dist/ssr";
import { demoCanvasElements, getElementLabel } from "./canvas-data";
import { SvgCanvas } from "./svg-canvas";

const exampleCommands = [
  "画一个红色圆形",
  "在圆形 A 右边画一个蓝色矩形",
  "用箭头连接圆形 A 和矩形 B",
  "把矩形 B 改成绿色",
  "把圆形 A 放大一点",
  "生成一个登录流程图"
];

const visibleObjects = demoCanvasElements.map((item) => ({
  id: item.id,
  type: getElementLabel(item),
  color: item.color ?? "黑色",
  position:
    item.type === "arrow" ? `${item.fromId} -> ${item.toId}` : `x: ${item.x}, y: ${item.y}`,
  description:
    item.type === "arrow"
      ? `箭头：${item.fromId} 指向 ${item.toId}`
      : `${getElementLabel(item)}：${item.color ?? "黑色"}`
}));

function ToolbarButton({
  label,
  children,
  variant = "secondary"
}: Readonly<{
  label: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}>) {
  const variantClass =
    variant === "primary"
      ? "border-canvas-accent bg-canvas-accent text-white hover:bg-[#18765f]"
      : "border-canvas-line bg-white text-canvas-ink hover:bg-[#f0f3f5]";

  return (
    <button
      className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition duration-200 active:translate-y-px ${variantClass}`}
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

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

        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between border-b border-canvas-line pb-3">
              <h2 className="text-base font-bold">控制区</h2>
              <span className="text-xs font-medium text-canvas-muted">PR 2 占位</span>
            </div>
            <div className="mt-4 grid gap-3">
              <ToolbarButton label="开始语音输入">
                <Microphone size={18} weight="bold" />
              </ToolbarButton>
              <ToolbarButton label="停止语音输入">
                <StopCircle size={18} weight="bold" />
              </ToolbarButton>
              <ToolbarButton label="清空画布">
                <Broom size={18} weight="bold" />
              </ToolbarButton>
              <ToolbarButton label="撤销">
                <ArrowCounterClockwise size={18} weight="bold" />
              </ToolbarButton>
            </div>

            <label className="mt-5 block text-sm font-semibold" htmlFor="command">
              文本指令
            </label>
            <textarea
              className="mt-2 min-h-28 w-full resize-none rounded-md border border-canvas-line bg-canvas-wash px-3 py-3 text-sm outline-none transition focus:border-canvas-accent focus:bg-white"
              id="command"
              placeholder="例如：画一个红色圆形"
            />
            <div className="mt-3">
              <ToolbarButton label="执行指令" variant="primary">
                <PaperPlaneTilt size={18} weight="bold" />
              </ToolbarButton>
            </div>

            <div className="mt-5 rounded-md border border-canvas-line bg-canvas-wash p-3">
              <p className="text-xs font-semibold text-canvas-muted">当前识别文本</p>
              <p className="mt-2 text-sm">等待语音输入。</p>
            </div>
            <div className="mt-3 rounded-md border border-canvas-line bg-white p-3">
              <p className="text-xs font-semibold text-canvas-muted">系统反馈</p>
              <p className="mt-2 text-sm">SVG 画布已接入，当前展示基础图形示例。</p>
            </div>
          </aside>

          <section className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between border-b border-canvas-line pb-3">
              <h2 className="text-base font-bold">SVG 画布</h2>
              <span className="font-mono text-xs text-canvas-muted">900 x 600</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-canvas-line bg-canvas-wash p-3">
              <SvgCanvas elements={demoCanvasElements} />
            </div>
          </section>

          <aside className="rounded-lg border border-canvas-line bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between border-b border-canvas-line pb-3">
              <h2 className="text-base font-bold">对象列表</h2>
              <span className="text-xs font-medium text-canvas-muted">示例数据</span>
            </div>
            <div className="mt-4 divide-y divide-canvas-line overflow-hidden rounded-md border border-canvas-line">
              {visibleObjects.map((item) => (
                <div className="grid gap-2 bg-white p-3 text-sm" key={item.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">对象 {item.id}</span>
                    <span className="rounded bg-canvas-wash px-2 py-1 text-xs text-canvas-muted">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-canvas-muted">颜色：{item.color}</p>
                  <p className="font-mono text-xs text-canvas-muted">{item.position}</p>
                  <p className="text-xs leading-5 text-canvas-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

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
