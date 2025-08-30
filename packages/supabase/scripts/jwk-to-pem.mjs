#!/usr/bin/env node
// Convert a JWK (with private 'd') to a PKCS#8 PEM and write a safe .env.local.example
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { importJWK, exportPKCS8 } from 'jose'


function usage() {
  console.log('Usage: node scripts/jwk-to-pem.mjs --jwk <jwk.json> [--out-pem <out.pem>] [--env-example <path>]')
  console.log('If no args are provided the script will try sensible defaults and common locations.')
}

const argv = process.argv.slice(2)
if (argv.includes('--help') || argv.includes('-h')) {
  usage()
  process.exit(0)
}

function getArg(name, fallback) {
  const idx = argv.indexOf(name)
  if (idx === -1) return fallback
  return argv[idx + 1]
}

// Resolve paths relative to this workspace, independent of current working directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const baseDir = path.resolve(__dirname, '..') // packages/supabase
const outDir = path.join(baseDir, 'out')

// sensible default paths (Command-line args override these)
const jwkCmd = getArg('--jwk', null)
const outPemCmd = getArg('--out-pem', null)
const envPath = getArg('--env', path.join(baseDir, '../nextjs/.env.local'))

// If user passed explicit paths, use them; otherwise probe common locations.
function firstExisting(paths) {
  for (const p of paths) if (fs.existsSync(p)) return p
  return paths[0]
}

const jwkPath = jwkCmd || firstExisting([
  path.join(outDir, 'signing_key.json'),
  path.join(baseDir, 'signing_key.json'),
  'signing_key.json'
])
const outPem = outPemCmd || firstExisting([
  path.join(outDir, 'signing_key.pem')
])

async function main() {
  if (!fs.existsSync(jwkPath)) {
  console.error(`JWK file not found: ${jwkPath}`)
  console.error('If you moved the signing key, pass its path with --jwk /full/path/to/jwk.json')
  process.exit(2)
  }

  const raw = fs.readFileSync(jwkPath, 'utf8')
  let jwkJson
  try {
    jwkJson = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse JWK JSON:', e.message)
    process.exit(3)
  }

  // support either an array of keys or a single jwk object
  const jwk = Array.isArray(jwkJson) ? jwkJson[0] : jwkJson
  if (!jwk || !jwk.d) {
    console.error('JWK does not contain a private scalar `d`. Provide a JWK that includes `d`.')
    process.exit(4)
  }

  // Determine alg implicitly if provided, default to ES256
  const alg = jwk.alg || 'ES256'

  console.log(`Importing JWK and exporting PEM (alg=${alg})`)
  try {
    let pem
    try {
      const key = await importJWK(jwk, alg)
      pem = await exportPKCS8(key)
    } catch (innerErr) {
      // Fallback: try jwk-to-pem package which can convert EC JWKs to PEM without WebCrypto
      try {
        const mod = await import('jwk-to-pem')
        const jwkToPem = mod.default || mod
        // For private keys jwk-to-pem expects the full jwk with d
        pem = jwkToPem(jwk, { private: true })
      } catch (fallbackErr) {
        throw innerErr
      }
    }

    // write the pem to a local file (gitignored by default in many setups; do NOT commit)
  const outDirLocal = path.dirname(outPem)
  if (!fs.existsSync(outDirLocal)) fs.mkdirSync(outDirLocal, { recursive: true })
    fs.writeFileSync(outPem, pem, { mode: 0o600 })
    console.log(`Wrote private key PEM to: ${outPem}`)

  // Write the PEM into the real env file (escaped with \n) so local dev picks it up.
    try {
      const realEnvPath = envPath
      let envContent = ''
      if (fs.existsSync(realEnvPath)) envContent = fs.readFileSync(realEnvPath, 'utf8')

      // Prepare escaped PEM for single-line env values
      const pemEscaped = pem.replace(/\r?\n/g, '\\n')
      const replacementLine = `SUPABASE_JWT_PRIVATE_KEY="${pemEscaped}"`

      if (/^SUPABASE_JWT_PRIVATE_KEY=.*$/m.test(envContent)) {
        envContent = envContent.replace(/^SUPABASE_JWT_PRIVATE_KEY=.*$/m, replacementLine)
      } else {
        if (envContent.length && !envContent.endsWith('\n')) envContent += '\n'
        envContent += `\n${replacementLine}\n`
      }

      fs.writeFileSync(realEnvPath, envContent, 'utf8')
      console.log(`Wrote SUPABASE_JWT_PRIVATE_KEY into: ${realEnvPath}`)
    } catch (envErr) {
      console.error('Failed to write PEM into env file:', envErr)
    }

  // Keep PEM for future use as requested; ensure it's ignored by VCS
  } catch (err) {
    console.error('Failed to convert JWK to PEM:', err)
    process.exit(5)
  }
}

main()
