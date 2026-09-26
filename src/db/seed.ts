import type { Knex } from 'knex'
import { db } from './knex.js'

const DAY_MS = 24 * 60 * 60 * 1000

type TransactionRow = {
  id: string
  company_id: string
  card_id: string
  amount_minor: number
  currency: string
  merchant: string
  occurred_at: Date
  status: 'pending' | 'settled'
  invoice_id: string | null
}

type TransactionDraft = Omit<
  TransactionRow,
  'id' | 'company_id' | 'card_id' | 'currency'
>

type Purchase = [merchant: string, amountMinor: number]

// Last month, billed on inv_1: 3 120 kr in total.
const LAST_MONTH: Purchase[] = [
  ['Scandic', 145000],
  ['SJ', 45000],
  ['ICA Maxi', 23000],
  ['Circle K', 54000],
  ['Clas Ohlson', 15000],
  ['Webhallen', 20000],
  ['Postnord', 10000],
]

// This month: 883 kr + 299 kr + 6 × 703 kr = 5 400 kr used.
const THIS_MONTH_FIRST: Purchase[] = [
  ['SAS', 88300],
  ['Elgiganten', 29900],
]
const THIS_MONTH_REPEATING: Purchase[] = [
  ['ICA Maxi', 12900],
  ['SJ', 8900],
  ['Clas Ohlson', 4900],
  ['Circle K', 6500],
  ['Webhallen', 15900],
  ['Espresso House', 3900],
  ['Bauhaus', 9900],
  ['Postnord', 7400],
]
const PENDING_NEWEST = 4

function monthStartUtc(date: Date, offsetMonths = 0): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offsetMonths, 1),
  )
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function txnId(n: number): string {
  return `txn_${String(n).padStart(3, '0')}`
}

function thisMonthPurchases(): Purchase[] {
  const purchases = [...THIS_MONTH_FIRST]
  for (let round = 0; round < 6; round++) {
    purchases.push(...THIS_MONTH_REPEATING)
  }
  return purchases
}

// Purchases this and last month were made with crd_0; crd_1 is its replacement awaiting activation.
function companyAbTransactions(now: Date): TransactionRow[] {
  const lastMonthStart = monthStartUtc(now, -1)
  const thisMonthStart = monthStartUtc(now)
  const elapsed = now.getTime() - thisMonthStart.getTime()
  const purchases = thisMonthPurchases()

  const billed: TransactionDraft[] = LAST_MONTH.map(
    ([merchant, amount], i) => ({
      merchant,
      amount_minor: amount,
      occurred_at: new Date(lastMonthStart.getTime() + (1 + i * 4) * DAY_MS),
      status: 'settled',
      invoice_id: 'inv_1',
    }),
  )

  const unbilled: TransactionDraft[] = purchases.map(
    ([merchant, amount], i) => ({
      merchant,
      amount_minor: amount,
      occurred_at: new Date(
        thisMonthStart.getTime() +
          Math.floor((elapsed * (i + 1)) / (purchases.length + 1)),
      ),
      status: i >= purchases.length - PENDING_NEWEST ? 'pending' : 'settled',
      invoice_id: null,
    }),
  )

  return [...billed, ...unbilled].map((t, i) => ({
    ...t,
    id: txnId(i + 1),
    company_id: 'cmp_1',
    card_id: 'crd_0',
    currency: 'SEK',
  }))
}

export async function seed(client: Knex, now = new Date()): Promise<void> {
  const lastMonthStart = monthStartUtc(now, -1)
  const lastMonthEnd = new Date(monthStartUtc(now).getTime() - DAY_MS)
  const thisMonthEnd = new Date(monthStartUtc(now, 1).getTime() - DAY_MS)
  const cmp1Transactions = companyAbTransactions(now)
  const invoiceTotal = cmp1Transactions
    .filter((t) => t.invoice_id === 'inv_1')
    .reduce((sum, t) => sum + t.amount_minor, 0)

  await client.transaction(async (trx) => {
    await trx.raw(
      'truncate transactions, invoices, spend_limits, cards, memberships, companies, users cascade',
    )

    await trx('users').insert([{ id: 'usr_1', name: 'Arash' }])

    await trx('companies').insert([
      { id: 'cmp_1', name: 'Company AB' },
      { id: 'cmp_2', name: 'Other AB' },
      { id: 'cmp_3', name: 'Stranger AB' },
    ])

    await trx('memberships').insert([
      { user_id: 'usr_1', company_id: 'cmp_1', role: 'owner' },
      { user_id: 'usr_1', company_id: 'cmp_2', role: 'admin' },
    ])

    await trx('cards').insert([
      {
        id: 'crd_0',
        company_id: 'cmp_1',
        status: 'active',
        brand: 'VISA',
        last4: '1234',
        issued_at: new Date(now.getTime() - 400 * DAY_MS),
        activated_at: new Date(now.getTime() - 398 * DAY_MS),
      },
      {
        id: 'crd_1',
        company_id: 'cmp_1',
        status: 'pending_activation',
        brand: 'VISA',
        last4: '4242',
        issued_at: new Date(now.getTime() - 3 * DAY_MS),
        activated_at: null,
      },
      {
        id: 'crd_2',
        company_id: 'cmp_2',
        status: 'active',
        brand: 'VISA',
        last4: '1881',
        issued_at: new Date(now.getTime() - 120 * DAY_MS),
        activated_at: new Date(now.getTime() - 118 * DAY_MS),
      },
      {
        id: 'crd_3',
        company_id: 'cmp_3',
        status: 'active',
        brand: 'VISA',
        last4: '7777',
        issued_at: new Date(now.getTime() - 60 * DAY_MS),
        activated_at: new Date(now.getTime() - 59 * DAY_MS),
      },
    ])

    await trx('spend_limits').insert([
      {
        company_id: 'cmp_1',
        amount_minor: 1000000,
        currency: 'SEK',
        basis: 'user_set_limit',
      },
      {
        company_id: 'cmp_2',
        amount_minor: 2000000,
        currency: 'SEK',
        basis: 'user_set_limit',
      },
    ])

    await trx('invoices').insert([
      {
        id: 'inv_1',
        company_id: 'cmp_1',
        period_start: isoDate(lastMonthStart),
        period_end: isoDate(lastMonthEnd),
        due_date: isoDate(thisMonthEnd),
        amount_minor: invoiceTotal,
        currency: 'SEK',
        status: 'due',
      },
    ])

    await trx('transactions').insert([
      ...cmp1Transactions,
      {
        id: 'txn_101',
        company_id: 'cmp_2',
        card_id: 'crd_2',
        amount_minor: 45000,
        currency: 'SEK',
        merchant: 'Kjell & Company',
        occurred_at: new Date(
          (monthStartUtc(now).getTime() + now.getTime()) / 2,
        ),
        status: 'settled',
        invoice_id: null,
      },
    ])
  })
}

if (import.meta.main) {
  await seed(db)
  await db.destroy()
  console.log('seed data inserted')
}
