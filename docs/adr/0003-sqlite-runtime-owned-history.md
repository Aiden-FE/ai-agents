# Use SQLite for session history, owned exclusively by the runtime

Session、Task、Run、Tool Call、Approval 与 Artifact 元数据持久化到本地 SQLite，由 Agent Runtime 作为唯一写入方；Workspace 中的文件始终是代码内容的事实来源。选择 SQLite 而非 JSON 文件，是因为需要会话搜索、中断恢复、完整执行时间线以及两个客户端读取同一历史。客户端不直接访问数据库，只能通过 Runtime 协议读取，从而避免多写者与 schema 迁移分叉。
