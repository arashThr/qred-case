import type { Knex } from 'knex'
import { AppError } from '../../http/errors.js'
import { countInvoiceTransactions, findInvoice } from './invoices.repo.js'
import type { Invoice } from './invoices.schema.js'

export async function getInvoice(
  db: Knex,
  companyId: string,
  invoiceId: string,
): Promise<Invoice> {
  const invoice = await findInvoice(db, companyId, invoiceId)
  if (!invoice)
    throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found')

  return {
    id: invoice.id,
    status: invoice.status,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    dueDate: invoice.due_date,
    amount: { minor: invoice.amount_minor, currency: invoice.currency },
    transactionCount: await countInvoiceTransactions(db, invoice.id),
  }
}
