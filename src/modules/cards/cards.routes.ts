import { Router } from 'express'
import type { Knex } from 'knex'
import { CardParams } from './cards.schema.js'
import { activateCard, getCard } from './cards.service.js'

export function cardsRouter(db: Knex): Router {
  const router = Router({ mergeParams: true })

  router.get('/:cardId', async (req, res) => {
    const { companyId, cardId } = CardParams.parse(req.params)
    res.json(await getCard(db, companyId, cardId))
  })

  router.post('/:cardId/activate', async (req, res) => {
    const { companyId, cardId } = CardParams.parse(req.params)
    res.json(await activateCard(db, companyId, cardId))
  })

  return router
}
