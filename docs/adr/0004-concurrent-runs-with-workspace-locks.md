# Allow concurrent Runs with workspace-scoped locking

同一 Workspace 允许多个 Run 并发执行；对 Git Workspace，每个 Run 默认创建独立 Worktree，Tool Call 的写入边界仍通过文件锁保护，并结合 Run 启动基线与写前 hash 校验发现冲突。非 Git Workspace 降级为单 Run、主工作目录和文件锁模式。选择并发而非每个 Workspace 单活跃 Run，是为了支持多个独立任务同时推进；代价是客户端必须清晰展示锁等待、冲突和每个 Run 的工作范围，且文件锁不能替代语义冲突检测。
