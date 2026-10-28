import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full system access',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user',
    },
  });

  console.log('Roles seeded:', { adminRole, userRole });

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@cinematch.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me_in_production';
  const adminName = 'System Administrator';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        roleId: adminRole.id,
        isActive: true,
      },
    });
    console.log('Admin user seeded:', { id: newAdmin.id, email: newAdmin.email });
  } else {
    console.log('Admin user already exists:', adminEmail);
  }

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
