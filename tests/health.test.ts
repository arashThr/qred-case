import { PostgreSqlContainer } from '@testcontainers/postgresql'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createDb } from '../src/db/knex.js'

describe('health', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>
  let client: ReturnType<typeof createDb>
  let app: ReturnType<typeof createApp>

  before(
    async () => {
      container = await new PostgreSqlContainer('postgres:18.6-alpine').start()
      client = createDb(container.getConnectionUri())
      app = createApp(client)
    },
    { timeout: 60_000 },
  )

  after(async () => {
    await client.destroy()
    await container.stop()
  })

  it('GET /health returns db up', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { status: 'ok', db: 'up' })
  })
})
