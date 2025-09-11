// src/lib/schema.ts
import { z } from "zod"

/** Reusable helpers */
const isoDuration = z
  .string()
  // Matches PT#H#M#S (any subset, but in H→M→S order)
  .regex(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/, "Use ISO-8601 duration, e.g., PT20S, PT5M, PT1H30M")
  .meta({
    title: "ISO-8601 Duration",
    description: "Duration in ISO-8601 (PT#H#M#S). Examples: PT20S, PT5M, PT1H30M",
    examples: ["PT20S", "PT5M", "PT1H30M"],
  })

const positiveInt = z.number().int().min(1)

const nullableString = z.string().nullable().optional()
const nullableNumber = z.number().nullable().optional()

/** Load (weight prescription) */
export const Load = z
  .object({
    value: z.number().nonnegative().meta({ description: "Numeric load value (non-negative)" }),
    // Make unit optional so percent-only is allowed when percent_of is used
    unit: z.enum(["lb", "kg"]).optional().meta({ description: "Load unit: pounds or kilograms (omit when using percent_of)" }),
    percent_of: z
      .enum(["1RM", "BW"])
      .nullable()
      .optional()
      .meta({ description: "If present, value is interpreted as a percentage of 1RM or bodyweight; null/omit otherwise" }),
  })
  .strict()
  .meta({
    title: "Load",
    description: "Absolute load (value+unit) OR percentage (value+percent_of). Avoid mixing if possible.",
  })

/** Movement (one exercise item) — keys optional+nullable to tolerate model omissions */
export const Movement = z
  .object({
    name: z.string().meta({ description: "Exercise name (e.g., Pull-up, Row, Air Squat)" }),
    reps: positiveInt.optional().nullable().meta({ description: "Repetitions; null/omit if not applicable" }),
    distance: z.number().nonnegative().optional().nullable().meta({ description: "Distance value; null/omit if not applicable" }),
    distance_unit: z
      .enum(["m", "km", "mi"])
      .optional()
      .nullable()
      .meta({ description: "Unit for distance (meters, kilometers, miles); null/omit if not applicable" }),
    calories: positiveInt.optional().nullable().meta({ description: "Calories for erg work; null/omit if not applicable" }),
    time: isoDuration.optional().nullable().meta({ description: "Time budget (ISO-8601); null/omit if not applicable" }),
    load: Load.optional().nullable().meta({ description: "Load prescription; null/omit if bodyweight / not applicable" }),
    tempo: nullableString.meta({ description: "Tempo notation, e.g., 30X0; null/omit if not applicable" }),
    equipment: z.array(z.string()).optional().nullable().meta({ description: "Equipment used; null/omit if not applicable" }),
    notes: nullableString.meta({ description: "Coaching or scaling notes; null/omit if not applicable" }),
    scaling: z.array(z.string()).optional().nullable().meta({ description: "Alternative versions for scaling; null/omit if none" }),
  })
  .strict()
  .meta({
    title: "Movement",
    description:
      "A single exercise prescription. Provide reps, distance(+unit), calories, time, or load as appropriate.",
  })

/** Score (how the user is scored for a block) — optional+nullable for non-critical fields */
const Score = z
  .object({
    type: z
      .enum(["reps", "rounds", "time", "load", "calories", "distance"])
      .meta({ description: "Primary scoring domain for the block" }),
    tie_break: nullableString.meta({ description: "Tie-break rule; null/omit if not applicable" }),
    target: nullableNumber.meta({ description: "Target number (e.g., desired rounds/reps/time); null/omit if none" }),
    cap: isoDuration.nullable().optional().meta({ description: "Time cap (ISO-8601); null/omit if no cap" }),
  })
  .strict()
  .meta({
    title: "Score",
    description: "Scoring metadata for a block (domain, optional tie-break/target/cap).",
  })

/** Base for any block — score/notes optional+nullable */
const BlockBase = z
  .object({
    title: z.string().meta({ description: "Human-friendly label for this block" }),
    type: z.string().meta({ description: "Discriminator selecting the block kind" }),
    notes: nullableString.meta({ description: "Notes for this block; null/omit if not applicable" }),
    score: Score.nullable().optional().meta({ description: "Scoring; include when scored, null/omit otherwise" }),
  })
  .strict()
  .meta({
    title: "BlockBase",
    description: "Fields common to all workout blocks",
  })

/** AMRAP: as many rounds/reps as possible in a fixed duration */
const Amrap = BlockBase.extend({
  type: z.literal("amrap"),
  duration: isoDuration.meta({ description: "Total AMRAP duration" }),
  repeat: positiveInt.default(1).meta({ description: "Repeat count (usually 1)" }),
  sequence: z.array(Movement).min(1).meta({ description: "Ordered list of movements per round" }),
}).meta({
  title: "AMRAP",
  description: "Complete as many rounds/reps as possible within the duration.",
})

