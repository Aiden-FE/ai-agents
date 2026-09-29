# @maka/core

AI Agent 层。所有 shell（`apps/*`）都从这里拿到配置好的 agent，自身只负责渲染与交互。

## 安装

```bash
pnpm add @maka/core
```

## 用法

```ts
import { createAgent, loadAgentConfig } from '@maka/core'

const config = loadAgentConfig(process.env)
const agent = createAgent(config)
```

## 配置来源

优先级由低到高：内置默认值 → profile 文件 → `MAKA_AGENT_*` 环境变量。

`loadAgentConfig()` 是 shell 唯一需要调用的入口：它读 profile 文件、选出 profile、合并环境变量。`resolveAgentConfig()` 与 `createAgent()` 是底层件，可在不想碰文件系统的场景单独使用。

### 环境变量

| 变量                      | 说明                                      | 默认值                    |
| ------------------------- | ----------------------------------------- | ------------------------- |
| `AI_GATEWAY_API_KEY`      | Vercel AI Gateway API key，由 AI SDK 读取 | 必填                      |
| `MAKA_PROFILE`            | 选中的 profile 名                          | 文件中的 `defaultProfile` |
| `MAKA_CONFIG_PATH`        | 配置文件路径                              | `~/maka/config.yaml`      |
| `MAKA_AGENT_MODEL`        | 覆盖 model id                             | `gpt-5-mini`              |
| `MAKA_AGENT_INSTRUCTIONS` | 覆盖 system instructions                  | 内置默认提示词            |
| `MAKA_AGENT_CONTEXT_SIZE` | 模型上下文窗口 token 数                    | 未设置则不显示占比        |

### Profile 文件

默认读取 `~/maka/config.yaml`，可用 `MAKA_CONFIG_PATH` 指向别处。文件不存在时按无 profile 处理，内置默认值照常生效。

```yaml
defaultProfile: work
profiles:
  work:
    model: anthropic/claude-sonnet-4.5
    instructions: You are a concise terminal assistant.
    contextSize: 200000
  personal:
    model: gpt-5-mini
```

profile 里的字段都是可选的，只写要覆盖的部分。schema 用 `strictObject` 定义，未知键会直接报错而不是被静默忽略 —— 拼错 `modle` 会得到明确的 `Unrecognized key` 报错和所在路径。

文件里有 profile 但既没指定 `MAKA_PROFILE` 也没有 `defaultProfile` 时会抛错，并列出可选的 profile 名；文件不存在不算错误。

## 公开 API

### Agent

| 导出                                                  | 说明                                          |
| ----------------------------------------------------- | --------------------------------------------- |
| `loadAgentConfig(env?): AgentConfig`                  | 读 profile 文件并合并环境变量，shell 推荐入口  |
| `resolveAgentConfig(env?, profile?): AgentConfig`     | 纯函数：默认值 < profile < 环境变量            |
| `createAgent(config): ToolLoopAgent`                  | 用 Vercel AI Gateway 创建 agent                |
| `DEFAULT_AGENT_MODEL` / `DEFAULT_AGENT_INSTRUCTIONS` | 内置默认值                                    |
| `AgentConfig` / `AgentEnv` / `ToolLoopAgent`          | 类型                                          |

### Profile

| 导出                                                 | 说明                                      |
| ---------------------------------------------------- | ----------------------------------------- |
| `loadProfileConfig(options?): ProfileConfig`          | 读并校验文件，文件缺失返回空配置          |
| `resolveProfilePath(env?): string`                    | `MAKA_CONFIG_PATH` 或 `~/maka/config.yaml` |
| `parseProfileConfig(source, label?): ProfileConfig`   | 纯函数：解析并校验 YAML 文本              |
| `selectProfile(config, name?): AgentProfile`          | 按名选择，回退到 `defaultProfile`         |
| `agentProfileSchema` / `profileConfigSchema`          | 约束配置文件的 zod schema                  |
| `AgentProfile` / `ProfileConfig`                      | 类型                                      |

### 基础 runtime

| 导出                            | 说明                                    |
| ------------------------------- | --------------------------------------- |
| `hello(name?): string`          | 返回 `` `Hello, ${name}!` ``            |
| `VERSION: string`               | 包的公开版本号                          |
| `CoreOptions` / `CoreSnapshot`  | `Core` 的构造选项 / `snapshot()` 返回值 |
| `Core` / `createCore(options?)` | 最小 core runtime                       |

## 源码布局

| 文件              | 职责                                          |
| ----------------- | --------------------------------------------- |
| `agent.ts`        | 纯逻辑：配置合并 + `createAgent`               |
| `profile.ts`      | zod schema、YAML 解析、profile 选择（无 I/O）  |
| `profile-file.ts` | 唯一做文件 I/O 的地方                          |
| `core.ts`         | 基础 runtime 与版本号                          |
| `index.ts`        | barrel                                        |

`agent.ts` 和 `profile.ts` 不碰文件系统，`process.env` 一律以参数传入，便于测试和在非 Node 运行时复用。

## 开发

```bash
pnpm install
pnpm --filter @maka/core typecheck
pnpm --filter @maka/core test:run
pnpm --filter @maka/core build
```

构建工具为 **tsdown**（输出 Node 24+ ESM `.mjs`），单元测试工具为 **Vitest**，代码风格由仓库根的 **Biome** 统一管理。`publint` 可校验发布包结构。

构建结果位于 `dist/`：

- ESM：`dist/index.mjs`
- TypeScript declarations：`dist/index.d.mts`
- Source maps
