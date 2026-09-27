import { z } from 'zod'
import {
  createDocument,
  type CreateDocumentOptions,
  type ZodOpenApiObject,
  type ZodOpenApiResponseObject,
} from 'zod-openapi'
import { Card, CardParams } from '../modules/cards/cards.schema.js'
import { CompanyList } from '../modules/companies/companies.schema.js'
import {
  Dashboard,
  dashboardExamples,
} from '../modules/dashboard/dashboard.schema.js'
import { Invoice, InvoiceParams } from '../modules/invoices/invoices.schema.js'
import {
  TransactionList,
  TransactionListQuery,
} from '../modules/transactions/transactions.schema.js'
import { CompanyParams, ErrorResponse } from '../shared/schemas.js'

function ok(description: string, schema: z.ZodType): ZodOpenApiResponseObject {
  return { description, content: { 'application/json': { schema } } }
}

function error(description: string): ZodOpenApiResponseObject {
  return {
    description,
    content: { 'application/json': { schema: ErrorResponse } },
  }
}

const companyErrors = {
  '401': error('Missing or invalid bearer token'),
  '403': error('Caller is not a member of the company'),
}

export function buildDocument(): ReturnType<typeof createDocument> {
  const document: ZodOpenApiObject = {
    openapi: '3.1.0',
    info: {
      title: 'Qred Card Dashboard API',
      version: '1.0.0',
      description:
        'Backend for the mobile card home view. Money is always { minor, currency } in minor units (öre).',
    },
    servers: [{ url: 'http://localhost:3000' }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Demo token: "demo"',
        },
      },
    },
    paths: {
      '/api/v1/companies': {
        get: {
          operationId: 'listCompanies',
          summary: 'Companies the caller is a member of (company switcher)',
          responses: {
            '200': ok('Companies', CompanyList),
            '401': companyErrors['401'],
          },
        },
      },
      '/api/v1/companies/{companyId}/dashboard': {
        get: {
          operationId: 'getDashboard',
          summary:
            'Everything the card home screen needs, read as one snapshot',
          requestParams: { path: CompanyParams },
          responses: {
            '200': {
              description: 'Dashboard',
              content: {
                'application/json': {
                  schema: Dashboard,
                  examples: dashboardExamples,
                },
              },
            },
            ...companyErrors,
          },
        },
      },
      '/api/v1/companies/{companyId}/cards/{cardId}': {
        get: {
          operationId: 'getCard',
          summary: 'A card of the company',
          requestParams: { path: CardParams },
          responses: {
            '200': ok('Card', Card),
            ...companyErrors,
            '404': error('Card not found in this company'),
          },
        },
      },
      '/api/v1/companies/{companyId}/cards/{cardId}/activate': {
        post: {
          operationId: 'activateCard',
          summary:
            'Activate a card. Idempotent: an active card returns 200 unchanged.',
          requestParams: { path: CardParams },
          responses: {
            '200': ok('The activated card', Card),
            ...companyErrors,
            '404': error('Card not found in this company'),
            '409': error('Card cannot be activated (blocked)'),
          },
        },
      },
      '/api/v1/companies/{companyId}/invoices/{invoiceId}': {
        get: {
          operationId: 'getInvoice',
          summary: 'An invoice of the company',
          requestParams: { path: InvoiceParams },
          responses: {
            '200': ok('Invoice', Invoice),
            ...companyErrors,
            '404': error('Invoice not found in this company'),
          },
        },
      },
      '/api/v1/companies/{companyId}/transactions': {
        get: {
          operationId: 'listTransactions',
          summary:
            'All transactions of the company, newest first, cursor paginated',
          requestParams: { path: CompanyParams, query: TransactionListQuery },
          responses: {
            '200': ok('A page of transactions', TransactionList),
            '400': error('Invalid limit or cursor'),
            ...companyErrors,
          },
        },
      },
    },
  }

  const options: CreateDocumentOptions = {
    // format already describes dates; drop the long regex Zod emits alongside it.
    override: ({ jsonSchema }) => {
      if (jsonSchema.format === 'date' || jsonSchema.format === 'date-time') {
        delete jsonSchema.pattern
      }
    },
  }

  return createDocument(document, options)
}
