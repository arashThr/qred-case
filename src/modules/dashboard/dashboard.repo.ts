import type { Knex } from 'knex'
import type { Spend } from './dashboard.schema.js'

export type SpendLimitRow = {
  company_id: string
  amount_minor: number
  currency: string
  basis: Spend['basis']
}

export function findSpendLimit(
  db: Knex,
  companyId: string,
): Promise<SpendLimitRow | undefined> {
  return db<SpendLimitRow>('spend_limits')
    .where({ company_id: companyId })
    .first()
}
