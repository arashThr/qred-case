import { PostgreSqlContainer } from '@testcontainers/postgresql'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createDb } from '../src/db/knex.js'
import { migrate } from '../src/db/migrate.js'
import { seed } from '../src/db/seed.js'
import { Dashboard } from '../src/modules/dashboard/dashboard.schema.js'

describe('GET /api/v1/companies/:companyId/dashboard', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>
  let client: ReturnType<typeof createDb>
  let app: ReturnType<typeof createApp>

  before(
    async () => {
      container = await new PostgreSqlContainer('postgres:18.6-alpine').start()
      client = createDb(container.getConnectionUri())
      await migrate(client)
      await seed(client)
      app = createApp(client)
    },
    { timeout: 60_000 },
  )

  after(async () => {
    await client.destroy()
    await container.stop()
  })

  it('returns the card home screen for Company AB', async () => {
    const res = await request(app)
      .get('/api/v1/companies/cmp_1/dashboard')
      .set('Authorization', 'Bearer demo')

    assert.equal(res.status, 200)
    const dashboard = Dashboard.parse(res.body)

    assert.equal(dashboard.company.name, 'Company AB')
    assert.equal(dashboard.invoiceDue?.status, 'due')
    assert.equal(dashboard.card?.status, 'pending_activation')
    assert.deepEqual(dashboard.spend, {
      limit: { minor: 1000000, currency: 'SEK' },
      used: { minor: 540000, currency: 'SEK' },
      remaining: { minor: 460000, currency: 'SEK' },
      basis: 'user_set_limit',
    })
    assert.equal(dashboard.transactions.latest.length, 3)
    assert.equal(dashboard.transactions.totalCount, 57)
    assert.equal(dashboard.transactions.remainingCount, 54)
    assert.equal(dashboard.actions.activateCard.enabled, true)
  })
})
