# pnpm Workspace + @maka/core 纯库脚手架 — 设计文档

日期：2026-09-22
状态：已确认

## 背景与目标

在 `ai-agents` 仓库根目录搭建一个 pnpm monorepo，其中包含一个名为 `@maka/core`
的核心 TypeScript 纯库包，打包产物为 Node 24+ 可直接运行的 ESM `.mjs` 脚本（纯库，无 CLI）。

技术选型（用户已确认）：

- 打包工具：**tsdown**（0.23.0，基于 Rolldown，默认 ESM 输出 `.mjs`）
- 产物形态：**纯库**（无 bin / CLI，供其他包 import）
- 配套工具：**Vitest**（单测）、**Biome**（lint+format）、**Changesets**（版本发布）
- 包名：`@maka/core`
- 创建位置：当前仓库根目录 `ai-agents/`，保留现有 `AGENTS.md` 与 `docs/agents/`

## 环境约束

- Node v24.17.0（本地已验证）
- tsdown 运行要求 `^22.18.0 || ^24.11.0 || >=26.0.0` ✓
- 打包产物仅需 Node 24+ 运行时

## 仓库结构（顶层）

```
ai-agents/
├── AGENTS.md                # 保留
├── docs/agents/...          # 保留
├── .git/                    # 保留
├── package.json             # 根 workspace 元数据 + 共享脚本
├── pnpm-workspace.yaml      # 声明 packages/*
├── pnpm-lock.yaml           # 新建
├── tsconfig.base.json       # 共享 TS 编译配置
├── biome.json               # Biome 配置
├── vitest.workspace.ts      # Vitest 工作区配置
├── .gitignore
├── .changeset/config.json   # Changesets 配置
├── .changeset/README.md
└── packages/
    └── core/                # @maka/core
        ├── package.json
        ├── tsconfig.json
        ├── tsdown.config.ts
        ├── vitest.config.ts
        └── src/
            ├── index.ts
            └── index.test.ts
```

## 各文件职责

### 根 `package.json`

- `private: true`、`"type": "module"`
- `"packageManager": "pnpm@12.5.1"`
- `"engines": { "node": ">=24" }`
- `scripts`（顶层聚合，内部用 `pnpm -r --filter @maka/core ...` 转发）：
  - `build` / `dev` / `lint` / `format` / `test` / `test:run` / `test:cov` / `typecheck` / `changeset` / `version`
- `devDependencies`：`@biomejs/biome`、`@changesets/cli`、`tsdown`、`typescript`、`vitest`、`@vitest/coverage-v8`（放根以统一管理工具链）

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

### `packages/core/package.json`

- `name: "@maka/core"`、`version: 0.0.0`、`private: false`（可发布）
- `"type": "module"`、`"sideEffects": false`
- `"engines": { "node": ">=24" }`
- `main`/`module` 不再单独设置，统一走 `exports`（`exports.legacy` 关闭，纯 ESM）
- `exports`：
  ```json
  {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./package.json": "./package.json"
  }
  ```
- `files: ["dist"]`
- `scripts`：`build`(tsdown)、`dev`(tsdown --watch)、`typecheck`(tsc --noEmit)、`test`(vitest)、`test:run`、`test:cov`、`lint`、`format`
- `devDependencies`：`tsdown`、`typescript`、`vitest`、`@vitest/coverage-v8`（workspace 内由根提升，显式声明便于隔离）
- `publishConfig`: `access: public`

### `packages/core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2024"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedDeclarations": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

> 说明：`isolatedDeclarations: true` 让 tsdown 用 oxc-transform 极速生成声明文件。

### `packages/core/tsdown.config.ts`

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  dts: true,
  sourcemap: true,
  clean: true,
  fixedExtension: true, // 强制 .mjs + .d.mts 输出
  exports: { devExports: true }, // 开发期 exports 指向 src
})
```

> 说明：`fixedExtension: true`（platform=node 时默认开启）保证 ESM 输出扩展名恒为 `.mjs`、声明为 `.d.mts`。`exports.devExports: true` 让开发期 `exports` 指向源码（利于 TS 提示），发布时写入 `publishConfig`。

### `packages/core/src/index.ts`（示例）

```ts
export function hello(name = 'world'): string {
  return `Hello, ${name}!`
}
```

### `packages/core/src/index.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { hello } from './index.ts'

describe('hello', () => {
  it('greets the default world', () => {
    expect(hello()).toBe('Hello, world!')
  })
  it('greets a named user', () => {
    expect(hello('maka')).toBe('Hello, maka!')
  })
})
```

### `packages/core/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

### `vitest.workspace.ts`（顶层）

```ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace(['packages/*'])
```

### `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!.gitignore", "!**/dist/**", "!**/node_modules/**", "!**/coverage/**"] },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  }
}
```

### `.changeset/config.json`

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

> 说明：`baseBranch: main` 与当前默认分支对齐；仓库当前只有一次提交，`main` 即默认分支。

### `.gitignore`

```
node_modules/
dist/
coverage/
.biome/
*.tsbuildinfo
```

## 验证计划（实现后执行）

1. `pnpm install` 成功，生成 `pnpm-lock.yaml`
2. `pnpm -F @maka/core build` 产出 `packages/core/dist/index.mjs` 与 `packages/core/dist/index.d.mts`
3. `node packages/core/dist/index.mjs` 运行输出成功（纯库无副作用，用 node -e import 验证）
4. `pnpm -F @maka/core typecheck` 通过
5. `pnpm -F @maka/core test:run` 通过（2 条用例）
6. `pnpm lint` 通过
7. `pnpm changeset status` 正常（无异常）

## 边界与不做的事

- 不改动现有 `AGENTS.md`、`docs/agents/`、`.git` 历史
- 不创建 CLI / bin 入口（纯库）
- 不做浏览器构建（`platform: node`）
- 不预置 CI（GitHub Actions）— 仅在仓库根放置配置，是否配 CI 由后续决定
- 不把 `dist` 提交到 git（走 `files` + 发布时构建）
- Changesets 的 changelog 生成依赖 `@changesets/cli` 内置逻辑，不接外部 changelog 插件

## 采用的技术决策（ADR 摘要）

| 决策 | 选择 | 理由 |
|------|------|------|
| 包管理器 | pnpm workspace | 用户指定；monorepo 依赖隔离 |
| 打包器 | tsdown 0.23 | 用户选择；Rolldown 快、默认 `.mjs` |
| 产物扩展名 | `.mjs` + `.d.mts`（fixedExtension） | 显式 ESM，Node 24 原生 |
| TS 目标 | ES2024 / moduleResolution Bundler | 现代库配置 |
| 声明生成 | isolatedDeclarations + oxc | tsdown 官方推荐，快 |
| 测试 | Vitest 5（v8 coverage） | 用户选择 |
| lint/format | Biome 2 | 用户选择 |
| 发版 | Changesets 3 | 用户选择 |
