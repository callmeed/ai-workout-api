import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { generateWorkoutJSON } from './lib/openai'
import { Workout } from './lib/schema'

type Env = {
  OPENAI_API_KEY: string
}

export const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true }))

// ---- NEW: /workout POST ----
const GenerateParams = z.object({
  minutes: z.number().int().min(5).max(120),
  target: z.string().min(1),
  equipment: z.string().min(1),
  notes: z.string().optional(),
})

app.post('/workout', zValidator('json', GenerateParams), async (c) => {
  const { minutes, target, equipment, notes } = c.req.valid('json')

  // 1) Call OpenAI
  let raw: string
  try {
    raw = await generateWorkoutJSON(c.env, { minutes, target, equipment, notes })
  } catch (e: any) {
    console.error('OpenAI call failed:', e)
    return c.json({ error: 'Upstream model error', detail: e?.message ?? String(e) }, 502)
  }

  // 2) Parse JSON
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch (e) {
    console.error('Model returned non-JSON:', raw)
    return c.json({ error: 'Model did not return valid JSON' }, 502)
  }

  // 3) Validate with Zod
  const parsed = Workout.safeParse(obj)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => ({
      path: i.path.join('.'),
      code: i.code,
      message: i.message
    }))
    return c.json({ error: 'Schema validation failed', issues }, 422)
  }

  // 4) Success
  return c.json(parsed.data, 200)
})