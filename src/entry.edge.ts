import { app } from './app'

// Export a fetch handler — this is what edge runtimes expect.
export default {
  fetch: app.fetch,
}