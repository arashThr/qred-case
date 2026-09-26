import { writeFile } from 'node:fs/promises'
import { buildDocument } from './document.js'

const target = new URL('../../docs/openapi.json', import.meta.url)
await writeFile(target, `${JSON.stringify(buildDocument(), null, 2)}\n`)
console.log(`wrote ${target.pathname}`)
