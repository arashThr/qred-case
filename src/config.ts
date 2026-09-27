import 'dotenv/config'
import { z } from 'zod'

const env = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    POSTGRES_HOST: z.string().default('localhost'),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
    POSTGRES_USER: z.string().default('qred'),
    POSTGRES_PASSWORD: z.string().default('qred'),
    POSTGRES_DB: z.string().default('qred_card'),
    DEMO_TOKEN: z.string().min(1).default('demo'),
    DEMO_USER_ID: z.string().min(1).default('usr_1'),
  })
  .parse(process.env)

export const config = {
  port: env.PORT,
  demoAuth: { token: env.DEMO_TOKEN, userId: env.DEMO_USER_ID },
  databaseUrl: `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
}
