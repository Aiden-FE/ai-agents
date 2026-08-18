# Use cpa as the product command and user-data namespace

产品 CLI 命令统一使用 `cpa`，用户级数据目录统一使用 `~/cpa/`，不再使用 `cp` 作为命令或数据目录命名。这样既保持产品命名一致，又避免遮蔽 Unix 原生 `cp` 文件复制命令；此前关于 `cp` 的命名决策由本 ADR 取代。

**Status**: accepted; supersedes ADR-0005 and ADR-0008 where they refer to the `cp` name.
