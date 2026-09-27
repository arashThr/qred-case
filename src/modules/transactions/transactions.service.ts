import type { Knex } from 'knex'
import { z } from 'zod'
import { AppError } from '../../http/errors.js'
import {
  listTransactions,
  type TransactionCursor,
  type TransactionRow,
} from './transactions.repo.js'
import type {
  Transaction,
  TransactionList,
  TransactionListQuery,
} from './transactions.schema.js'

const Cursor = z.object({ occurredAt: z.iso.datetime(), id: z.string() })

function encodeCursor(row: TransactionRow): string {
  const cursor: TransactionCursor = {
    occurredAt: row.occurred_at.toISOString(),
    id: row.id,
  }
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(cursor: string): TransactionCursor {
  try {
    return Cursor.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid cursor')
  }
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    merchantName: row.merchant,
    amount: { minor: row.amount_minor, currency: row.currency },
    occurredAt: row.occurred_at.toISOString(),
    status: row.status,
  }
}

export async function listCompanyTransactions(
  db: Knex,
  companyId: string,
  { limit, cursor }: TransactionListQuery,
): Promise<TransactionList> {
  const rows = await listTransactions(
    db,
    companyId,
    limit + 1,
    cursor === undefined ? undefined : decodeCursor(cursor),
  )
  const page = rows.slice(0, limit)
  const last = page.at(-1)

  return {
    items: page.map(toTransaction),
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  }
}
