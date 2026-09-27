import type { Knex } from 'knex'
import { AppError } from '../../http/errors.js'
import { monthStartUtc } from '../../shared/dates.js'
import { findNewestCard } from '../cards/cards.repo.js'
import { toCard } from '../cards/cards.service.js'
import {
  findCompany,
  listCompaniesForUser,
} from '../companies/companies.repo.js'
import {
  findOldestUnpaidInvoice,
  type InvoiceRow,
} from '../invoices/invoices.repo.js'
import {
  countTransactions,
  listTransactions,
  sumTransactionsSince,
} from '../transactions/transactions.repo.js'
import { toTransaction } from '../transactions/transactions.service.js'
import { findSpendLimit, type SpendLimitRow } from './dashboard.repo.js'
import type { Dashboard, Spend } from './dashboard.schema.js'

const LATEST_TRANSACTIONS = 3

function toInvoiceDue(invoice: InvoiceRow): Dashboard['invoiceDue'] {
  return {
    id: invoice.id,
    status: invoice.status,
    dueDate: invoice.due_date,
    amount: { minor: invoice.amount_minor, currency: invoice.currency },
  }
}

function toSpend(limit: SpendLimitRow, usedMinor: number): Spend {
  return {
    limit: { minor: limit.amount_minor, currency: limit.currency },
    used: { minor: usedMinor, currency: limit.currency },
    remaining: {
      minor: Math.max(limit.amount_minor - usedMinor, 0),
      currency: limit.currency,
    },
    basis: limit.basis,
  }
}

export function getDashboard(
  db: Knex,
  userId: string,
  companyId: string,
  now = new Date(),
): Promise<Dashboard> {
  return db.transaction(
    async (trx) => {
      const [
        company,
        companies,
        invoice,
        card,
        limit,
        used,
        latest,
        totalCount,
      ] = await Promise.all([
        findCompany(trx, companyId),
        listCompaniesForUser(trx, userId),
        findOldestUnpaidInvoice(trx, companyId),
        findNewestCard(trx, companyId),
        findSpendLimit(trx, companyId),
        sumTransactionsSince(trx, companyId, monthStartUtc(now)),
        listTransactions(trx, companyId, LATEST_TRANSACTIONS),
        countTransactions(trx, companyId),
      ])
      if (!company)
        throw new AppError(
          403,
          'COMPANY_FORBIDDEN',
          'Not a member of this company',
        )

      return {
        asOf: now.toISOString(),
        company,
        companies,
        invoiceDue: invoice ? toInvoiceDue(invoice) : null,
        card: card ? toCard(card) : null,
        spend: limit ? toSpend(limit, used) : null,
        transactions: {
          latest: latest.map(toTransaction),
          totalCount,
          remainingCount: totalCount - latest.length,
        },
        actions: {
          activateCard: { enabled: card?.status === 'pending_activation' },
        },
      }
    },
    { isolationLevel: 'repeatable read', readOnly: true },
  )
}
