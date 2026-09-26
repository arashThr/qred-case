import type { Knex } from 'knex'
import { extname, join } from 'node:path'
import { db } from './knex.js'

export async function migrate(client: Knex): Promise<void> {
  await client.migrate.latest({
    directory: join(import.meta.dirname, 'migrations'),
    loadExtensions: [extname(import.meta.filename)],
  })
}

if (import.meta.main) {
  await migrate(db)
  await db.destroy()
  console.log('migrations applied')
}
