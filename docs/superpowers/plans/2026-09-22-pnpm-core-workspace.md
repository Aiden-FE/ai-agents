# pnpm Workspace + @maka/core 纯库脚手架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `ai-agents` 根目录建立 pnpm monorepo，并产出 `@maka/core` 纯库包，打包为 Node 24+ 可运行的 ESM `.mjs` + `.d.mts`。

**Architecture:** 根 workspace 管理工具链（tsdown / typescript / vitest / biome / changesets）；`packages/core` 是唯一包，用 tsdown（Rolldown）以 `format: esm`、`fixedExtension: true` 输出显式 `.mjs`/`.d.mts`，无 CLI。

**Tech Stack:** pnpm 12.5.1、tsdown 0.23.0、TypeScript 7.0.2、Vitest 5.0.1（v8 coverage）、Biome 2.5.14、Changesets 3.0.3、publint 0.3.24

**Spec:** `docs/superpowers/specs/2026-09-22-pnpm-core-workspace-design.md`（执行时同时阅读 spec 与本计划）

## Global Constraints

- 仓库根：`/Users/aiden/dev/aiden/ai-agents`（已是 git 仓库，默认分支 `main`）
- 不修改/删除现有 `AGENTS.md`、`docs/agents/`、`.git` 历史
- 工作区声明：`pnpm-workspace.yaml` 中 `packages/*`
- Node 运行时：`engines.node = ">=24"`（root 与 core 均如此）
- 包名严格为 `@maka/core`，纯库（无 `bin`、无 CLI、无副作用 `sideEffects:false`）
- 产物扩展名恒为 `.mjs`（JS）与 `.d.mts`（类型），通过 `fixedExtension: true`
- TS 配置开启 `strict`、`isolatedDeclarations`、`verbatimModuleSyntax`
- 提交信息使用小写 Conventional Commits（如 `feat: ...`、`chore: ...`、`docs: ...`）
- 每次提交前确保对应验证命令退出码为 0

## Review Focus

1. 打包产物在 Node 24 作为**原生 ESM**可直接执行（不依赖语法降级/垫片）→ Task 4 的 `node` import 步骤。
2. `.d.mts` 正确导出带类型的 `hello`（消费方能拿到类型）→ Task 4 grep 声明文件步骤。
3. `exports` 的 `types`/`import` 条件合法且指向真实存在的文件 → Task 4 `publint` 步骤。
4. Biome 对所有已提交文件检查通过（无 lint/format 错误）→ Task 6 `pnpm lint` 步骤。
5. Changesets 配置有效且识别 `@maka/core`（无配置错误）→ Task 6 `pnpm changeset status` 步骤。

---

### Task 1: 根 workspace 与工具链安装

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `package.json`

**Interfaces:**
- Produces: pnpm 识别的 workspace 根；所有根级工具二进制（`biome`、`changeset`、`tsdown`、`tsc`、`vitest`、`publint`）。

- [ ] **Step 1: 创建 `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: 创建 `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
.biome/
*.tsbuildinfo
```

- [ ] **Step 3: 创建根 `package.json`**

```json
{
  "name": "ai-agents",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.5.1",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm --parallel -r run dev",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "pnpm -r run typecheck",
    "test": "vitest",
    "test:run": "vitest run",
    "test:cov": "vitest run --coverage",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm -r run build && changeset publish"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.5.14",
    "@changesets/cli": "^3.0.3",
    "@vitest/coverage-v8": "^5.0.1",
    "publint": "^0.3.24",
    "tsdown": "^0.23.0",
    "typescript": "^7.0.2",
    "vitest": "^5.0.1"
  }
}
```

- [ ] **Step 4: 安装依赖**

Run: `pnpm install`
Expected: 安装成功，生成 `pnpm-lock.yaml`；无 ERR。

- [ ] **Step 5: 验证工具链可用**

Run:
```bash
pnpm exec biome --version
pnpm exec changeset --version
pnpm exec tsdown --version
pnpm exec tsc --version
pnpm exec vitest --version
pnpm exec publint --version
```
Expected: 各打印版本号（biome 2.5.x、changeset 3.x、tsdown 0.23.x、tsc 7.x、vitest 5.x、publint 0.3.x），退出码 0。

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml .gitignore package.json pnpm-lock.yaml
git commit -m "chore: init pnpm workspace and toolchain"
```

---

### Task 2: 共享 TS 基座与 Biome 配置

**Files:**
- Create: `tsconfig.base.json`
- Create: `biome.json`

