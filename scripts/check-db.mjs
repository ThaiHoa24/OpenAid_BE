import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';

const root = fileURLToPath(new URL('../', import.meta.url));
const prisma = new PrismaClient();

try {
  const [connection] = await prisma.$queryRaw`
    SELECT current_database() AS database, current_schema() AS schema
  `;
  console.log(
    JSON.stringify(
      {
        connected: true,
        ...connection,
        prismaModels: Prisma.dmmf.datamodel.models.length,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();

  // migrate diff only compares schemas; it does not apply migrations or SQL.
  const comparison = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../node_modules/prisma/build/index.js', import.meta.url),
      ),
      'migrate',
      'diff',
      '--from-schema-datasource',
      'prisma/schema.prisma',
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--exit-code',
    ],
    { cwd: root, env: process.env, stdio: 'inherit' },
  );

  if (comparison.error) throw comparison.error;
  process.exitCode = comparison.status ?? 1;
  if (process.exitCode === 0) {
    console.log(
      'Database matches Prisma. No migrations or data changes were applied.',
    );
  }
} catch (error) {
  console.error('Database check failed:', error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
