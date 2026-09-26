import { z } from 'zod'
import { CompanyParams } from '../../shared/schemas.js'

export const CardParams = CompanyParams.extend({
  cardId: z.string().min(1).meta({ example: 'crd_1' }),
})

export const CardStatus = z
  .enum(['pending_activation', 'active', 'blocked'])
  .meta({ id: 'CardStatus' })
export type CardStatus = z.infer<typeof CardStatus>

export const Card = z
  .object({
    id: z.string(),
    status: CardStatus,
    brand: z.enum(['VISA']),
    last4: z.string().regex(/^\d{4}$/),
    activatedAt: z.iso.datetime().nullable(),
  })
  .meta({
    id: 'Card',
    example: {
      id: 'crd_1',
      status: 'pending_activation',
      brand: 'VISA',
      last4: '4242',
      activatedAt: null,
    },
  })
export type Card = z.infer<typeof Card>
