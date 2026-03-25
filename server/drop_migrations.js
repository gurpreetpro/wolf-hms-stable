const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to drop problematic migration sequences...');
  try {
    await prisma.$queryRawUnsafe(`DROP SEQUENCE IF EXISTS "_migrations_id_seq" CASCADE;`);
    console.log('Dropped _migrations_id_seq');
  } catch(e) { console.log('Err1:', e.message); }
  
  try {
    await prisma.$queryRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;`);
    console.log('Dropped _prisma_migrations');
  } catch(e) { console.log('Err2:', e.message); }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
