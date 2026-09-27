import type { Knex } from 'knex'
import type { Card, CardStatus } from './cards.schema.js'

export type CardRow = {
  id: string
  company_id: string
  status: CardStatus
  brand: Card['brand']
  last4: string
  issued_at: Date
  activated_at: Date | null
}

export function findCard(
  db: Knex,
  companyId: string,
  cardId: string,
): Promise<CardRow | undefined> {
  return db<CardRow>('cards')
    .where({ id: cardId, company_id: companyId })
    .first()
}

export function findNewestCard(
  db: Knex,
  companyId: string,
): Promise<CardRow | undefined> {
  return db<CardRow>('cards')
    .where({ company_id: companyId })
    .orderBy([
      { column: 'issued_at', order: 'desc' },
      { column: 'id', order: 'desc' },
    ])
    .first()
}

export async function activatePendingCard(
  db: Knex,
  companyId: string,
  cardId: string,
): Promise<CardRow | undefined> {
  const [card] = await db<CardRow>('cards')
    .where({ id: cardId, company_id: companyId, status: 'pending_activation' })
    .update({ status: 'active', activated_at: new Date() })
    .returning('*')
  return card
}
