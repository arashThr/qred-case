import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3000),
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? 'qred',
    password: process.env.POSTGRES_PASSWORD ?? 'qred',
    database: process.env.POSTGRES_DB ?? 'qred_card',
  },
}
