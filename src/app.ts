import express from 'express'
import type { Knex } from 'knex'
import { db, pingDb } from './db/knex.js'

export function createApp(client: Knex = db) {
  const app = express()

  app.get('/health', async (_req, res) => {
    try {
      await pingDb(client)
      res.json({ status: 'ok', db: 'up' })
    } catch (err) {
      res.status(503).json({
        status: 'error',
        db: 'down',
        message: err instanceof Error ? err.message : 'db ping failed',
      })
    }
  })

  return app
}
