# Research: OpenAI Codex 产品线当前真实用户体验（克隆项目依据）

> **研究时间：2026-03-10。**本文将 OpenAI Developer Docs、OpenAI 产品公告、开源仓库代码视为**已确认**的一手依据；GitHub issue / 社区帖子仅用来描述可复现的界面细节或已知体验缺口，并明确标成“观察报告”，不把它们当产品承诺。CLI 版本变化很快，克隆实现应在启动时以 `codex --help` / `codex exec --help` 重新核验。

## Summary

**已确认：Codex 不再只有 CLI。**无子命令的 `codex` 是交互式终端 TUI；`codex exec`（别名 `e`）是面向脚本/CI 的非交互运行，并支持 JSONL 事件流和恢复。它采用“**sandbox 决定能做什么**、**approval policy 决定何时停下来问**”的两层模型；本地配置与会话状态默认集中在 `~/.codex`。 [CLI reference](https://developers.openai.com/codex/cli/reference) · [Approvals & security](https://developers.openai.com/codex/agent-approvals-security)

**已确认：存在原生 Codex desktop app。**最初为 macOS，OpenAI 公告在 2026-03-04 更新称 Windows 也已可用；另有 VS Code 及兼容 fork 的 IDE extension、ChatGPT/Codex web/cloud 表面。桌面端核心是项目/多 agent thread、worktree、聊天、集成终端和可操作的 Git review pane，而非传统单一 IDE。 [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/) · [Plan FAQ](https://help.openai.com/en/articles/11369540-using-codex)

---

## Findings

### 1. Codex CLI：命令面、流式过程与文件修改

1. **已确认 — 两种基本运行形态。**`codex`（无 subcommand）启动交互式 terminal UI (TUI)，可直接接收 prompt 和图片附件；`codex exec` / `codex e` 运行会结束的非交互任务，适合 CI 或管道。`exec` 默认输出人类可读的格式化文本；`--json` 改为每一次状态变化一行的 JSONL。文档列出的事件类别包括 `thread.started`、`turn.started`、`item.*`、`turn.completed` / `turn.failed` 和 `error`，因此克隆品应把 run/turn/tool item 作为首级事件，而不是只输出最终回答。 [CLI reference](https://developers.openai.com/codex/cli/reference) · [Non-interactive mode](https://developers.openai.com/codex/noninteractive)

2. **已确认 — 当前文档列出的关键 top-level/subcommand 表面。**除基础 TUI 外有 `apply`（把最近 cloud chat 的 diff 用 `git apply` 落到本地，冲突时非零退出）、`cloud`（交互 picker；`cloud exec` 直接提交任务；`cloud list` 取近期 chats）、`exec` / `exec resume`、`resume`、`fork`、`features`、`execpolicy check`（preview）与 `sandbox` helper。非交互恢复可用 `codex exec resume --last "…"` 或明确 session ID；交互恢复可用 `codex resume --last`，`--all` 扩大为跨工作目录搜索。 [CLI reference](https://developers.openai.com/codex/cli/reference) · [Non-interactive mode](https://developers.openai.com/codex/noninteractive)

3. **已确认 — 应优先复刻的 flags / 控制项。**文档明确示例和/或定义了 `--model`、`--profile <name>`、`-c key=value`（本次覆盖 config）、`--sandbox <read-only|workspace-write|danger-full-access>`、`--ask-for-approval/-a <untrusted|on-request|never>`、`--search`、`--add-dir`、`--dangerously-bypass-approvals-and-sandbox`（别名 `--yolo`）、`--json`、`--output-last-message`、`--ephemeral`、`--ignore-user-config`、`--ignore-rules`、`--skip-git-repo-check`。新脚本应使用显式 `--sandbox workspace-write`，而不是已弃用兼容 flag `codex exec --full-auto`。注意：文档说明 flags 是否能置于 `exec` 前/后应以该版本 `--help` 为准，历史上曾有 `--ask-for-approval` 在 `exec` 后被拒绝的 CLI/docs 不一致报告。 [CLI reference](https://developers.openai.com/codex/cli/reference) · [Non-interactive mode](https://developers.openai.com/codex/noninteractive) · [已知 flags 不一致 issue（非规范）](https://github.com/openai/codex/issues/26602)

4. **已确认 — TUI 的 diff 是“已落地后 Git diff”检查。**输入 `/diff` 后 CLI 在自身 scrollable 输出中显示 Git diff，并包含 staged、unstaged 和 Git 未跟踪文件；TUI 会对 fenced Markdown code 与文件 diff 语法高亮。也就是说，官方文档确认的是 **review 已写入的工作树改动**，不是保证每个 patch 先在 native editor 中暂存等待接受。 [Slash commands](https://developers.openai.com/codex/cli/slash-commands) · [CLI customization](https://developers.openai.com/codex/cli-customization)

5. **观察报告（有第一方 GitHub issue 的屏幕文本，非稳定 API）— terminal inline approval 的具体形态。**写文件时可出现 `Would you like to make the following edits?`，先列出路径、`(+N -M)` 与带 `+`/`-` 的 patch 行，再给选择。已报告的 Codex UI 字面文案为：`1. Yes, proceed (y)`；`2. Yes, and don't ask again for this command (a)`（实际 scope 可随请求显示为 command/files）；`3. No, and tell Codex what to do differently (esc)`。另一个 issue 示例显示编辑审批至少有“`1. Yes, proceed` / `2. No, and tell Codex what to do differently esc`”两项形态。故克隆品应实现的**稳定语义**是 approve-once、remember scoped allowance、deny+feedback；不要硬编码所有 prompt 永远有同样三项或同样快捷键。 [Issue #7744](https://github.com/openai/codex/issues/7744) · [Issue #5253](https://github.com/openai/codex/issues/5253)

6. **已确认 — tool/action 可视化的可依赖边界。**TUI 运行时有工作进度，Esc 可中断（开源/生态观察常见为 `Working (Ns • esc to interrupt)`）；机器接口把每个状态改变输出为 JSONL `item.*`。产品克隆可安全地显示：assistant text 流、一个具状态的 tool row（开始、参数摘要、执行中、成功/失败/取消）以及 turn 完结状态；但 OpenAI 文档并未承诺特定 spinner、emoji、命令卡片的像素样式。 [Non-interactive mode](https://developers.openai.com/codex/noninteractive) · [Issue #7744（观察）](https://github.com/openai/codex/issues/7744)

### 2. CLI：审批、sandbox 与配置/历史

7. **已确认 — sandbox 三档（legacy 配置模型，仍受支持）。**`read-only` 允许检查文件，编辑、命令和网络访问需要批准；`workspace-write` 可在 workspace 内读、写、运行常规本地命令，默认网络关闭，越出 workspace 或网络需批准；`danger-full-access` 移除文件系统及网络 sandbox 边界。`--yolo` 同时绕过 sandbox 和 approvals，不建议常规使用。当前文档也引入 permission profiles：`:read-only`、`:workspace`、`:danger-full-access`；profiles 与旧 `sandbox_mode` 系统不要混用。 [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security) · [Permissions](https://developers.openai.com/codex/permissions)

8. **已确认 — approval policy 三档与推荐组合。**`untrusted`：仅已知安全读操作自动运行，不可信命令需问；`on-request`：先在 sandbox 内运行，越界时请求；`never`：不弹审批。`workspace-write + on-request` 是 Auto/低摩擦本地工作的推荐组合；`read-only + on-request` 用于只读审查；`danger-full-access + never` 才是 Full access。审批 reviewer 可为默认 `user`，或 `auto_review`（把符合条件的请求给 reviewer agent）；TUI `/permissions` 可在 session 中切到例如 Auto 或 Read Only，`/approve` 只批准一次被自动 reviewer 拒绝的重试。 [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security) · [Sandboxing](https://developers.openai.com/codex/concepts/sandboxing) · [CLI slash commands](https://developers.openai.com/codex/cli/slash-commands)

9. **已确认 — TOML config 的位置和层级。**`CODEX_HOME` 默认 `~/.codex`；用户默认设置为 `~/.codex/config.toml`，repo override 为 `.codex/config.toml`（仅信任项目时加载）；profile 是 `$CODEX_HOME/<profile>.config.toml`，以 `codex --profile <profile>` 选择。CLI `-c key=value` 优先于文件配置。CLI、IDE extension 和 app 共享这套 Codex settings 层；IDE 自己的呈现设置另走 VS Code 的 `chatgpt.*` settings。 [Configuration reference](https://developers.openai.com/codex/config-reference) · [IDE settings](https://developers.openai.com/codex/ide/settings) · [Environment variables](https://developers.openai.com/codex/environment-variables)

10. **已确认 — 核心 config 字段与最小可复刻 TOML。**确认可配 `model`、`model_reasoning_effort`、`approval_policy`、`approvals_reviewer`、`sandbox_mode`、`[sandbox_workspace_write].network_access`、`[history].persistence` / `max_bytes` 和 MCP；sample config 的默认式样包含 `approval_policy = "on-request"`、`sandbox_mode = "read-only"`。`history.persistence` 取 `save-all | none`。示例：

```toml
# ~/.codex/config.toml
model = "gpt-5.4"                 # 示例模型名；可用性随帐号/版本而变
approval_policy = "on-request"    # untrusted | on-request | never
sandbox_mode = "workspace-write"  # read-only | workspace-write | danger-full-access
approvals_reviewer = "user"       # 或 auto_review

[sandbox_workspace_write]
network_access = false

[history]
persistence = "save-all"          # 或 none
max_bytes = 10485760               # 可选，超限会保留较新记录并压缩
```

[Sample configuration](https://developers.openai.com/codex/config-sample) · [Advanced configuration](https://developers.openai.com/codex/config-advanced)

11. **已确认 — 会话的本地持久化与恢复。**默认状态目录含 `config.toml`、`auth.json`（或 OS keychain）、`history.jsonl`、logs/cache；session transcript 位于 `$CODEX_HOME/sessions`，archive 位于 `$CODEX_HOME/archived_sessions`。开源 recorder 进一步确认 rollout 是 JSONL，默认路径为 `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<thread-id>.jsonl`；app-server 的 archive 是把该 JSONL 移入 archived 目录，resume 则重新 append/恢复该 thread。`--ephemeral` 禁止 `exec` 写 rollout。克隆品可采用“append-only event log + session picker + archive”模型，而不要只依赖内存聊天。 [Advanced configuration](https://developers.openai.com/codex/config-advanced) · [App troubleshooting](https://developers.openai.com/codex/app/troubleshooting) · [Open-source recorder](https://github.com/openai/codex/blob/main/codex-rs/rollout/src/recorder.rs)

### 3. Desktop、IDE 与 web：存在性、布局及交互

12. **已确认 — native desktop app 确实存在，且不是“最接近的替代物”。**OpenAI 最初发布 macOS Codex app；公告的 2026-03-04 update 说已支持 Windows。它是“command center for agents”：多 agent 可在项目中的独立 threads 并行运行，支持 worktrees；用户能在 thread 内 review diff、对 diff 评论、打开 editor 手动改。app 会复用 CLI/IDE 的 session history 和 config。 [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/) · [Codex product page](https://openai.com/codex/)

13. **已确认 — desktop app 信息架构（可直接用于 wireframe）。**
   - **左 sidebar：**项目与 chats；可按项目状态过滤、查看 archived chats；Scheduled 是有未读标记的 run inbox。Pull request 情境下 sidebar 有 PR context/reviewer feedback。
   - **中间主区：**当前 chat/thread 与 composer；一个 chat 可运行在 local checkout 或 worktree，chat header 可 Hand off。多个 agent 是不同 threads，而不是一条 timeline 混叠。
   - **底部 panel：**integrated terminal（`Ctrl+\`` toggle）；常用 action 在 app top bar 且在该 terminal 内运行。
   - **review pane：**可切换 Unstaged、Staged、Commit、Branch、Last turn；支持行内评论，且有整份/单文件/单 hunk 的 stage、unstage、revert，以及 commit/push/create PR。最后一项 “Last turn” 是非常值得复制的 turn 边界。 [App review](https://developers.openai.com/codex/app/review) · [Local environments](https://developers.openai.com/codex/app/local-environments) · [App commands](https://developers.openai.com/codex/app/commands) · [Automations](https://developers.openai.com/codex/app/automations)

14. **已确认 — GUI approvals。**desktop app composer 下方有 permissions control；按配置可出现 **Ask for approval**、**Approve for me**（只覆盖 eligible requests）、**Full access**、命名/custom profile。Windows 文档明确要求选择 composer 下的 Ask for approval 才应用 sandbox；阻塞的 chat 排障第一步也是检查是否等待 approval。Computer Use 和 browser 还有各自的 app/site allow：Computer Use 可 “Always allow” 某 app，browser 会在未允许站点及敏感提交/购买/删除时确认。这些是本地 command sandbox/approval 之外的独立控制面。 [Sandboxing](https://developers.openai.com/codex/concepts/sandboxing) · [Windows app](https://developers.openai.com/codex/app/windows) · [Computer Use](https://developers.openai.com/codex/app/computer-use) · [In-app browser](https://developers.openai.com/codex/app/browser)

15. **已确认 — IDE extension 的确定边界。**官方有 Codex VS Code extension，兼容多数 VS Code forks；CLI/IDE 共享 `config.toml` 的 model、reasoning、permissions、sandbox、MCP 等 agent 配置。extension 有 sidebar/panel、new chat/new Codex panel/open sidebar 命令、将选择范围或整个文件添加到 thread 的命令；其 chat font 和代码/差异 font 可独立取 VS Code setting。 [Plan FAQ](https://help.openai.com/en/articles/11369540-using-codex) · [IDE commands](https://developers.openai.com/codex/ide/commands) · [IDE settings](https://developers.openai.com/codex/ide/settings)

16. **观察报告 — IDE “先预览再落盘”的体验并不应被当作已确认能力。**多个官方仓库 issue 中的用户/维护者讨论显示，extension 曾把 edit 直接写入工作树；chat 内有较小 diff，完成/接受后可用 “View all changes” 开较大的 editor diff，但**没有确认稳定的 VS Code native、逐 hunk、pre-apply accept/reject**工作流。该体验正在迭代，且版本差异可见。因此 clone 如要匹配可靠的当前基线，应使用“edit 落盘 → Git/review diff → stage/revert”，不要声称是 Copilot 式 proposed edit；如果要超越原品，pre-apply full-size diff + per-hunk accept/reject 是明确的产品机会。 [Issue #2998（观察）](https://github.com/openai/codex/issues/2998) · [Issue #12082（观察）](https://github.com/openai/codex/issues/12082) · [Issue #2932（观察）](https://github.com/openai/codex/issues/2932)

17. **已确认 — web/cloud 的运行与流式边界。**Codex web 使用同一 harness，但在容器中运行 App Server；browser 与后端间以 HTTP + SSE stream task events。服务器保存 thread state，因此 tab 关闭/网络掉线后任务可继续，新 session 能重新连接并赶上进度。该架构说明 web 应有独立 cloud task/thread 状态，而不是浏览器 tab 内临时对话。 [App Server architecture](https://openai.com/index/unlocking-the-codex-harness/)

18. **未确认 / 不应伪造为事实 — 像素级视觉规范。**已查一手 docs 没有发现公开、可引用的 Codex 设计 token，例如确切 hex colors、font family、字号、行高、卡片 radius 或 dark/light palette。文档只确认 CLI `/theme` 会打开 theme picker 并把选择保存为 `tui.theme`，以及 IDE chat/code font 可配置。故“黑/白/绿是什么精确色”“桌面是否为特定字体”“timeline 是否精确用某图标”均应标作设计推测，不能写入竞品事实表。 [CLI customization](https://developers.openai.com/codex/cli-customization) · [IDE settings](https://developers.openai.com/codex/ide/settings)

### 4. 值得复刻的交互约定（以及不应过度复制的部分）

| 约定 | 确认程度与来源 | 克隆建议 |
|---|---|---|
| **Terminal diff = 可滚动、语法高亮的 unified Git diff** | 已确认 `/diff` 输出覆盖 staged/unstaged/untracked；TUI 高亮 diff。 | tool card 只显示文件名/统计/摘要；把完整 diff 放在可滚动专用视图。 |
| **GUI diff = Git-aware review pane，不是聊天气泡代码块** | 已确认 app 有 Unstaged/Staged/Commit/Branch/**Last turn** 视图和 per-hunk Git actions。 | 以“changed files → hunks → actions”的层级实现 review，并把 Last turn 当一等 filter。 |
| **Tool activity 与最终回复分开** | 已确认 `--json` 的 `item.*`、turn/thread event 模型。 | 每次 action 显示 `running / completed / failed / approval required`，不要把 shell output 混入 assistant prose。 |
| **审批 scope 必须可见且可记忆** | 已确认 policy、profiles、`/permissions`；TUI 具体 yes/remember/no 为观察报告。 | approval sheet 显示理由、命令/文件范围、一次允许、在限定 scope/session 记住、拒绝并反馈；显示当前权限 badge。 |
| **turn/run 有清楚边界** | 已确认 JSON 有 `turn.started/completed/failed`，app 有 Last turn，web thread 持续。 | 一个 user submit 创建一个 turn；把 tool 序列归属该 turn；完成时给 summary + changes/test 状态。 |
| **授权与 sandbox 分离** | 已确认。 | 不要把“确认一次”误实现为扩张 filesystem/network 边界；Full access 明确为高风险双开关。 |
| **跨表面共用同一 config/history** | 已确认 CLI、IDE、app 共享 config，app 接手 CLI/IDE history。 | 固定 `CODEX_HOME` 风格 state root，统一 thread ID、event log、permission profile。 |

## Confirmed facts vs. speculation

### Confirmed facts suitable for direct replication
- `codex` TUI、`codex exec` 非交互、JSONL 事件、session resume/archival、TOML config 的路径/层级和 sandbox/approval 两层模型。
- 原生 desktop app（macOS + Windows）、VS Code extension、web/cloud；desktop app 的 sidebar/project/thread/review/terminal/worktree 信息结构。
- GUI 的 Git review 行为（按文件、hunk stage/revert）及 Last turn diff filter。
- app/CLI/IDE 共享 agent config 与本地 session state。

### Speculation / 需自己实测，不能当作产品保证
- TUI approval 菜单每次是否有三项、第二项具体记忆范围、快捷键、文案和 patch panel 尺寸；现有证据为 issue 中 UI 文本。
- VS Code extension 是否在某一最新版本新增 pre-apply native diff 或改变默认审批。公开 issue 描述的是用户观察，而非 API contract。
- 任何精确配色、字体、间距、暗亮主题 token、spinner/图标或 desktop timeline 的像素细节。
- 文档中曾出现 legacy `--full-auto`、permission profiles 与旧 sandbox model 并存；运行时有效 UI/flag 依安装版本和企业 policy 而变。

## Sources

### Kept（高价值一手来源）
- [Command line options – Codex CLI](https://developers.openai.com/codex/cli/reference) — TUI/exec、subcommands、flags、`/diff`、resume 的规范入口。
- [Non-interactive mode – Codex](https://developers.openai.com/codex/noninteractive) — `exec`、JSONL events、ephemeral 与 CI 行为。
- [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security) — approval/sandbox 的概念与组合。
- [Permissions](https://developers.openai.com/codex/permissions) — 新 permission profile 模型及与 legacy sandbox 的关系。
- [Configuration reference](https://developers.openai.com/codex/config-reference) / [Sample configuration](https://developers.openai.com/codex/config-sample) / [Advanced configuration](https://developers.openai.com/codex/config-advanced) — config/state/history 的实据。
- [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/) — 原生 app 的存在、平台、并行 threads/worktrees/history。
- [Review – Codex app](https://developers.openai.com/codex/app/review) / [Local environments](https://developers.openai.com/codex/app/local-environments) — review pane 的实际 IA 与 Git actions。
- [Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/) — desktop/IDE/web 共用 harness 及 web SSE/持久 thread 架构。
- [Open-source rollout recorder](https://github.com/openai/codex/blob/main/codex-rs/rollout/src/recorder.rs) — JSONL session 文件的精确持久化机制。

### Kept（仅作观察证据）
- [Issue #7744](https://github.com/openai/codex/issues/7744) / [Issue #5253](https://github.com/openai/codex/issues/5253) — TUI approval 文案及 edit prompt 的实测文本。
- [Issue #2998](https://github.com/openai/codex/issues/2998) / [Issue #12082](https://github.com/openai/codex/issues/12082) / [Issue #2932](https://github.com/openai/codex/issues/2932) — IDE diff preview 的已知实际缺口，不能当正式承诺。

### Dropped
- 搜索结果中的第三方 CLI 比较/教程、SEO 文章、Reddit/YouTube — 无法稳定反映当前 release，且不提供官方契约。
- 旧 commit 指向的 sandbox docs — 当前 Developer Docs 已覆盖且更适合“当前产品线”结论。

## Gaps

1. **像素级视觉语言没有公开一手规范。**若 clone 需要视觉接近，应在拥有 Codex app/extension 的测试机上做截图审计（macOS/Windows、dark/light、窄宽度）并记录版本号；不要以本文推断取代观察。
2. **审批菜单是版本/动作/企业 policy 敏感的。**建议用真实 `read-only + on-request` 试验分别触发 file edit、workspace external write、network command、destructive command，录制每种 prompt 的文本、scope 和 remembered 行为。
3. **CLI flags 需按目标 binary 做 contract test。**特别是 `codex exec` 前/后 placement、deprecated `--full-auto`、permission profile 与 legacy settings 的优先级。
4. **IDE pre-apply diff 状态不宜从 issues 推导为绝对事实。**应在目标版本运行一次受控 edit，并保存 extension version、设置、是否落盘、View all changes 的时机。

## Acceptance report

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Concrete, source-linked findings are written to /Users/aiden/dev/aiden/ai-agents/research.md. The report names the researched artifact path, distinguishes confirmed facts from observation/speculation, and identifies product/research gaps."
    }
  ],
  "changedFiles": [
    "/Users/aiden/dev/aiden/ai-agents/research.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "web_search (four focused source passes) and selected fetch_content retrieval",
      "result": "passed",
      "summary": "Collected OpenAI Developer Docs, OpenAI product announcements, and open-source Codex source/issue evidence. Several Developer Docs direct fetches returned HTTP 403, so their indexed snippets and direct URLs were retained and this limitation is reflected in the research boundaries."
    }
  ],
  "validationOutput": [
    "research.md contains all four requested coverage areas, source URLs, a confirmed-vs-speculation split, Sources, Gaps, and this acceptance report."
  ],
  "residualRisks": [
    "Exact terminal approval option wording/scope is observational and can vary by CLI version and action type.",
    "No official public visual-token specification was found; colors, typography, density, and precise component geometry require screenshot-based validation.",
    "IDE diff behavior may vary by extension release; current public issues are evidence of observed gaps, not a formal compatibility contract."
  ],
  "noStagedFiles": true,
  "diffSummary": "Created research.md with an attested current-product UX brief and implementation-oriented conventions.",
  "reviewFindings": [
    "no blockers: required research artifact exists at the authoritative path; unconfirmed details are explicitly labeled rather than asserted."
  ],
  "manualNotes": "No repository source code was modified; this task produced the requested research artifact only."
}
```
