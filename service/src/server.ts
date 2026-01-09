import { VoyagerApi } from './controllers';

console.log('Server is running');

Bun.serve({
  fetch: VoyagerApi,
  port: 52050
});

await import('./worker');
