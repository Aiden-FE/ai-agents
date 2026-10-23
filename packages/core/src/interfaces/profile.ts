import z from 'zod';

export interface PROFILE_TYPE {
  defaultProvider?: string;
  defaultModel?: string;
  defaultReviewModel?: string;
  providers?: {
    name: string;
    baseUrl: string;
    apiKey?: string;
    protocol?: 'openai-completion' | 'openai-response';
  }[];
}

export const ProfileSchema: z.ZodType<PROFILE_TYPE> = z.object({
  defaultProvider: z.string().optional().describe('默认供应商名称'),
  defaultModel: z.string().optional().describe('默认模型名称'),
  defaultReviewModel: z.string().optional().describe('默认评审模型名称'),
  providers: z
    .object({
      name: z.string().describe('供应商名称'),
      baseUrl: z.string().describe('供应商API Base URL， 可选'),
      apiKey: z
        .string()
        .optional()
        .describe('供应商API Key， 以 $开头的字符串 表示从环境变量中读取'),
      protocol: z
        .enum(['openai-completion', 'openai-response'])
        .optional()
        .default('openai-response')
        .describe('供应商协议类型'),
    })
    .array()
    .optional()
    .describe('供应商列表'),
});
