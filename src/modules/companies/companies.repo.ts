import type { Knex } from 'knex'

export type MembershipRole = 'admin' | 'member'

export type CompanyRow = {
  id: string
  name: string
}

export function listCompaniesForUser(
  db: Knex,
  userId: string,
): Promise<CompanyRow[]> {
  return db('companies')
    .join('memberships', 'memberships.company_id', 'companies.id')
    .where('memberships.user_id', userId)
    .select('companies.id', 'companies.name')
    .orderBy('companies.name')
}

export function findCompany(
  db: Knex,
  companyId: string,
): Promise<CompanyRow | undefined> {
  return db('companies').where({ id: companyId }).first('id', 'name')
}

export async function findMembershipRole(
  db: Knex,
  userId: string,
  companyId: string,
): Promise<MembershipRole | undefined> {
  const membership = await db('memberships')
    .where({ user_id: userId, company_id: companyId })
    .first<{ role: MembershipRole } | undefined>('role')
  return membership?.role
}
