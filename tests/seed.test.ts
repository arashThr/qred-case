import { PostgreSqlContainer } from '@testcontainers/postgresql'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createDb } from '../src/db/knex.js'
import { migrate } from '../src/db/migrate.js'
import { seed } from '../src/db/seed.js'

describe('migrations and seed', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>
  let client: ReturnType<typeof createDb>

  before(
    async () => {
      container = await new PostgreSqlContainer('postgres:18.6-alpine').start()
      client = createDb(container.getConnectionUri())
      await migrate(client)
    },
    { timeout: 60_000 },
  )

  after(async () => {
    await client.destroy()
    await container.stop()
  })

  it('migrate is a no-op when already applied', async () => {
    await migrate(client)
  })

  for (const now of [
    new Date('2026-09-27T10:00:00Z'),
    new Date('2026-10-01T00:05:00Z'),
    new Date('2026-12-31T23:59:00Z'),
    new Date('2027-01-01T00:05:00Z'),
  ]) {
    it(`matches the wireframe when seeded at ${now.toISOString()}`, async () => {
      await seed(client, now)

      const {
        rows: [counts],
      } = await client.raw(
        `select count(*)::int as total,
                coalesce(sum(amount_minor) filter (
                  where occurred_at >= date_trunc('month', ?::timestamptz, 'UTC')
                ), 0)::int as used
           from transactions where company_id = 'cmp_1'`,
        [now],
      )
      assert.deepEqual(counts, { total: 57, used: 540000 })

      const invoice = await client('invoices').where({ id: 'inv_1' }).first()
      const {
        rows: [billed],
      } = await client.raw(
        `select sum(amount_minor)::int as total from transactions where invoice_id = 'inv_1'`,
      )
      assert.equal(invoice.amount_minor, billed.total)
      assert.equal(invoice.status, 'due')

      const latest = await client('transactions')
        .where({ company_id: 'cmp_1' })
        .orderBy([
          { column: 'occurred_at', order: 'desc' },
          { column: 'id', order: 'desc' },
        ])
        .limit(3)
      assert.equal(new Set(latest.map((t) => t.merchant)).size, 3)
      assert.ok(latest.every((t) => t.occurred_at <= now))
    })
  }
})
