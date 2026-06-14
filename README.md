# VoiceCanvas AI

VoiceCanvas AI 是一个面向流程图、结构图和简单示意图创作的 AI 语音绘图 Web Demo。项目会按照独立 PR 逐步实现：先保证 `npm run dev` 可运行，再逐步加入 SVG 画布、文本指令解析、对象编号、对象修改、箭头连接、撤销、歧义提示、Web Speech API 语音输入和登录流程图模板。

## 当前进度

PR 1：初始化项目与基础页面布局。

当前版本包含：

- Next.js 最小可运行项目结构
- 首页基础布局：顶部标题区、左侧控制区、中间画布占位、右侧对象列表、底部示例指令
- README、Git 配置和基础工程配置

后续 PR 才会接入真实 SVG 渲染、指令解析和语音输入。

## 技术栈

- Next.js：用于构建单页 Web Demo 和本地开发服务
- React：用于组件化页面与后续交互状态管理
- TypeScript：用于约束画布元素、指令解析结果等核心数据结构
- Tailwind CSS：用于页面布局和样式
- SVG：后续作为画布渲染方式
- Web Speech API：后续用于浏览器语音识别
- @phosphor-icons/react：用于按钮图标，提升控制区可读性

## 如何运行

```bash
npm install
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

## 示例指令

- 画一个红色圆形
- 在圆形 A 右边画一个蓝色矩形
- 用箭头连接圆形 A 和矩形 B
- 把矩形 B 改成绿色
- 把圆形 A 放大一点
- 生成一个登录流程图

## 设计思路

项目采用“结构化画布状态 + 对象编号 + 空间关系解析 + 歧义确认”的方案。每个画布对象都会有唯一 ID，后续用户可以通过语音或文本精确引用对象，例如“把矩形 B 改成绿色”。

## AI 辅助开发说明

本项目由本人设计功能与交互方案，并使用 AI 编程工具辅助实现。核心功能、功能边界、演示流程和代码整合由本人完成。

## 第三方依赖说明

- `next`：应用框架
- `react` / `react-dom`：前端组件运行时
- `tailwindcss` / `postcss` / `autoprefixer`：样式构建
- `typescript`：类型检查
- `eslint` / `eslint-config-next`：代码质量检查
- `@phosphor-icons/react`：界面按钮图标
