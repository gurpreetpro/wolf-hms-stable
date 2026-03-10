/**
 * Reset Admin Password for Testing
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

async function resetAdminPassword() {
    const username = 'admin_taneja';
    const newPassword = 'Admin@123';
    
    const hash = await bcrypt.hash(newPassword, 10);
    
    try {
        const user = await prisma.users.updateMany({
            where: { username },
            data: { password: hash }
        });
        
        if (user.count > 0) {
            console.log(`✅ Password reset for '${username}'`);
            console.log(`   New Password: ${newPassword}`);
            console.log(`   Hash: ${hash.substring(0, 20)}...`);
        } else {
            console.log(`⚠️ User '${username}' not found`);
            
            // List available admin users
            const admins = await prisma.users.findMany({
                where: { role: { in: ['admin', 'administrator', 'super_admin'] } },
                select: { id: true, username: true, role: true, name: true }
            });
            console.log('\n📋 Available Admin Users:');
            admins.forEach(a => console.log(`   - ${a.username} (${a.role})`));
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword();
