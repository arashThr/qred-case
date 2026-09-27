import type { Knex } from 'knex'
import type { TransactionStatus } from './transactions.schema.js'

export type TransactionRow = {
  id: string
  company_id: string
  merchant: string
  amount_minor: number
  currency: string
  occurred_at: Date
  status: TransactionStatus
}

export type TransactionCursor = {
  occurredAt: string
  id: string
}

export function listTransactions(
  db: Knex,
  companyId: string,
  limit: number,
  after?: TransactionCursor,
): Promise<TransactionRow[]> {
  const query = db<TransactionRow>('transactions')
    .where({ company_id: companyId })
    .orderBy([
      { column: 'occurred_at', order: 'desc' },
      { column: 'id', order: 'desc' },
    ])
    .limit(limit)
  if (after) {
    query.whereRaw('(occurred_at, id) < (?, ?)', [after.occurredAt, after.id])
  }
  return query
}

export async function countTransactions(
  db: Knex,
  companyId: string,
): Promise<number> {
  const row = await db('transactions')
    .where({ company_id: companyId })
    .first<{ count: number }>(db.raw('count(*)::int as count'))
  return row.count
}

export async function sumTransactionsSince(
  db: Knex,
  companyId: string,
  since: Date,
): Promise<number> {
  const row = await db('transactions')
    .where({ company_id: companyId })
    .where('occurred_at', '>=', since)
    .first<{ total: number }>(
      db.raw('coalesce(sum(amount_minor), 0)::int as total'),
    )
  return row.total
}
