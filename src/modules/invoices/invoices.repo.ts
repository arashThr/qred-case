import type { Knex } from 'knex'
import type { InvoiceStatus } from './invoices.schema.js'

export type InvoiceRow = {
  id: string
  company_id: string
  status: InvoiceStatus
  period_start: string
  period_end: string
  due_date: string
  amount_minor: number
  currency: string
}

function selectInvoices(db: Knex) {
  return db('invoices').select(
    'id',
    'company_id',
    'status',
    db.raw('period_start::text as period_start'),
    db.raw('period_end::text as period_end'),
    db.raw('due_date::text as due_date'),
    'amount_minor',
    'currency',
  )
}

export function findInvoice(
  db: Knex,
  companyId: string,
  invoiceId: string,
): Promise<InvoiceRow | undefined> {
  return selectInvoices(db)
    .where({ id: invoiceId, company_id: companyId })
    .first()
}

export function findOldestUnpaidInvoice(
  db: Knex,
  companyId: string,
): Promise<InvoiceRow | undefined> {
  return selectInvoices(db)
    .where({ company_id: companyId })
    .whereIn('status', ['due', 'overdue'])
    .orderBy('due_date')
    .first()
}

export async function countInvoiceTransactions(
  db: Knex,
  invoiceId: string,
): Promise<number> {
  const row = await db('transactions')
    .where({ invoice_id: invoiceId })
    .first<{ count: number }>(db.raw('count(*)::int as count'))
  return row.count
}
