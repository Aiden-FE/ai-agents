# @maka/tui

终端 shell，基于 [`@ai-sdk/tui`](https://www.npmjs.com/package/@ai-sdk/tui) 渲染 `@maka/core` 提供的 agent。

本包**不包含** agent 逻辑、模型配置或 profile 解析 —— 这些都在 `@maka/core`。这里只负责终端渲染与交互。

## 快速开始

```bash
cp apps/tui/.env.example apps/tui/.env
#   编辑 apps/tui/.env，填写 AI_GATEWAY_API_KEY

pnpm --filter @maka/tui dev
```

`dev` 会先执行 `tsdown` 构建，再用 `node --env-file-if-exists=.env dist/main.mjs` 启动。改完 `src/` 重新执行即可。

构建由 **tsdown** 完成：`@maka/core` 的源码会被打进产物（它的 dev export 指向 `src/*.ts`），其余依赖 `ai` / `yaml` / `zod` / `@ai-sdk/tui` 保持 external。`tsdown.config.ts` 里的 `deps.onlyBundle: []` 会让任何意外的依赖内联直接让构建失败，避免出现两份 `ai` 实例。

## 操作

| 按键            | 行为                 |
| --------------- | -------------------- |
| `Enter`         | 发送消息             |
| `y` / `n`       | 批准或拒绝 tool call |
| `Esc` / `Ctrl+C` | 退出                |

## 新增一个 shell

新 shell 只需要一个很薄的入口：

```ts
import { createAgent, loadAgentConfig } from '@maka/core'

const config = loadAgentConfig(process.env)
const agent = createAgent(config)
```

## 开发

```bash
pnpm --filter @maka/tui typecheck
pnpm --filter @maka/tui test:run
pnpm --filter @maka/tui build
pnpm --filter @maka/tui lint
```
