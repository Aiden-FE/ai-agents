#!/usr/bin/env node

import { runAgentTUI } from '@ai-sdk/tui'
import { createAgent, loadAgentConfig } from '@maka/core'

import { resolveTuiConfig } from './env.ts'

const agentConfig = loadAgentConfig(process.env)
const tuiConfig = resolveTuiConfig(process.env)

await runAgentTUI({
  title: tuiConfig.title,
  agent: createAgent(agentConfig),
  contextSize: agentConfig.contextSize,
})
