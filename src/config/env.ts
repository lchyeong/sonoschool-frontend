import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .optional()
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).optional(),
  VITE_API_URL: z.url().optional(),
  VITE_API_BASE_URL: z.url().optional(),
  VITE_ENABLE_MOCK: booleanString,
  VITE_ENABLE_ANALYTICS: booleanString,
  VITE_SITE_URL: z.url().optional(),
  VITE_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  VITE_GTM_CONTAINER_ID: z.string().min(1).optional(),
  VITE_GA_ID: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema> & {
  apiBaseUrl: string | null;
  appName: string;
};

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  return issues ? `\n${issues}` : '';
};

export const env: AppEnv = (() => {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    throw new Error(`[env] Invalid environment variables.${toZodErrorMessage(parsed.error)}`);
  }

  const apiBaseUrl = parsed.data.VITE_API_URL ?? parsed.data.VITE_API_BASE_URL ?? null;
  const appName = parsed.data.VITE_APP_NAME ?? 'CSR Template';

  return { ...parsed.data, apiBaseUrl, appName };
})();
