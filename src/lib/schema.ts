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

const nullableString = z.string().nullable()
const nullableNumber = z.number().nullable()

/** Load (weight prescription) */
export const Load = z
  .object({
    value: z.number().nonnegative().meta({ description: "Numeric load value (non-negative)" }),
    unit: z.enum(["lb", "kg"]).meta({ description: "Load unit: pounds or kilograms" }),
    percent_of: z
      .enum(["1RM", "BW"])
      .nullable()
      .meta({ description: "If present, value is interpreted as a percentage of 1RM or bodyweight; null otherwise" }),
  })
  .strict()
  .meta({
    title: "Load",
    description: "Weight prescription either as absolute load with unit or a percent of 1RM/BW",
  })

/** Movement (one exercise item) — required but nullable fields to satisfy strict mode */
export const Movement = z
  .object({
    name: z.string().meta({ description: "Exercise name (e.g., Pull-up, Row, Air Squat)" }),
    reps: positiveInt.nullable().meta({ description: "Repetitions for this movement; null if not applicable" }),
    distance: z.number().nonnegative().nullable().meta({ description: "Distance value; null if not applicable" }),
    distance_unit: z
      .enum(["m", "km", "mi"])
      .nullable()
      .meta({ description: "Unit for distance (meters, kilometers, miles); null if not applicable" }),
    calories: positiveInt.nullable().meta({ description: "Calories for erg work; null if not applicable" }),
    time: isoDuration.nullable().meta({ description: "Time budget (ISO-8601); null if not applicable" }),
    load: Load.nullable().meta({ description: "Load prescription; null if bodyweight / not applicable" }),
    tempo: nullableString.meta({ description: "Tempo notation, e.g., 30X0; null if not applicable" }),
    equipment: z.array(z.string()).nullable().meta({ description: "Equipment used; null if not applicable" }),
    notes: nullableString.meta({ description: "Coaching or scaling notes; null if not applicable" }),
    scaling: z.array(z.string()).nullable().meta({ description: "Alternative versions for scaling; null if none" }),
  })
  .strict()
  .meta({
    title: "Movement",
    description:
      "A single exercise prescription. Provide reps, distance(+unit), calories, time, or load as appropriate (unused fields are null).",
  })

/** Score (how the user is scored for a block) — all keys required; nullable where optional */
const Score = z
  .object({
    type: z
      .enum(["reps", "rounds", "time", "load", "calories", "distance"])
      .meta({ description: "Primary scoring domain for the block" }),
    tie_break: nullableString.meta({ description: "Tie-break rule; null if not applicable" }),
    target: nullableNumber.meta({ description: "Target number (e.g., desired rounds/reps/time); null if none" }),
    cap: isoDuration.nullable().meta({ description: "Time cap for the block (ISO-8601); null if no cap" }),
  })
  .strict()
  .meta({
    title: "Score",
    description: "Scoring metadata for a block (domain, tie-break/target/cap are null when not applicable).",
  })

/** Base for any block — score/notes now required but nullable */
const BlockBase = z
  .object({
    title: z.string().meta({ description: "Human-friendly label for this block" }),
    type: z.string().meta({ description: "Discriminator selecting the block kind" }),
    notes: nullableString.meta({ description: "Notes for this block; null if not applicable" }),
    score: Score.nullable().meta({ description: "Scoring; include when the block should be scored, null otherwise" }),
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
  time_cap: isoDuration.nullable().meta({ description: "Time cap for the workout; null if no cap" }),
  sequence: z.array(Movement).min(1).meta({ description: "Ordered list of movements to complete" }),
}).meta({
  title: "ForTime",
  description: "Complete prescribed work as fast as possible. Time cap is optional (null if not provided).",
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
          load: Load.nullable().meta({ description: "Load prescription per line item; null if not specified" }),
          rpe: z.number().min(1).max(10).nullable().meta({ description: "RPE (1–10); null if not specified" }),
          rest: isoDuration.nullable().meta({ description: "Rest between sets (ISO-8601); null if not specified" }),
        })
        .strict()
    )
    .min(1)
    .meta({ description: "One or more set/reps prescriptions" }),
}).meta({
  title: "Sets",
  description: "Strength block using sets × reps, optionally with load/RPE/rest (null when not applicable).",
})

/** Union of blocks (discriminated by 'type') */
export const Block = z
  .discriminatedUnion("type", [Amrap, ForTime, Emom, Sets])
  .meta({ title: "Block", description: "One workout part: amrap | for_time | emom | sets" })

/** Top-level workout (all formerly-optional fields now required but nullable/empty-capable) */
export const Workout = z
  .object({
    id: z.string().meta({ description: "Stable identifier for this workout" }),
    title: z.string().meta({ description: "Display title (e.g., 'Cindy', 'Tuesday Metcon')" }),
    level: z
      .enum(["beginner", "intermediate", "advanced", "rx"])
      .nullable()
      .meta({ description: "Suggested difficulty level; null if unspecified" }),
    tags: z.array(z.string()).nullable().meta({ description: "Tags for search/filter; null if none" }),
    notes: nullableString.meta({ description: "Coach notes; null if none" }),
    blocks: z.array(Block).min(1).meta({ description: "One or more blocks comprising the workout" }),
    warmup: z.array(z.string()).nullable().meta({ description: "Warm-up suggestions; null if none" }),
    cooldown: z.array(z.string()).nullable().meta({ description: "Cool-down suggestions; null if none" }),
  })
  .strict()
  .meta({
    title: "Workout",
    description: "A complete workout composed of one or more blocks.",
  })

export type WorkoutT = z.infer<typeof Workout>