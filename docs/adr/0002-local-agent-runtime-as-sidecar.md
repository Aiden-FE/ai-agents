# Run the agent core as a local runtime process shared by both clients

Agent 核心以独立的本地 Agent Runtime 进程运行，桌面端（Tauri）与 CLI 都作为客户端通过本地流式协议连接，而不是各自嵌入一份核心实现。Runtime 是唯一的状态所有者与写入方；客户端只做交互展示与输入转发。理由：Tauri 主进程是 Rust，无法直接复用 TypeScript 核心逻辑，独立 Runtime 让两端共享同一套 Session/Run/Tool Call/Approval 语义，避免双实现漂移。Runtime 由客户端按需作为 sidecar 拉起，无连接时可退出，未来可平滑演进为常驻服务。用户级数据目录与运行时辅助数据统一位于 `~/cpa/`。
