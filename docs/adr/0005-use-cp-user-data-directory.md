# Store user data under ~/cp

**Status**: superseded by ADR-0009.

用户级配置、SQLite 历史、日志和运行时辅助数据最初统一放在 `~/cp/` 下，而不是拆分到多个平台目录。该命名后来因 CLI 与 Unix `cp` 命令的冲突被 ADR-0009 改为 `~/cpa/`；目录内部仍按 config、data、logs 等用途分层，不能让客户端绕过 Agent Runtime 直接写入历史数据库。
