# @maka/core

可分发的 TypeScript 核心包，统一暴露 core runtime、函数和类型。纯库（无 `bin`、无 CLI、无副作用）。

## 安装

```bash
pnpm add @maka/core
```

## 使用

```ts
import { Core, VERSION, createCore, hello, type CoreOptions } from '@maka/core'

const options: CoreOptions = { name: 'my-agent' }
const core = createCore(options)

console.log(hello('maka')) // Hello, maka!
console.log(VERSION) // 0.0.0
console.log(core instanceof Core) // true
console.log(core.snapshot()) // { name: 'my-agent', version: '0.0.0' }
```

## 公开 API

| 导出                                       | 说明                                              |
| ------------------------------------------ | ------------------------------------------------- |
| `hello(name?: string): string`             | 返回 `` `Hello, ${name}!` ``，默认 `world`         |
| `VERSION: string`                          | 包的公开版本号，读取自 `package.json`              |
| `CoreOptions`                              | `Core` 的构造选项，目前支持 `name`                 |
| `CoreSnapshot`                             | `Core#snapshot()` 的返回值，`name` + `version`     |
| `Core`                                     | 最小 core runtime，可扩展而不绑定内部实现          |
| `createCore(options?: CoreOptions): Core`  | 创建配置好的 `Core` 实例                           |

## 开发

在仓库根目录运行：

```bash
pnpm install
pnpm --filter @maka/core typecheck
pnpm --filter @maka/core build
pnpm --filter @maka/core test
```

构建工具为 **tsdown**（输出 Node 24+ ESM `.mjs`），单元测试工具为 **Vitest**，代码风格由仓库根的 **Biome** 统一管理。

构建结果位于 `dist/`：

- ESM：`dist/index.mjs`
- TypeScript declarations：`dist/index.d.mts`
- Source maps
