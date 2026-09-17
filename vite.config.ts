/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { appendFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A small local stand-in for the health-worker sync server, so the offline queue has
 * somewhere real to upload to in development and on a demo laptop. Records land in
 * .loom-sync/<profile>.jsonl; an erase request deletes that file.
 *
 * It re-checks every record's shape on arrival — the client already refuses to send
 * anything outside the health-worker boundary, and the server refuses it too.
 */
const SYNC_DIR = join(process.cwd(), '.loom-sync')
const EVENT_KEYS: Record<string, string[]> = {
  activity: ['kind', 't', 'domain', 'cue', 'elapsedMs'],
  session_start: ['kind', 't', 'sessionId'],
  session_end: ['kind', 't', 'sessionId'],
  wayfinding: ['kind', 't', 'extraTaps'],
  reminder_done: ['kind', 't', 'category', 'latencyMs'],
  rudas: ['kind', 't', 'total', 'items', 'administeredBy'],
}

function loomSync(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end()
    }
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const { items } = JSON.parse(body) as { items: Array<Record<string, unknown>> }
        if (!Array.isArray(items)) throw new Error('no items')
        mkdirSync(SYNC_DIR, { recursive: true })
        for (const item of items) {
          const profile = String(item.profileId).replace(/[^a-z0-9_-]/gi, '')
          const file = join(SYNC_DIR, `${profile}.jsonl`)
          if (item.type === 'erase') {
            if (existsSync(file)) rmSync(file)
            continue
          }
          const event = item.event as Record<string, unknown>
          const allowed = EVENT_KEYS[String(event?.kind)]
          if (!allowed || Object.keys(event).some((k) => !allowed.includes(k))) throw new Error('record outside boundary')
          appendFileSync(file, JSON.stringify({ receivedAt: Date.now(), ...event }) + '\n')
        }
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true, received: items.length }))
      } catch (err) {
        res.statusCode = 400
        res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'bad request' }))
      }
    })
  }
  return {
    name: 'loom-sync',
    configureServer: (server) => void server.middlewares.use('/api/sync', handler),
    configurePreviewServer: (server) => void server.middlewares.use('/api/sync', handler),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), loomSync()],
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
})
