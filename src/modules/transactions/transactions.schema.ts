import { z } from 'zod'
import { Money } from '../../shared/schemas.js'

export const TransactionStatus = z
  .enum(['pending', 'settled'])
  .meta({ id: 'TransactionStatus' })
export type TransactionStatus = z.infer<typeof TransactionStatus>

export const Transaction = z
  .object({
    id: z.string(),
    merchantName: z.string(),
    amount: Money,
    occurredAt: z.iso.datetime(),
    status: TransactionStatus,
  })
  .meta({
    id: 'Transaction',
    description: 'A ledger entry. amount.minor > 0 is spend, < 0 is a refund.',
    example: {
      id: 'txn_057',
      merchantName: 'ICA Maxi',
      amount: { minor: 12900, currency: 'SEK' },
      occurredAt: '2026-09-27T08:03:00Z',
      status: 'pending',
    },
  })
export type Transaction = z.infer<typeof Transaction>

export const TransactionListQuery = z.object({
  cursor: z.string().min(1).optional().meta({
    description: 'Opaque cursor from a previous page; omit for the first page',
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type TransactionListQuery = z.infer<typeof TransactionListQuery>

export const TransactionList = z
  .object({
    items: z.array(Transaction),
    nextCursor: z
      .string()
      .nullable()
      .meta({ description: 'null on the last page' }),
  })
  .meta({ id: 'TransactionList' })
export type TransactionList = z.infer<typeof TransactionList>
