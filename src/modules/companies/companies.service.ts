import type { Knex } from 'knex'
import type { CompanyList } from './companies.schema.js'
import { listCompaniesForUser } from './companies.repo.js'

export async function listCompanies(
  db: Knex,
  userId: string,
): Promise<CompanyList> {
  return { items: await listCompaniesForUser(db, userId) }
}
