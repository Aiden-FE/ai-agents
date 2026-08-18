# cpa 产品设计基线

**状态：已确认，待实施**  
**确认方式：Grilling + Domain Modeling，2026-08-18**

本文记录桌面端与终端端产品的共享设计共识。它是实施入口，不替代 `CONTEXT.md` 的领域词汇表，也不替代各 ADR 的决策理由。

## 1. 产品定位

`cpa` 是一个面向本地代码仓库的编程 Agent 产品，包含两个 Client：

- **CLI Client**：终端中的交互式 TUI 与非交互命令，命令名为 `cpa`。
- **Desktop Client**：Tauri + React 原生桌面应用，视觉和核心工作流高度参考 Codex Desktop，但使用自己的主题与品牌色。

两个 Client 不各自实现 Agent 核心，而是连接同一个本地 Agent Runtime。

## 2. 领域模型

```text
Workspace（工作区）
└── Session（会话）
    ├── Task（任务）
    │   ├── Run（运行）
    │   │   ├── Turn（回合）
    │   │   ├── Tool Call（工具调用）
    │   │   ├── Approval（审批）
    │   │   └── Artifact（产物）
    │   └── Run ...
    └── Task ...
```

- 一个 Session 可以包含多个 Task。
- 一个 Task 可以有多个 Run；Retry/Resume 创建新 Run，不重置终态 Run。
- Run 状态：`Queued → Running ↔ WaitingForApproval → Completed | Failed | Cancelled`。
- Approval 支持单次、Run、Session、Workspace 级记忆；MVP 不提供默认全局永久授权。
- Agent 支持在 Permission Policy 与 Approval 约束下连续规划和执行多个步骤。

## 3. 运行时拓扑

```text
Desktop Client ─┐
                ├── Local Agent Runtime ── Provider
CLI Client ─────┘              │
                         Workspace / Worktree
                                │
                         ~/cpa/history.db
```

- Agent Runtime 是 Session、Run、Tool Call、Approval、Provider 和 SQLite 历史的唯一状态所有者与写入方。
- Client 只负责展示和转发用户输入，不直接写 SQLite。
- Client 按需拉起 Runtime sidecar；没有连接时 Runtime 可以退出。
- 协议使用统一的 JSON 消息 schema：CLI 通过 stdio，Desktop 通过 localhost WebSocket。
- 同一 Run 同时只能被一个 Client 控制。

## 4. 执行与并发

- Git Workspace：每个 Run 默认从当前分支 HEAD 创建独立 Worktree；Worktree 结束后默认保留，供审阅、合并或清理。
- Git Workspace 的并发 Run 允许同时执行；文件锁保护写入边界，Run 基线和写前 hash 校验负责发现外部修改与语义冲突。
- 非 Git Workspace：降级为单 Run、主工作目录、文件锁模式，不创建 Worktree。
- Worktree 创建来源默认是当前分支 HEAD，不自动带入未提交变更。
- 合并以 Git 原生操作为准（merge、cherry-pick 或 apply patch），Runtime 不发明自定义同步算法。
- MVP 不自动 stash 或 staging 用户变更。

## 5. 默认权限与错误

| 操作 | 默认行为 |
|---|---|
| 读取 Workspace 文件 | 自动允许 |
| 写入 Workspace 文件 | 请求 Approval |
| 删除或重命名 | 强制 Approval |
| 普通测试/构建命令 | 请求 Approval |
| 明显危险命令 | 禁止或强制 Approval |
| 网络访问 | 默认请求 Approval |
| Workspace 外路径 | 默认禁止 |

Run 失败使用五类错误：`ProviderError`、`ToolError`、`PolicyViolation`、`WorkspaceConflict`、`InternalError`。

CLI 与 Runtime 共享退出码：`0` 成功、`1` 失败、`130` 用户取消。

## 6. Client 体验

### CLI Client

- `cpa`：交互式 TUI。
- `cpa exec "..."`：非交互执行。
- `cpa resume <session-or-run-id>`：恢复上下文并创建新的 Run。
- `cpa worktree ls|rm|merge`：查看和管理 Worktree。
- 默认输出为人类可读的流式消息、Tool Call、Diff 摘要和 Approval。
- `--json` 输出 JSONL 事件流；非交互模式遇到不能自动满足的 Approval 时失败退出，不挂起等待 stdin。

### Desktop Client

首版采用接近 Codex Desktop 的完整工作流，而不是只有聊天页：

- 项目/Workspace 与 Session/Task 导航
- 多 Agent Thread/Run 展示
- 集成终端
- Worktree 创建、状态、Diff 审阅、合并和清理入口
- Tool Call 时间线、Approval 卡片、命令输出和文件 Diff Inspector
- Run 的停止、继续、重试、恢复、失败和取消状态
- 深色与浅色主题同时交付，默认跟随系统，使用独立品牌 Design Tokens

## 7. Monorepo 目标布局

```text
apps/
├── cli/                 # cpa TUI + exec
└── desktop/             # Tauri + React Desktop Client
packages/
├── core/                # Agent Runtime、loop、Run、权限、工具、持久化
├── protocol/            # JSON command/event schema 与共享类型
└── shared/              # 已有或后续确认的通用工具
```

当前仓库已经存在 `packages/core`，其余应用和包按实施路线逐步创建。根 workspace 仍由 `apps/*` 与 `packages/*` 发现。

## 8. MVP 验收场景

```text
选择 Workspace
→ 创建/恢复 Session
→ 输入 Task
→ Agent 读取代码
→ 请求并获得 Approval
→ 修改多个文件
→ 展示 Diff
→ 运行测试
→ 根据测试结果继续修复
→ 完成 Run
→ CLI 与 Desktop 都能查看同一历史
```

必须同时满足：

- CLI 交互式和非交互式模式可用；
- Desktop 能接收流式过程；
- 两端 Session/Run 状态一致；
- 用户可停止、拒绝、重试和恢复；
- 失败不丢失时间线；
- 不能越过 Workspace、Worktree、Permission Policy 边界；
- Git Workspace 的多个 Run 可并发且冲突可解释；
- 非 Git Workspace 有明确的降级行为。

## 9. 实施顺序

1. **协议与 Runtime 基础**：消息 schema、initialize、stdio/WebSocket adapter、Runtime 生命周期、SQLite schema 与事件持久化。
2. **Agent Loop 与工具**：Provider adapter、Turn/Run 状态机、read/edit/write/bash/search、流式 Tool Call、Approval、错误分类。
3. **Workspace/Worktree**：Git Worktree 生命周期、锁、基线/hash 校验、diff 与 merge/cleanup 命令。
4. **CLI Client**：TUI、exec、resume、worktree 管理、人类输出与 JSONL 输出。
5. **Desktop Client**：Tauri sidecar、三区/Worktree 信息架构、Thread/Inspector、Diff/Approval、深浅主题。
6. **端到端验收**：使用真实本地仓库完成完整 MVP 场景，并在 CLI 与 Desktop 交叉查看历史。

## 10. 不在本轮基线内

- 远程 Runtime 或远程 Workspace
- 多用户协作与云端同步
- Web Client 与认证系统
- 非本地代码的通用个人 Agent 能力
- 自动 stash/staging 与自动合并冲突
- 全局永久授权
- 除默认 Provider 外的完整多 Provider 产品化配置
