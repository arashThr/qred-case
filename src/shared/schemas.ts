import { z } from 'zod'

export const Money = z
  .object({
    minor: z
      .int()
      .meta({ description: 'Amount in minor units (öre). 5 400 kr = 540000.' }),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .meta({ description: 'ISO 4217 currency code', example: 'SEK' }),
  })
  .meta({ id: 'Money' })
export type Money = z.infer<typeof Money>

export const CompanyParams = z.object({
  companyId: z.string().min(1).meta({ example: 'cmp_1' }),
})

export const ErrorCode = z
  .enum([
    'VALIDATION_ERROR',
    'UNAUTHENTICATED',
    'COMPANY_FORBIDDEN',
    'ROLE_FORBIDDEN',
    'CARD_NOT_FOUND',
    'INVOICE_NOT_FOUND',
    'ROUTE_NOT_FOUND',
    'CARD_NOT_ACTIVATABLE',
    'INTERNAL_ERROR',
  ])
  .meta({ id: 'ErrorCode' })
export type ErrorCode = z.infer<typeof ErrorCode>

export const ErrorResponse = z
  .object({
    error: z.object({
      code: ErrorCode,
      message: z.string(),
    }),
  })
  .meta({
    id: 'ErrorResponse',
    example: {
      error: {
        code: 'COMPANY_FORBIDDEN',
        message: 'Not a member of this company',
      },
    },
  })
export type ErrorResponse = z.infer<typeof ErrorResponse>
