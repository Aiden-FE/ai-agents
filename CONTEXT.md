# AI Agents Context

本项目提供面向本地代码仓库的 Agent 产品，拥有共享核心与桌面端、终端端两个客户端。本文只定义项目领域语言，不描述具体实现。

## 产品与交互

**Agent**：围绕用户目标理解、规划并执行代码开发工作的智能参与者。
_Avoid_: Bot、Assistant（除非明确指代模型的人机交互角色）

**Desktop Client（桌面端）**：以图形界面承载 Agent 工作流的客户端，视觉与交互高度接近 Codex 风格，但允许使用本项目自己的主题。
_Avoid_: Web App（桌面端不是浏览器网页）

**CLI Client（终端端）**：在终端中承载同一套 Agent 核心能力的客户端，同时服务交互式使用与脚本化调用。
_Avoid_: Terminal Agent（作为产品名称时不使用泛称）

**Workspace（工作区）**：Agent 被授权操作的本地代码仓库及其工作目录边界。
_Avoid_: Project（Project 可指软件项目，不等同于一次 Agent 工作区）

**Worktree（工作副本）**：Git Workspace 中供一个 Run 隔离、执行和审阅变更的代码副本。
_Avoid_: Branch（Branch 是版本控制概念，不等同于可执行的工作副本）

## 工作与执行

**Session（会话）**：用户与 Agent 围绕一组连续开发工作的长期交互上下文。
_Avoid_: Chat、Conversation（它们只描述交互形式）

**Task（任务）**：用户希望 Agent 达成的一个明确开发目标。
_Avoid_: Prompt、Job（Prompt 是输入内容，Job 暗示调度单位）

**Run（运行）**：Agent 为完成一个 Task 而进行的一次实际执行尝试。
_Avoid_: Execution（Execution 可描述技术动作，不作为领域对象名称）

**Turn（回合）**：Run 中 Agent 对上下文进行一次推理并产生下一步行动的单元。

**Artifact（产物）**：Run 产生且可被用户检查或继续使用的结果，例如代码变更、Diff、日志或报告。

## 工具与安全

**Tool Call（工具调用）**：Run 请求执行一个外部动作的领域事实，例如读取文件、写入文件或运行命令。

**Approval（审批）**：用户针对需要授权的 Tool Call 作出的允许或拒绝决定。
_Avoid_: Confirmation（Confirmation 仅适用于一般确认，不足以表达权限边界）

**Permission Policy（权限策略）**：决定哪些 Tool Call 可自动执行、哪些必须请求 Approval、哪些始终禁止的规则集合。

**Execution Environment（执行环境）**：Run 执行 Tool Call 所依附的环境，包括本地工作区或未来可能支持的远程隔离环境。

**Run Scope（运行范围）**：Run 获准读取、写入和执行动作的 Workspace 或 Worktree 边界；Git Workspace 通常以专属 Worktree 为边界。

## 运行时与协作

**Agent Runtime（Agent 运行时）**：拥有 Session、Run、Tool Call、Approval 与 Provider 连接的本地执行层，是产品状态的唯一所有者与写入方。
_Avoid_: Backend、Server（它运行在用户本机，而不是远端）

**Client（客户端）**：连接 Agent Runtime 的交互层，仅负责展示与用户输入，例如 Desktop Client 与 CLI Client。

**Event（事件）**：Agent Runtime 向 Client 推送的一次流式状态事实，例如 Tool Call 开始或 Run 状态变化。

## 模型

**Provider（模型提供方）**：向 Agent 提供模型能力的外部服务或本地模型运行时。
_Avoid_: Model（Model 指具体模型，不指提供方）

**Model（模型）**：Provider 提供的具体推理模型。
