import { stripe } from '../payments/stripe';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/auth/password';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Delete existing data
  await prisma.user.deleteMany();

  // Create a test user
  const hashedPassword = await hashPassword('password123');
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/image.jpg',
      updatedAt: new Date(),
    },
  });

  console.log('Created user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
