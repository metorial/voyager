import { db } from './db';
import { getId } from './id';

// Note: when we add more backends we can use this logic to detect
// backend changes and enqueue re-indexing for all records

export let backend = await db.backend.upsert({
  where: { identifier: 'pg' },
  create: {
    ...getId('backend'),
    isDefault: true,
    identifier: 'pg',
    name: 'PostgreSQL',
    id: 'pg'
  },
  update: {}
});