**Interfaces:**
- Produces: 子包可 `extends` 的 `tsconfig.base.json`；作用于整个仓库的 `biome.json`。

- [ ] **Step 1: 创建 `tsconfig.base.json`**

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

- [ ] **Step 2: 创建 `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.14/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": [
      "**",
      "!.gitignore",
      "!**/dist/**",
      "!**/node_modules/**",
      "!**/coverage/**"
    ]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
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

- [ ] **Step 3: 校验 Biome 配置可加载并运行**

Run: `pnpm exec biome check .`
Expected: 退出码 0（当前仓库无 JS/TS 文件需检查，输出类似 "Checked N files" 且无错误）。

- [ ] **Step 4: Commit**

```bash
git add tsconfig.base.json biome.json
git commit -m "chore: add shared tsconfig base and biome config"
```

---

### Task 3: @maka/core 包骨架与 TDD 的 hello 函数

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.test.ts`
- Create: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `hello(name?: string): string`；默认参数 `'world'`，返回 `` `Hello, ${name}!` ``。

- [ ] **Step 1: 创建 `packages/core/package.json`**

```json
{
  "name": "@maka/core",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=24"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:cov": "vitest run --coverage",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^5.0.1",
    "tsdown": "^0.23.0",
    "typescript": "^7.0.2",
    "vitest": "^5.0.1"
  }
}
```

- [ ] **Step 2: 创建 `packages/core/tsconfig.json`**

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

- [ ] **Step 3: 链接新工作区包**

Run: `pnpm install`
Expected: 成功；`packages/core` 被识别为 workspace 成员，无 ERR。

- [ ] **Step 4: 写失败测试 `packages/core/src/index.test.ts`**

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

- [ ] **Step 5: 运行测试，确认失败**

Run: `pnpm --filter @maka/core exec vitest run src/index.test.ts`
Expected: FAIL，错误包含无法解析 `./index.ts`（模块不存在）。

- [ ] **Step 6: 最小实现 `packages/core/src/index.ts`**

```ts
export function hello(name: string = 'world'): string {
  return `Hello, ${name}!`
}
```

> 参数显式标注 `string`，满足 `isolatedDeclarations`。

- [ ] **Step 7: 运行测试，确认通过**

Run: `pnpm --filter @maka/core exec vitest run src/index.test.ts`
Expected: PASS（2 个测试）。

- [ ] **Step 8: 类型检查**

Run: `pnpm --filter @maka/core run typecheck`
Expected: 退出码 0，无 TS 错误。

- [ ] **Step 9: Commit**

```bash
git add packages/core/package.json packages/core/tsconfig.json packages/core/src pnpm-lock.yaml
git commit -m "feat(core): add hello with tdd"
```

---

### Task 4: tsdown 打包并验证 .mjs / .d.mts / exports

**Files:**
- Create: `packages/core/tsdown.config.ts`
- Modify: `packages/core/package.json`（tsdown 可能因 `exports.devExports` 重写 exports/publishConfig，审查后提交）

**Interfaces:**
- Consumes: Task 3 的 `src/index.ts`。
- Produces: `dist/index.mjs`、`dist/index.d.mts`（及 sourcemap）。

