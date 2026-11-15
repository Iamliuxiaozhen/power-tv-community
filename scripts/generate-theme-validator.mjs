import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import standaloneCode from 'ajv/dist/standalone/index.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const schemaPath = `${root}/shared/theme/theme.schema.json`
const outputPath = `${root}/shared/theme/theme-validator.generated.ts`

const schema = JSON.parse(await readFile(schemaPath, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: true, code: { source: true, esm: true } })
const validate = ajv.compile(schema)
const source = standaloneCode(ajv, validate)

const banner = `// 由 scripts/generate-theme-validator.mjs 依据 theme.schema.json 生成，请勿手工修改。
// 重新生成：npm run theme:validator
/* eslint-disable */
// @ts-nocheck
`
await writeFile(outputPath, `${banner}${source}\n`)
console.log(`Generated ${outputPath}`)
