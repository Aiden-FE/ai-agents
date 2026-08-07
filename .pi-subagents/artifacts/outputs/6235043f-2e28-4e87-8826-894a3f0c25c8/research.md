# Research: Vercel AI SDK 作为 agent provider 层的能力与缺口核查

**基线版本**：AI SDK 7（`ai@7.0.56`，2026-06 发布的 major；npm 当前 latest 7.0.55/7.0.56）。要求 **Node.js ≥ 22、ESM-only**。[npm: ai](https://www.npmjs.com/package/ai) · [AI SDK 7 公告](https://vercel.com/blog/ai-sdk-7) · [6→7 迁移指南](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)

## Summary

结论：**Vercel AI SDK 能覆盖 provider 层的全部 7 项需求**，其中 6 项是"能"（开箱即用），仅第 6 项（瞬态错误重试策略自定义）为"部分能"——内置重试覆盖 429/5xx（含 529）与 retry-after header，但无可定制重试回调、无流中重试、无 provider fallback，这些需通过 `wrapLanguageModel` 中间件自写。**成本换算（usage→USD）不内置**，需要自带定价表。agent loop / 工具调度 / compaction 确实要自己写（符合规划），SDK 提供的是 model call + streaming + usage + abort 这一层。

---

## 逐项核查

### 1. Anthropic 原生接入 + thinking/reasoning 透传 — ✅ 能

- `@ai-sdk/anthropic` 官方 provider，直连 Messages API，支持 `providerOptions.anthropic.thinking`（含 budget/adaptive）、`sendReasoning`、claude-opus-4-5 起新增的 `effort` 选项。[Anthropic Provider 文档](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) · [anthropic-language-model-options.ts](https://github.com/vercel/ai/blob/a23b6767/packages/anthropic/src/anthropic-language-model-options.ts)
- **thinking blocks 双向透传**：响应中 thinking/redacted-thinking 块被解析为 `reasoning` part，`signature` 保留在 `providerOptions.anthropic.signature`；回传历史消息时（`sendReasoning: true`）signature 会还原成原生 `thinking` block 发回 Anthropic——多轮 agent 循环中 extended thinking 不会断。[anthropic-messages-api.ts（AnthropicThinkingContent 含 signature）](https://github.com/vercel/ai/blob/429b88a7/packages/anthropic/src/anthropic-messages-api.ts) · [convert-to-anthropic-messages-prompt.test.ts（signature→thinking 回传测试）](https://github.com/vercel/ai/blob/429b88a7/packages/anthropic/src/convert-to-anthropic-messages-prompt.test.ts)
- 注：thinking blocks 不能单独加 `cache_control`（由 Anthropic 隐式缓存），源码注释已说明，无需我们处理。[同上 anthropic-messages-api.ts](https://github.com/vercel/ai/blob/429b88a7/packages/anthropic/src/anthropic-messages-api.ts)

**缺口**：无明显缺口。

### 2. OpenAI 兼容端点自定义 baseURL — ✅ 能

- OpenRouter / llama.cpp / 自建 gateway：`createOpenAI({ baseURL })`（[@ai-sdk/openai 文档](https://ai-sdk.dev/providers/ai-sdk-providers/openai)）或更轻量的 `createOpenAICompatible({ name, baseURL, apiKey, includeUsage })`（[@ai-sdk/openai-compatible](https://github.com/vercel/ai/blob/83877a1e/packages/openai-compatible/README.md) · [provider 源码](https://github.com/vercel/ai/blob/main/packages/openai-compatible/src/openai-compatible-provider.ts)）。`includeUsage: true` 可让兼容端点在流式中返回 usage。
- Ollama：官方推荐路径即 OpenAI 兼容端点（`http://localhost:11434/v1`），可用 `createOpenAI` 直连；也有社区 provider（`ollama-ai-provider-v2`、`ai-sdk-ollama`）提供原生 API 能力（think toggle 等）。[Ollama 官方 OpenAI 兼容说明](https://ollama.com/blog/openai-compatibility) · [社区 provider 讨论 #6924](https://github.com/vercel/ai/issues/6924) · [社区 providers 文档含 llama.cpp 条目](https://github.com/vercel/ai/commit/26df14b39808ec235a094970f738d67e6c994691)
- Anthropic 原生 provider 本身也接受 `baseURL`（可指向自建 Anthropic 兼容 gateway）。[anthropic-messages-language-model.ts（AnthropicMessagesConfig.baseURL）](https://github.com/vercel/ai/blob/429b88a7/packages/anthropic/src/anthropic-messages-language-model.ts)

**缺口（小）**：`openai-compatible` 是精简核心包，结构化输出/reasoning 等高级特性取决于端点实现；对非标准端点（如旧版 llama.cpp 无 `stream_options.include_usage`）个别字段可能拿不到，需实测。

### 3. 流式输出：text / partial tool call args / reasoning delta — ✅ 能

- `streamText` 的 `fullStream` 提供完整 part 类型：`text-delta`、`reasoning-delta`、`tool-input-start` / `tool-input-delta`（`inputTextDelta` = 工具参数的 JSON 片段流）/ `tool-call`。Tool call streaming **自 AI SDK 5 起默认开启**（v3/v4 时代曾是 `experimental_toolCallStreaming` opt-in）。[streamText 参考](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) · [stream-text.ts（chunk 类型枚举含 tool-input-delta）](https://github.com/vercel/ai/blob/258c0933/packages/ai/src/generate-text/stream-text.ts) · [Chatbot Tool Usage 文档](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
- `onChunk` 回调可拿到 `text-delta | reasoning-delta | tool-input-start | tool-input-delta | tool-call | tool-result | raw` 等事件，足够实现 CLI 逐 token 渲染与工具参数进度展示。[Generating Text 文档](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- 原始 provider chunk 可通过 `include: { rawChunks: true }` 透出（`raw` part），便于调试。[streamText 参考](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)

**缺口**：无。

### 4. token 用量细分（input/output/cacheRead/cacheWrite）— ✅ 能（成本换算需自写）

- `LanguageModelUsage` 已是一等公民：`inputTokens` + `inputTokenDetails: { noCacheTokens, cacheReadTokens, cacheWriteTokens }` + `outputTokens` + `outputTokenDetails: { textTokens, reasoningTokens }` + `totalTokens`，另有 `raw`（provider 原始 usage）。多步 agent 循环中 SDK 自动跨 step 聚合。[usage.ts 源码](https://github.com/vercel/ai/blob/83877a1e/packages/ai/src/types/usage.ts) · [extended usage PR #10975](https://github.com/vercel/ai/commit/3bd268917570147b8bdc6cebaf90597386a5c509)
- Anthropic 的 cache_write tokens 现在走 `usage.inputTokenDetails.cacheWriteTokens`（旧的 `providerMetadata.anthropic.cacheCreationInputTokens` 已在 #14570 移除）。[commit 832f86f](https://github.com/vercel/ai/commit/832f86fe8d88854da311f34b913bf65413a45fd2)
- 历史 bug 已修：#14482（非流式 generateText 下 Anthropic cacheRead 丢失，2026-04-16 closed/fixed）。[Issue #14482](https://github.com/vercel/ai/issues/14482)

**缺口**：
- **成本（USD）不内置**——SDK 只给 token 数，pricing 表与换算要自己维护（社区有 [`ai-sdk-cost-calculator`](https://www.npmjs.com/package/ai-sdk-cost-calculator) 可参考/直接用；官方 feature request #3932 仍未内置）。[Issue #3932](https://github.com/vercel/ai/issues/3932)
- 走 Vercel AI Gateway 时 provider metadata（cache 细分）曾不透传（#7426，已 closed）；直连 provider 无此问题。

### 5. 中止/中断在途请求 — ✅ 能

- `generateText` / `streamText` 均接受 `abortSignal`（标准 AbortSignal），可从服务端转发请求 signal 直接取消到 LLM API 的在途请求。另有 `onAbort` 回调和细粒度 `timeout`（`totalMs / stepMs / firstChunkMs / chunkMs / toolMs`）。[streamText 参考](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) · [Stopping Streams 文档](https://ai-sdk.dev/docs/advanced/stopping-streams)
- 流被 abort 时会产生 `abort` part，错误处理文档有示例。[Error Handling 文档](https://ai-sdk.dev/docs/ai-sdk-core/error-handling)

**缺口（边缘）**：`toUIMessageStream` 的 `onEnd` 在 abort 时不触发（已记录的已知行为）——我们自写 loop 直接消费 `fullStream` 则不受影响。[Troubleshooting](https://ai-sdk.dev/docs/troubleshooting/stream-abort-handling)

### 6. 瞬态错误重试（429/529/5xx）— ⚠️ 部分能

**内置（够用但不可定制）**：
- `maxRetries` 请求选项，默认 2，指数退避 + jitter；重试判定为 `APICallError.isRetryable`（状态码 408 / 409 / 429 / **≥500 → 覆盖 529**）。[Settings 文档](https://ai-sdk.dev/docs/ai-sdk-core/settings) · [retry 判定逻辑（408/409/429/≥500）](https://github.com/vercel/ai/blob/a23b6767/packages/mcp/src/tool/mcp-client.ts) · [PR #14233 描述确认同一判定](https://github.com/vercel/ai/pull/14233)
- 自动尊重 `retry-after-ms` / `retry-after` header（0–60s 合理区间内优先于退避公式）。[commit 4c8f834（#7246）](https://github.com/vercel/ai/commit/4c8f83444afec3a940900083f8b07cd7f92b801e)
- 重试耗尽抛 `AI_RetryError`（`RetryError.isInstance`），含全部历史错误。[AI_RetryError 文档](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-retry-error)

**缺口（需要自写的部分）**：
- **无可定制重试回调**（按错误类型/次数决定策略）：issue #4842 仍开放，官方建议用中间件。[Issue #4842](https://github.com/vercel/ai/issues/4842)
- **流中失败不重试**：重试只发生在流开始消费前；HTTP 200 后读取 body 时的网络错误（ECONNRESET）默认 `isRetryable=false`，不重试。[Issue #11265](https://github.com/vercel/ai/issues/11265)
- **无 provider/model fallback**：官方明确建议用自定义 middleware 实现。[Issue #2636](https://github.com/vercel/ai/issues/2636)
- 好消息：`wrapLanguageModel({ model, middleware })` 提供 `wrapGenerate` / `wrapStream` 钩子，可以干净地自写重试/fallback/日志层（SDK 自家 caching middleware cookbook 即此模式）。[Middleware 文档](https://ai-sdk.dev/docs/ai-sdk-core/middleware) · [wrap-language-model.ts](https://github.com/vercel/ai/blob/8e7de7b5/packages/ai/src/middleware/wrap-language-model.ts) · [caching middleware 示例](https://github.com/vercel/ai/blob/a23b6767/content/cookbook/01-next/122-caching-middleware.mdx)

### 7. 多模态输入（image）— ✅ 能

- user message content 支持 `FilePart`（`mediaType: 'image/*'`），数据可为 base64 字符串 / Uint8Array / Buffer / ArrayBuffer / URL；`ImagePart` 在 v7 已废弃并指向 FilePart。[ModelMessage 参考](https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message)
- Anthropic provider 的 `supportedUrls` 覆盖 `image/*`（URL 图片直接透传不下载）；PDF 不在 supportedUrls 会被 SDK 先下载内联（#11685，对我们只传 image 无影响）。[Issue #11685](https://github.com/vercel/ai/issues/11685)
- 工具结果也能回传图片（`toModelOutput` 返回 `file-data`），对 coding agent 的截图场景有用。[convertToModelMessages 文档](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages) · [Multi-Modal Agent guide](https://ai-sdk.dev/cookbook/guides/multi-modal-chatbot)

**缺口**：无（image 场景）。

---

## 对"自己写 agent loop"规划的影响（额外发现）

- AI SDK 7 自带 `ToolLoopAgent` / `WorkflowAgent` 甚至 `HarnessAgent`（可驱动 Claude Code/Codex/Pi harness），但按规划我们自写 loop，只需用 `streamText` 原语——上述核查确认原语层完备。[AI SDK 7 公告](https://vercel.com/blog/ai-sdk-7)
- **环境约束**：AI SDK 7 要求 Node ≥ 22 且 ESM-only，CLI 的 `package.json` 需 `"type": "module"`、engines ≥ 22。[迁移指南](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- compaction 需自己实现时，注意 Anthropic reasoning signature 要随压缩后的历史保留/丢弃策略（`sendReasoning: false` 可整体关掉 reasoning 回传）。

## 结论速览

| # | 能力 | 结论 |
|---|------|------|
| 1 | Anthropic 原生 + thinking 透传 | ✅ 能 |
| 2 | OpenAI 兼容 baseURL（OpenRouter/Ollama/llama.cpp/gateway） | ✅ 能 |
| 3 | 流式 text / partial tool args / reasoning delta | ✅ 能 |
| 4 | token 用量细分 input/output/cacheRead/cacheWrite | ✅ 能（USD 成本换算需自写） |
| 5 | AbortSignal 中止在途请求 | ✅ 能 |
| 6 | 瞬态错误重试钩子/中间件 | ⚠️ 部分能（内置默认够用；自定义策略/fallback 需 wrapLanguageModel） |
| 7 | 多模态 image 输入 | ✅ 能 |

## Sources

**Kept:**
- [AI SDK Providers: Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) — thinking/effort/sendReasoning 官方文档
- [packages/anthropic/src/anthropic-messages-api.ts](https://github.com/vercel/ai/blob/429b88a7/packages/anthropic/src/anthropic-messages-api.ts) — thinking signature 类型定义（源码证据）
- [convert-to-anthropic-messages-prompt.test.ts](https://github.com/vercel/ai/blob/429b88a7/packages/anthropic/src/convert-to-anthropic-messages-prompt.test.ts) — signature 回传行为的测试证据
- [OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai) / [openai-compatible README](https://github.com/vercel/ai/blob/83877a1e/packages/openai-compatible/README.md) — baseURL 自定义
- [Ollama OpenAI compatibility](https://ollama.com/blog/openai-compatibility) — Ollama 官方接入路径
- [streamText 参考](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) — 流式 part、abort、timeout、rawChunks
- [packages/ai/src/types/usage.ts](https://github.com/vercel/ai/blob/83877a1e/packages/ai/src/types/usage.ts) — usage 细分字段源码
- [commit 832f86f (#14570)](https://github.com/vercel/ai/commit/832f86fe8d88854da311f34b913bf65413a45fd2) + [Issue #14482](https://github.com/vercel/ai/issues/14482) — cache token 字段的现状与修复
- [Settings（maxRetries）](https://ai-sdk.dev/docs/ai-sdk-core/settings) + [commit 4c8f834](https://github.com/vercel/ai/commit/4c8f83444afec3a940900083f8b07cd7f92b801e) + [PR #14233](https://github.com/vercel/ai/pull/14233) — 内置重试语义
- [Middleware 文档](https://ai-sdk.dev/docs/ai-sdk-core/middleware) + [wrap-language-model.ts](https://github.com/vercel/ai/blob/8e7de7b5/packages/ai/src/middleware/wrap-language-model.ts) — 自写重试层的扩展点
- [Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams) / [ModelMessage](https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message) — abort 与多模态
- [AI SDK 7 公告](https://vercel.com/blog/ai-sdk-7) + [迁移指南](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) — 版本基线、Node 22/ESM 约束

**Dropped:**
- vercel/ai PR #2295（v3 时代 tool-call streaming 实现 PR）— 历史实现细节，已被 v5+ 默认开启的文档取代
- Issue #8795 / #8349（telemetry token 上报偏差）— 影响 telemetry 而非 `result.usage`，不改变结论
- ai-sdk.dev v4/v5 版本化页面 — 以当前稳定版（v7，无版本前缀路径）为准

## Gaps

- 本地代理环境屏蔽了 ai-sdk.dev 与 GitHub raw 的直接抓取，文档细节依赖搜索索引快照 + GitHub blob 页面快照交叉验证；链接本身来自官方域名，未逐页人工打开。
- 未实测：llama.cpp server 旧版本对 `stream_options.include_usage` 的支持程度；OpenRouter 经 `createOpenAI` 时 reasoning 字段的映射行为。建议 PoC 阶段各跑一次冒烟测试。
- 成本换算未选型（自写 pricing 表 vs `ai-sdk-cost-calculator`），留给实现阶段决定。
