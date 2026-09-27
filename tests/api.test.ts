import { PostgreSqlContainer } from '@testcontainers/postgresql'
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createDb } from '../src/db/knex.js'
import { migrate } from '../src/db/migrate.js'
import { seed } from '../src/db/seed.js'
import { Card } from '../src/modules/cards/cards.schema.js'
import { Dashboard } from '../src/modules/dashboard/dashboard.schema.js'
import { TransactionList } from '../src/modules/transactions/transactions.schema.js'
import { ErrorResponse } from '../src/shared/schemas.js'

const AUTH = 'Bearer demo'

describe('API', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>
  let client: ReturnType<typeof createDb>
  let app: ReturnType<typeof createApp>

  before(
    async () => {
      container = await new PostgreSqlContainer('postgres:18.6-alpine').start()
      client = createDb(container.getConnectionUri())
      await migrate(client)
      app = createApp(client)
    },
    { timeout: 60_000 },
  )

  beforeEach(async () => {
    await seed(client)
  })

  after(async () => {
    await client.destroy()
    await container.stop()
  })

  const get = (path: string) =>
    request(app).get(path).set('Authorization', AUTH)
  const post = (path: string) =>
    request(app).post(path).set('Authorization', AUTH)

  it('GET /health reports the database as up', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { status: 'ok', db: 'up' })
  })

  it('returns the card home screen for Company AB', async () => {
    const res = await get('/api/v1/companies/cmp_1/dashboard')

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

  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/v1/companies/cmp_1/dashboard')
    assert.equal(res.status, 401)
    assert.equal(ErrorResponse.parse(res.body).error.code, 'UNAUTHENTICATED')
  })

  it('rejects companies the user is not a member of', async () => {
    const res = await get('/api/v1/companies/cmp_3/dashboard')
    assert.equal(res.status, 403)
    assert.equal(ErrorResponse.parse(res.body).error.code, 'COMPANY_FORBIDDEN')
  })

  it("does not expose another company's card", async () => {
    const res = await get('/api/v1/companies/cmp_1/cards/crd_2')
    assert.equal(res.status, 404)
    assert.equal(ErrorResponse.parse(res.body).error.code, 'CARD_NOT_FOUND')
  })

  it('activates a card idempotently and updates the dashboard', async () => {
    const first = await post('/api/v1/companies/cmp_1/cards/crd_1/activate')
    const second = await post('/api/v1/companies/cmp_1/cards/crd_1/activate')

    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(Card.parse(first.body).status, 'active')
    assert.deepEqual(second.body, first.body)

    const dashboard = Dashboard.parse(
      (await get('/api/v1/companies/cmp_1/dashboard')).body,
    )
    assert.equal(dashboard.card?.status, 'active')
    assert.equal(dashboard.actions.activateCard.enabled, false)
  })

  it('only lets admins activate cards', async () => {
    const res = await post('/api/v1/companies/cmp_2/cards/crd_2/activate')
    assert.equal(res.status, 403)
    assert.equal(ErrorResponse.parse(res.body).error.code, 'ROLE_FORBIDDEN')
  })

  it('pages through all transactions with the cursor', async () => {
    const ids: string[] = []
    let cursor: string | null = null
    do {
      const query: string = cursor ? `&cursor=${cursor}` : ''
      const res = await get(
        `/api/v1/companies/cmp_1/transactions?limit=20${query}`,
      )
      assert.equal(res.status, 200)
      const page = TransactionList.parse(res.body)
      ids.push(...page.items.map((t) => t.id))
      cursor = page.nextCursor
    } while (cursor)

    assert.equal(ids.length, 57)
    assert.equal(new Set(ids).size, 57)
    assert.equal(ids[0], 'txn_057')
  })
})
