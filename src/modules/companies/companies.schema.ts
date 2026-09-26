import { z } from 'zod'

export const Company = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .meta({ id: 'Company', example: { id: 'cmp_1', name: 'Company AB' } })
export type Company = z.infer<typeof Company>

export const CompanyList = z
  .object({
    items: z.array(Company),
  })
  .meta({ id: 'CompanyList' })
export type CompanyList = z.infer<typeof CompanyList>
