# GymAI Workout API

A lightweight Node.js/TypeScript API (built with [Hono](https://hono.dev)) that generates structured workouts (CrossFit-style, strength, conditioning, etc.) using the OpenAI API.  
The API enforces a flexible JSON schema (via [Zod](https://github.com/colinhacks/zod)) to ensure valid, machine-readable workout blocks.

---

## Features

- **Workout Generation**  
  Generates workouts via `POST /workout` using OpenAI `chat/completions`.

- **Flexible Schema**  
  Supports multiple block types:  
  - `amrap` – As Many Rounds/Reps As Possible in a duration  
  - `for_time` – Complete prescribed work as fast as possible  
  - `emom` – Every Minute On the Minute intervals  
  - `sets` – Classic strength prescriptions (sets × reps, optional load/RPE/rest)

- **Validation**  
  All responses validated against a strict Zod schema and converted to JSON Schema for OpenAI structured outputs.

- **Edge-ready**  
  Runs locally with Node **or** deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/).

---

## Requirements

- Node.js 18+ (or Bun/Deno if you prefer, but Node is primary target)  
- [pnpm](https://pnpm.io) (or npm/yarn)  
- OpenAI API key

---

## Setup

### Clone & install

```bash
git clone https://github.com/yourname/gymai-api.git
cd gymai-api
pnpm install
```

### Environment variables

For Node/dev: create a .env file:

```
OPENAI_API_KEY=sk-xxxx
```

For Cloudflare Workers: set as a Wrangler secret:

```
npx wrangler secret put OPENAI_API_KEY
```

3. Local dev (Node adapter)

```
npm run dev:node
```

4. Local dev (Cloudflare Workers)

```
npm run dev:cf
```

## Endpoints 

### GET /health

```
{ "ok": true }
```

### POST /workout

Body: 

```
{
  "minutes": 30,
  "target": "legs and core",
  "equipment": "dumbbells, barbell",
  "notes": "sweaty but beginner friendly"
}
```

Response: 
```
{
  "id": "wod-123",
  "title": "Legs & Core Chipper",
  "tags": ["legs", "core"],
  "blocks": [
    {
      "type": "amrap",
      "title": "12 Min AMRAP",
      "duration": "PT12M",
      "sequence": [
        { "name": "Row", "distance": 400, "distance_unit": "m" },
        { "name": "Air Squat", "reps": 20 },
        { "name": "Sit-up", "reps": 15 }
      ],
      "score": { "type": "rounds", "cap": "PT12M" }
    }
  ],
  "warmup": ["5 min easy bike", "2×10 air squats"],
  "cooldown": ["Pigeon pose 1 min/side"]
}
```
