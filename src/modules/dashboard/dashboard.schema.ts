import { z } from 'zod'
import { Money } from '../../shared/schemas.js'
import { Card } from '../cards/cards.schema.js'
import { Company } from '../companies/companies.schema.js'
import { Invoice } from '../invoices/invoices.schema.js'
import { Transaction } from '../transactions/transactions.schema.js'

export const InvoiceDue = Invoice.pick({
  id: true,
  status: true,
  dueDate: true,
  amount: true,
}).meta({
  id: 'InvoiceDue',
  description: 'Oldest unpaid invoice. null hides the banner.',
})

export const Spend = z
  .object({
    limit: Money,
    used: Money,
    remaining: Money,
    basis: z.enum(['user_set_limit', 'credit_limit']),
  })
  .meta({
    id: 'Spend',
    description:
      'Spend in the current billing period against the limit. Not the invoice amount.',
  })

export type Spend = z.infer<typeof Spend>

export const Dashboard = z
  .object({
    asOf: z.iso
      .datetime()
      .meta({ description: 'Point in time all figures were read at' }),
    company: Company,
    companies: z
      .array(Company)
      .meta({ description: 'Companies for the switcher' }),
    invoiceDue: InvoiceDue.nullable(),
    card: Card.nullable().meta({
      description: 'Most recently issued card; null if none',
    }),
    spend: Spend.nullable().meta({
      description: 'null if the company has no limit',
    }),
    transactions: z.object({
      latest: z
        .array(Transaction)
        .max(3)
        .meta({ description: 'Newest first, all statuses' }),
      totalCount: z.int().min(0),
      remainingCount: z
        .int()
        .min(0)
        .meta({ description: 'totalCount - latest.length' }),
    }),
    actions: z.object({
      activateCard: z.object({ enabled: z.boolean() }),
    }),
  })
  .meta({ id: 'Dashboard' })
export type Dashboard = z.infer<typeof Dashboard>

const pendingCard: Dashboard = {
  asOf: '2026-09-27T10:00:00Z',
  company: { id: 'cmp_1', name: 'Company AB' },
  companies: [
    { id: 'cmp_1', name: 'Company AB' },
    { id: 'cmp_2', name: 'Other AB' },
  ],
  invoiceDue: {
    id: 'inv_1',
    status: 'due',
    dueDate: '2026-09-30',
    amount: { minor: 312000, currency: 'SEK' },
  },
  card: {
    id: 'crd_1',
    status: 'pending_activation',
    brand: 'VISA',
    last4: '4242',
    activatedAt: null,
  },
  spend: {
    limit: { minor: 1000000, currency: 'SEK' },
    used: { minor: 540000, currency: 'SEK' },
    remaining: { minor: 460000, currency: 'SEK' },
    basis: 'user_set_limit',
  },
  transactions: {
    latest: [
      {
        id: 'txn_057',
        merchantName: 'ICA Maxi',
        amount: { minor: 12900, currency: 'SEK' },
        occurredAt: '2026-09-27T08:03:00Z',
        status: 'pending',
      },
      {
        id: 'txn_056',
        merchantName: 'SJ',
        amount: { minor: 89500, currency: 'SEK' },
        occurredAt: '2026-09-26T16:40:00Z',
        status: 'settled',
      },
      {
        id: 'txn_055',
        merchantName: 'Clas Ohlson',
        amount: { minor: 24900, currency: 'SEK' },
        occurredAt: '2026-09-26T11:15:00Z',
        status: 'settled',
      },
    ],
    totalCount: 57,
    remainingCount: 54,
  },
  actions: { activateCard: { enabled: true } },
}

const activeCardNothingDue: Dashboard = {
  ...pendingCard,
  company: { id: 'cmp_2', name: 'Other AB' },
  invoiceDue: null,
  card: {
    id: 'crd_2',
    status: 'active',
    brand: 'VISA',
    last4: '1881',
    activatedAt: '2026-06-02T09:12:00Z',
  },
  spend: {
    limit: { minor: 2000000, currency: 'SEK' },
    used: { minor: 45000, currency: 'SEK' },
    remaining: { minor: 1955000, currency: 'SEK' },
    basis: 'user_set_limit',
  },
  transactions: {
    latest: [
      {
        id: 'txn_101',
        merchantName: 'Kjell & Company',
        amount: { minor: 45000, currency: 'SEK' },
        occurredAt: '2026-09-25T13:20:00Z',
        status: 'settled',
      },
    ],
    totalCount: 1,
    remainingCount: 0,
  },
  actions: { activateCard: { enabled: false } },
}

const empty: Dashboard = {
  ...pendingCard,
  invoiceDue: null,
  card: null,
  spend: null,
  transactions: { latest: [], totalCount: 0, remainingCount: 0 },
  actions: { activateCard: { enabled: false } },
}

export const dashboardExamples = {
  pendingCard: {
    summary: 'Card awaiting activation, invoice due',
    value: pendingCard,
  },
  activeCardNothingDue: {
    summary: 'Active card, no invoice due',
    value: activeCardNothingDue,
  },
  empty: {
    summary: 'New company: no card, limit or transactions',
    value: empty,
  },
}