/** For Time: complete prescribed work as fast as possible */
const ForTime = BlockBase.extend({
  type: z.literal("for_time"),
  rounds: positiveInt.meta({ description: "Number of rounds of the sequence (use 1 for chipper-style)" }),
  time_cap: isoDuration.nullable().optional().meta({ description: "Time cap; null/omit if no cap" }),
  sequence: z.array(Movement).min(1).meta({ description: "Ordered list of movements to complete" }),
}).meta({
  title: "ForTime",
  description: "Complete prescribed work as fast as possible. Time cap is optional.",
})

/** EMOM: every minute on the minute */
const Emom = BlockBase.extend({
  type: z.literal("emom"),
  minutes: positiveInt.meta({ description: "Total EMOM length in minutes" }),
  slots: z
    .array(
      z
        .object({
          minute_mod: positiveInt.meta({
            description:
              "1-based minute selector (e.g., 1 for minute 1, 2 for minute 2, or modular pattern like every 3rd minute)",
          }),
          work: z.array(Movement).min(1).meta({ description: "Movements to do on those minutes" }),
        })
        .strict()
    )
    .min(1)
    .meta({
      description:
        "Map minute patterns to work. Example: [{ minute_mod:1, work:[...] }, { minute_mod:2, work:[...] }]",
    }),
}).meta({
  title: "EMOM",
  description: "Perform prescribed work at specified minutes within a total duration.",
})

/** Sets: classic strength sets × reps (optionally with load/RPE/rest) */
const Sets = BlockBase.extend({
  type: z.literal("sets"),
  exercise: z.string().meta({ description: "Primary exercise for the set scheme" }),
  scheme: z
    .array(
      z
        .object({
          sets: positiveInt.meta({ description: "Number of sets in this line item" }),
          reps: positiveInt.meta({ description: "Reps per set in this line item" }),
          load: Load.optional().nullable().meta({ description: "Load prescription per line item; null/omit if none" }),
          rpe: z.number().min(1).max(10).optional().nullable().meta({ description: "RPE (1–10); null/omit if none" }),
          rest: isoDuration.optional().nullable().meta({ description: "Rest between sets (ISO-8601); null/omit if none" }),
        })
        .strict()
    )
    .min(1)
    .meta({ description: "One or more set/reps prescriptions" }),
}).meta({
  title: "Sets",
  description: "Strength block using sets × reps, optionally with load/RPE/rest.",
})

/** Superset: alternate two movements for N sets (A1/A2), optional rest between sets */
const Superset = BlockBase.extend({
  type: z.literal("superset"),
  sets: positiveInt.meta({ description: "Number of alternating sets (A1/A2)" }),
  rest_between_sets: isoDuration.optional().nullable().meta({ description: "Optional rest between sets (ISO-8601)" }),
  pair: z
    .array(Movement)
    .length(2)
    .meta({ description: "Exactly two movements performed as A1 and A2, alternated" }),
}).meta({
  title: "Superset",
  description: "Two movements alternated (A1/A2) for a set count, with optional rest.",
})

/** Union of blocks (discriminated by 'type') */
export const Block = z
  .discriminatedUnion("type", [Amrap, ForTime, Emom, Sets, Superset])
  .meta({ title: "Block", description: "One workout part: amrap | for_time | emom | sets | superset" })

/** Top-level workout — optional+nullable for non-critical fields */
export const Workout = z
  .object({
    id: z.string().meta({ description: "Stable identifier for this workout" }),
    title: z.string().meta({ description: "Display title (e.g., 'Cindy', 'Tuesday Metcon')" }),
    level: z
      .enum(["beginner", "intermediate", "advanced", "rx"])
      .nullable()
      .optional()
      .meta({ description: "Suggested difficulty level; null/omit if unspecified" }),
    tags: z.array(z.string()).nullable().optional().meta({ description: "Tags for search/filter; null/omit if none" }),
    notes: nullableString.meta({ description: "Coach notes; null/omit if none" }),
    blocks: z.array(Block).min(1).meta({ description: "One or more blocks comprising the workout" }),
    warmup: z.array(z.string()).nullable().optional().meta({ description: "Warm-up suggestions; null/omit if none" }),
    cooldown: z.array(z.string()).nullable().optional().meta({ description: "Cool-down suggestions; null/omit if none" }),
  })
  .strict()
  .meta({
    title: "Workout",
    description: "A complete workout composed of one or more blocks.",
  })

export type WorkoutT = z.infer<typeof Workout>