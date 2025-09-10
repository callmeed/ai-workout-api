// src/lib/jsonschema.ts
import * as z from "zod";
import { Workout } from "./schema";

// Produce plain JSON Schema (draft-2020-12).
export const workoutJsonSchema = z.toJSONSchema(Workout, {
  target: "draft-2020-12",
});

// Minimal JSON Schema that matches the workout shape we’re generating.
// Good enough for model-constrained output today; expand as you add features.

/*
export const workoutJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "blocks"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
    warmup: { type: "array", items: { type: "string" } },
    cooldown: { type: "array", items: { type: "string" } },
    blocks: {
      type: "array",
      minItems: 1,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "title", "duration", "repeat", "sequence", "score"],
            properties: {
              type: { const: "amrap" },
              title: { type: "string" },
              duration: { type: "string", pattern: "^PT.*$" },
              repeat: { type: "integer", minimum: 1 },
              sequence: { type: "array", minItems: 1, items: { $ref: "#/$defs/movement" } },
              score: { $ref: "#/$defs/score" },
              notes: { type: "string" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "title", "rounds", "sequence", "score"],
            properties: {
              type: { const: "for_time" },
              title: { type: "string" },
              rounds: { type: "integer", minimum: 1 },
              time_cap: { type: "string", pattern: "^PT.*$", description: "Time cap in ISO-8601 (e.g., PT20M). Omit or set null if no cap." },
              sequence: { type: "array", minItems: 1, items: { $ref: "#/$defs/movement" } },
              score: { $ref: "#/$defs/score" },
              notes: { type: "string" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "title", "minutes", "slots", "score"],
            properties: {
              type: { const: "emom" },
              title: { type: "string" },
              minutes: { type: "integer", minimum: 1 },
              slots: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["minute_mod", "work"],
                  properties: {
                    minute_mod: { type: "integer", minimum: 1 },
                    work: { type: "array", minItems: 1, items: { $ref: "#/$defs/movement" } }
                  }
                }
              },
              score: { $ref: "#/$defs/score" },
              notes: { type: "string" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "title", "exercise", "scheme", "score"],
            properties: {
              type: { const: "sets" },
              title: { type: "string" },
              exercise: { type: "string" },
              scheme: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["sets", "reps"],
                  properties: {
                    sets: { type: "integer", minimum: 1 },
                    reps: { type: "integer", minimum: 1 },
                    load: { $ref: "#/$defs/load" },
                    rpe: { type: "number", minimum: 1, maximum: 10 },
                    rest: { type: "string", pattern: "^PT.*$" }
                  }
                }
              },
              score: { $ref: "#/$defs/score" },
              notes: { type: "string" }
            }
          }
        ]
      }
    }
  },
  $defs: {
    movement: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string" },
        reps: { type: "integer", minimum: 1 },
        distance: { type: "number", minimum: 0 },
        distance_unit: { type: "string", enum: ["m", "km", "mi"] },
        calories: { type: "integer", minimum: 1 },
        time: { type: "string", pattern: "^PT.*$" },
        load: { $ref: "#/$defs/load" },
        tempo: { type: "string" },
        equipment: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
        scaling: { type: "array", items: { type: "string" } }
      }
    },
    load: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "number", minimum: 0 },
        unit: { type: "string", enum: ["lb", "kg"] },
        percent_of: { type: "string", enum: ["1RM", "BW"] }
      }
    },
    score: {
      type: "object",
      additionalProperties: false,
      required: ["type", "cap"],
      properties: {
        type: { type: "string", enum: ["reps", "rounds", "time", "load", "calories", "distance"] },
        tie_break: { type: "string" },
        target: { type: "number" },
        cap: {
          description: "Time cap in ISO-8601 (e.g., PT20M). Omit or set null if no cap.",
          anyOf: [
            { type: "string", pattern: "^PT(?:\\d+H)?(?:\\d+M)?(?:\\d+S)?$" },
            { type: "null" }
          ],
          examples: ["PT12M", "PT20M", null]
        }
      }
    }
  }
} as const
*/