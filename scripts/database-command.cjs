const { spawnSync } = require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd(), true);
const command = process.argv[2];
try {
  const url = new URL(process.env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname.length < 2 || url.host + url.pathname !== process.env.ERP_DATABASE_TARGET) throw Error('ERP database target does not match DATABASE_URL.');
  if (!['development','test','production'].includes(process.env.ERP_ENVIRONMENT)) throw Error('Invalid ERP_ENVIRONMENT.');
  if (command === 'check') { console.log('ERP configuration passed (offline).'); process.exit(0); }
  if (command === 'push') throw Error('db:push is disabled. Use reviewed migrations.');
  if (command === 'migrate-dev' && process.env.ERP_ENVIRONMENT === 'production') throw Error('Development migrations are blocked in production.');
  const commands = {
    'migrate-dev': [require('node:path').join(require('node:path').dirname(require.resolve('prisma/package.json')), 'build', 'index.js'), 'migrate', 'dev'],
    'migrate-deploy': [require('node:path').join(require('node:path').dirname(require.resolve('prisma/package.json')), 'build', 'index.js'), 'migrate', 'deploy'],
    seed: [require.resolve('tsx/cli'), 'prisma/seed.ts'],
  };
  if (!commands[command]) throw Error('Unknown database command.');
  const result = spawnSync(process.execPath, [...commands[command], ...process.argv.slice(3)], {stdio:'inherit',env:process.env});
  process.exit(result.status ?? 1);
} catch (error) { console.error(error instanceof TypeError ? 'Invalid ERP database configuration.' : error.message); process.exit(1); }
