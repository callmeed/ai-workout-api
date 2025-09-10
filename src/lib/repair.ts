// Convert "3:00", "03:00", "20s", "3m", "00:20" to ISO-8601 like PT3M, PT20S
export function coerceIsoDuration(v: any): any {
  if (typeof v !== 'string') return v;
  const s = v.trim().toLowerCase();

  // already ISO-8601-ish
  if (s.startsWith('pt')) return v;

  // "MM:SS"
  const mmss = /^(\d{1,2}):([0-5]?\d)$/.exec(s);
  if (mmss) {
    const m = parseInt(mmss[1], 10);
    const sec = parseInt(mmss[2], 10);
    if (m > 0 && sec > 0) return `PT${m}M${sec}S`;
    if (m > 0) return `PT${m}M`;
    return `PT${sec}S`;
  }

  // "3m", "20s", "1h"
  const unit = /^(\d+)\s*([hms])$/.exec(s);
  if (unit) {
    const n = parseInt(unit[1], 10);
    const u = unit[2];
    if (u === 'h') return `PT${n}H`;
    if (u === 'm') return `PT${n}M`;
    if (u === 's') return `PT${n}S`;
  }

  // plain integer like "12" -> assume minutes for caps/intervals
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n > 0) return `PT${n}M`;
  }

  return v;
}

export function repairWorkout(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj.blocks)) {
    obj.blocks = obj.blocks.map((b: any) => {
      if (!b || typeof b !== 'object') return b;

      // common fields
      if (typeof b.time_cap === 'string') b.time_cap = coerceIsoDuration(b.time_cap);
      if (b.score && typeof b.score.cap === 'string') {
        b.score.cap = coerceIsoDuration(b.score.cap);
      }

      if (b.type === 'amrap' && typeof b.duration === 'string') {
        b.duration = coerceIsoDuration(b.duration);
      }

      if (b.type === 'emom' && Array.isArray(b.slots)) {
        b.slots = b.slots.map((s: any) => {
          if (s && typeof s.minute_mod === 'number' && s.minute_mod < 1) s.minute_mod = 1;
          if (Array.isArray(s?.work)) {
            s.work = s.work.map((m: any) => {
              if (m && typeof m.time === 'string') m.time = coerceIsoDuration(m.time);
              return m;
            });
          }
          return s;
        });
      }

      if (Array.isArray(b.sequence)) {
        b.sequence = b.sequence.map((m: any) => {
          if (m && typeof m.time === 'string') m.time = coerceIsoDuration(m.time);
          return m;
        });
      }

      return b;
    });
  }

  return obj;
}