import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'test@test.com';
    const password = 'admin123';
    
    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);
    
    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: 'Admin User',
      },
    });

    console.log('Admin user created successfully:', user);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(); 