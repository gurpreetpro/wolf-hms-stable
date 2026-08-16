require('dotenv').config();
const { ensureAdminUsers } = require('./utils/ensureAdmins');

async function main() {
    console.log('Running manual database seeding...');
    await ensureAdminUsers();
    console.log('Seeding completed!');
    process.exit(0);
}

main().catch(err => {
    console.error('Error seeding:', err);
    process.exit(1);
});
