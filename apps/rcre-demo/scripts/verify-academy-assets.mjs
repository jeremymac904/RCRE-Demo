/**
 * Verifies that every public path emitted by src/data/academy.ts resolves to a
 * real file under public/, and that the declared byte sizes match reality.
 * Run: node scripts/verify-academy-assets.mjs
 */
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const src = readFileSync(join(root, 'src/data/academy.ts'), 'utf8')

const privateRoot = join(root, '../../training-assets/protected')
const resolveAsset = r => /^\/academy\/(handouts|downloads|video)\//.test(r) ? join(privateRoot, r.replace('/academy/', '')) : join(pub, r)
const refs = [...src.matchAll(/'(\/academy\/[^']+)'/g)].map((m) => m[1])
const sized = [...src.matchAll(/href: '(\/academy\/[^']+)',\n\s*bytes: (\d+)/g)]

let missing = 0, wrongSize = 0
for (const r of new Set(refs)) {
  if (!existsSync(resolveAsset(r))) { console.error('MISSING  ' + r); missing++ }
}
for (const [, href, bytes] of sized) {
  const p = resolveAsset(href)
  if (!existsSync(p)) continue
  const actual = statSync(p).size
  if (actual !== Number(bytes)) { console.error(`SIZE     ${href} declared ${bytes} actual ${actual}`); wrongSize++ }
}

// Orphans: files under public/academy that nothing references.
const walk = (d, base) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name), base + '/' + e.name) : [base + '/' + e.name])
const onDisk = [...walk(join(pub, 'academy'), '/academy'), ...walk(privateRoot, '/academy')]
const referenced = new Set(refs)
const orphans = onDisk.filter((f) => !referenced.has(f))

console.log(`refs: ${new Set(refs).size} unique · missing: ${missing} · size mismatches: ${wrongSize}`)
console.log(`files on disk: ${onDisk.length} · unreferenced: ${orphans.length}`)
if (orphans.length) orphans.forEach((o) => console.log('  unreferenced ' + o))
process.exit(missing + wrongSize === 0 ? 0 : 1)
