// src/lib/openai.ts
import { workoutJsonSchema } from "./jsonschema"
import { WORKOUT_SYSTEM_PROMPT } from "./system-prompt"

type MakeWorkoutArgs = {
  minutes: number
  target: string
  equipment: string
  notes?: string
}

const MODEL = "gpt-4o-mini"

function resolveApiKey(env?: { OPENAI_API_KEY?: string }) {
  return env?.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY
}

export async function generateWorkoutJSON(
  env: { OPENAI_API_KEY?: string },
  args: MakeWorkoutArgs
) {
  const apiKey = resolveApiKey(env)
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY (set Wrangler secret or .env for Node)")
  }

  const system = WORKOUT_SYSTEM_PROMPT

  const user = `
Generate one workout JSON for:
- approximate duration in minutes: ${args.minutes}
- target (type of workout, muscle groups, or goal): ${args.target}
- equipment available: ${args.equipment}
- additional preferences: ${args.notes ?? ""}

Return ONLY JSON (no markdown).
`.trim()

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "Workout",
          schema: workoutJsonSchema
        }
      },
      temperature: 0.6
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const jsonText = data.choices?.[0]?.message?.content
  if (!jsonText || typeof jsonText !== "string") {
    throw new Error("No JSON content in response")
  }

  return jsonText
}