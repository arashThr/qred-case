import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import {
  Dashboard,
  dashboardExamples,
} from '../src/modules/dashboard/dashboard.schema.js'
import { buildDocument } from '../src/openapi/document.js'

describe('contract', () => {
  it('docs/openapi.json is generated from the current schemas', async () => {
    const committed = JSON.parse(
      await readFile(new URL('../docs/openapi.json', import.meta.url), 'utf8'),
    )
    const generated = JSON.parse(JSON.stringify(buildDocument()))
    assert.deepEqual(committed, generated, 'Spec is stale: run npm run openapi')
  })

  for (const [name, example] of Object.entries(dashboardExamples)) {
    it(`dashboard example "${name}" matches the schema`, () => {
      assert.doesNotThrow(() => Dashboard.parse(example.value))
    })
  }
})
