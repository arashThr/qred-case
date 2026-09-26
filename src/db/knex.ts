import knex, { type Knex } from 'knex'
import { config } from '../config.js'

export function createDb(connection: string): Knex {
  return knex({
    client: 'pg',
    connection,
    pool: { min: 0, max: 4 },
  })
}

const connectionString = `postgresql://${config.postgres.user}:${config.postgres.password}@${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`
export const db = createDb(connectionString)

export async function pingDb(client: Knex = db): Promise<void> {
  await client.raw('select 1 as ok')
}
