import { z } from 'zod'
import { CompanyParams, Money } from '../../shared/schemas.js'

export const InvoiceParams = CompanyParams.extend({
  invoiceId: z.string().min(1).meta({ example: 'inv_1' }),
})

export const InvoiceStatus = z
  .enum(['due', 'overdue', 'paid'])
  .meta({ id: 'InvoiceStatus' })
export type InvoiceStatus = z.infer<typeof InvoiceStatus>

export const Invoice = z
  .object({
    id: z.string(),
    status: InvoiceStatus,
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    dueDate: z.iso.date(),
    amount: Money,
    transactionCount: z.int().min(0),
  })
  .meta({
    id: 'Invoice',
    example: {
      id: 'inv_1',
      status: 'due',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      dueDate: '2026-09-30',
      amount: { minor: 312000, currency: 'SEK' },
      transactionCount: 7,
    },
  })
export type Invoice = z.infer<typeof Invoice>
