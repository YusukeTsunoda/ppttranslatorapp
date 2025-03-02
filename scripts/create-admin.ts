import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'test@test.com';
    const password = 'admin123';
    
    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);
    
    // ユーザーを作成
    // @ts-ignore - Prismaの型定義と実際のプロパティの間に不一致があるため
    const user = await prisma.users.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        updatedAt: new Date(),
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