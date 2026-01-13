import { VoyagerApi } from './controllers';

console.log('Server is running');

Bun.serve({
  fetch: VoyagerApi,
  port: 52060
});

await import('./worker');