- [ ] **Step 1: 创建 `packages/core/tsdown.config.ts`**

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
  fixedExtension: true,
  exports: { devExports: true },
})
```

- [ ] **Step 2: 执行打包**

Run: `pnpm --filter @maka/core run build`
Expected: 构建成功；输出 `dist/index.mjs` 与 `dist/index.d.mts`，无错误。

- [ ] **Step 3: 断言产物文件存在**

Run:
```bash
test -f packages/core/dist/index.mjs && echo "mjs ok"
test -f packages/core/dist/index.d.mts && echo "d.mts ok"
```
Expected: 分别打印 `mjs ok`、`d.mts ok`，退出码 0。

- [ ] **Step 4: Node 24 原生 ESM 执行验证**（Review Focus #1）

Run:
```bash
node --input-type=module -e "import { hello } from './packages/core/dist/index.mjs'; console.log(hello('maka'))"
```
Expected: 打印 `Hello, maka!`，退出码 0。

- [ ] **Step 5: 验证类型声明内容**（Review Focus #2）

Run: `grep -n "declare function hello" packages/core/dist/index.d.mts`
Expected: 匹配到一行 `declare function hello(name?: string): string`（或等价带默认参数的签名），退出码 0。

- [ ] **Step 6: 校验 exports 合法性**（Review Focus #3）

Run: `pnpm exec publint packages/core`
Expected: 退出码 0，输出无 errors（warnings 若有需逐条确认可接受；理想为 `No errors`）。

- [ ] **Step 7: 审查 tsdown 对 package.json 的重写并提交**

Run: `git diff packages/core/package.json`
Expected: 可见 devExports 带来的 src 链接与 publishConfig（发布指向 dist）；确认版本/名称未被破坏。然后：

```bash
git add packages/core/tsdown.config.ts packages/core/package.json packages/core/dist 2>/dev/null
git commit -m "build(core): bundle to node .mjs with tsdown"
```
> 注：`dist/` 被 `.gitignore` 忽略，`git add packages/core/dist` 不会纳入版本库，属预期；实际提交仅含配置与 package.json。

---

### Task 5: Vitest 包配置与根工作区

**Files:**
- Create: `packages/core/vitest.config.ts`
- Create: `vitest.workspace.ts`

**Interfaces:**
- Produces: 根级 `vitest run` 一次跑全部包；core 覆盖率配置。

- [ ] **Step 1: 创建 `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
```

- [ ] **Step 2: 创建根 `vitest.workspace.ts`**

```ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace(['packages/*'])
```

- [ ] **Step 3: 根级运行全部测试**

Run: `pnpm vitest run`
Expected: 1 个 project、2 个测试全部 PASS，退出码 0。

- [ ] **Step 4: 验证 core 覆盖率**

Run: `pnpm --filter @maka/core run test:cov`
Expected: 覆盖率表中 `src/index.ts` 语句/分支覆盖率 100%；生成 `packages/core/coverage/index.html`，退出码 0。

- [ ] **Step 5: Commit**

```bash
git add packages/core/vitest.config.ts vitest.workspace.ts
git commit -m "test: add vitest workspace and coverage config"
```

---

### Task 6: Changesets 与最终全链路验证

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`

**Interfaces:**
- Produces: 可用的 changeset 工作流；全部聚合脚本验证通过。

- [ ] **Step 1: 创建 `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.3/schema.json",
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

- [ ] **Step 2: 创建 `.changeset/README.md`**

```md
# Changesets

This folder is maintained by [changesets](https://github.com/changesets/changesets).

- Record a change: `pnpm changeset`
- Consume changesets (bump versions + changelog): `pnpm version`
- Publish: `pnpm release`
```

- [ ] **Step 3: 校验 Changesets 识别包**（Review Focus #5）

Run: `pnpm changeset status`
Expected: 退出码 0，输出无配置错误（当前无变更集时类似 `No changesets present`）。

- [ ] **Step 4: 统一格式化全部文件**

Run: `pnpm format`
Expected: Biome 格式化完成，退出码 0。

- [ ] **Step 5: 全量 lint**（Review Focus #4）

Run: `pnpm lint`
Expected: 退出码 0，无 lint/format 错误。

- [ ] **Step 6: 全量构建 + 类型检查 + 测试（干净重建闸门）**

Run:
```bash
pnpm build
pnpm typecheck
pnpm test:run
```
Expected: 三者依次退出码 0；构建重新生成 `dist/index.mjs` 与 `dist/index.d.mts`；测试 2/2 通过。

- [ ] **Step 7: 复核产物仍可运行**

Run:
```bash
node --input-type=module -e "import { hello } from './packages/core/dist/index.mjs'; console.log(hello(), hello('maka'))"
```
Expected: 打印 `Hello, world! Hello, maka!`，退出码 0。

- [ ] **Step 8: 确认工作区干净并提交**

Run: `git status --short`
Expected: 仅 `.changeset/` 新文件（及 `pnpm format` 可能产生的格式微调）；`dist/`/`coverage/`/`node_modules/` 不出现（已忽略）。然后：

```bash
git add .changeset
git add -A
git commit -m "chore: add changesets and finalize scaffold"
```

---

## Self-Review 记录（作者已完成）

- **Spec coverage：** workspace/根清单（T1）、共享 tsconfig+biome（T2）、core 骨架+hello（T3）、tsdown 打包+mjs/d.mts+exports（T4）、vitest 工作区+coverage（T5）、changesets+全链路验证（T6）均有任务对应；`.gitignore`、`packageManager`、`engines` 均覆盖。
- **Placeholder scan：** 无 TBD/TODO/“适当处理”等占位；每个代码步骤含完整内容。
- **Type consistency：** 全程统一 `hello(name?: string): string`、文件名 `index.mjs`/`index.d.mts`、包名 `@maka/core`。
- **Review Focus：** 5 条均已分配到具体任务的验证步骤。
