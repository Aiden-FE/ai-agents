# Use Tauri and React for the desktop client

桌面端采用 Tauri 与 React，而不是 Electron。该选择满足以独立主题实现高度接近 Codex 的图形工作流，同时以更小的原生应用边界为目标；代价是需要维护 Rust 与 TypeScript 之间的集成边界。CLI 与桌面端仍应共享 Agent 领域语义，而非各自重新定义它。
