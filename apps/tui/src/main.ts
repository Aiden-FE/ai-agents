#!/usr/bin/env node

import { join } from 'node:path';
import { runAgentTUI } from '@ai-sdk/tui';
import { AgentCore, loadProfile } from '@maka/core';

import { parseTuiArguments } from './args.ts';
import { resolveTuiConfig } from './env.ts';

const { profile: profilePath } = parseTuiArguments(process.argv.slice(2));
const agentEnv =
  profilePath === undefined ? process.env : { ...process.env, MAKA_PROFILE_PATH: profilePath };

const profile = loadProfile({
  profilePath:
    agentEnv.MAKA_PROFILE_PATH ?? join(agentEnv.HOME || process.cwd(), '.maka', 'config.yaml'),
});

const tuiConfig = resolveTuiConfig(process.env);

const agentInstance = new AgentCore({
  name: tuiConfig.title,
  profile,
});

/**
 * 1. 载入 TUI 产品配置
 * 2. 创建 Agent 实例，向 Core 注入有效参数
 * 3. 启动 TUI 界面
 */
await runAgentTUI({
  title: tuiConfig.title,
  agent: agentInstance.agent,
});
