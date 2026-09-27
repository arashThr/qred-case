import type { Knex } from 'knex'
import { AppError } from '../../http/errors.js'
import type { MembershipRole } from '../companies/companies.repo.js'
import { activatePendingCard, type CardRow, findCard } from './cards.repo.js'
import type { Card } from './cards.schema.js'

export function toCard(row: CardRow): Card {
  return {
    id: row.id,
    status: row.status,
    brand: row.brand,
    last4: row.last4,
    activatedAt: row.activated_at?.toISOString() ?? null,
  }
}

async function findCardOrThrow(
  db: Knex,
  companyId: string,
  cardId: string,
): Promise<CardRow> {
  const card = await findCard(db, companyId, cardId)
  if (!card) throw new AppError(404, 'CARD_NOT_FOUND', 'Card not found')
  return card
}

export async function getCard(
  db: Knex,
  companyId: string,
  cardId: string,
): Promise<Card> {
  return toCard(await findCardOrThrow(db, companyId, cardId))
}

export function canActivateCards(role: MembershipRole): boolean {
  return role === 'admin'
}

export async function activateCard(
  db: Knex,
  role: MembershipRole,
  companyId: string,
  cardId: string,
): Promise<Card> {
  if (!canActivateCards(role)) {
    throw new AppError(403, 'ROLE_FORBIDDEN', 'Only admins can activate cards')
  }

  const activated = await activatePendingCard(db, companyId, cardId)
  if (activated) return toCard(activated)

  const card = await findCardOrThrow(db, companyId, cardId)
  if (card.status === 'active') return toCard(card)
  throw new AppError(
    409,
    'CARD_NOT_ACTIVATABLE',
    `A ${card.status} card cannot be activated`,
  )
}
