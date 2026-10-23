import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'sify-workforce-platform',
  isDev: process.env.NODE_ENV !== 'production' || process.env.INNGEST_DEV === '1',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
