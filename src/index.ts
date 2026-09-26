import { createApp } from './app.js'
import { config } from './config.js'
import { db, pingDb } from './db/knex.js'

const app = createApp()

try {
  await pingDb()
  console.log('db connected')
} catch (err) {
  console.error('db connection failed', err)
  process.exit(1)
}

const server = app.listen(config.port, () => {
  console.log(`listening on :${config.port}`)
})

async function shutdown() {
  server.close()
  await db.destroy()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
