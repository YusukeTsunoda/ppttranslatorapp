import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  console.log('Starting signup process...');
  
  try {
    const body = await req.json();
    console.log('Request body received:', { ...body, password: '[REDACTED]' });
    
    const { email, password, inviteId } = body;

    // 入力値の検証
    if (!email || !password) {
      console.log('Validation failed: Missing required fields');
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      console.log('Validation failed: Password too short');
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    // データベース接続の確認
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    // 既存ユーザーの確認
    console.log('Checking for existing user with email:', email);
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('User already exists with email:', email);
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードのハッシュ化
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);
    console.log('Password hashed successfully');

    // ユーザーの作成
    console.log('Creating new user...');
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    }).catch((error) => {
      console.error('Error creating user:', error);
      throw error;
    });
    
    console.log('User created successfully:', { userId: user.id });

    let teamId = user.id;

    // 招待処理
    if (inviteId) {
      console.log('Processing invitation:', inviteId);
      const invite = await prisma.invitation.findUnique({
        where: { id: inviteId },
        include: { team: true }
      }).catch((error) => {
        console.error('Error finding invitation:', error);
        return null;
      });

      if (invite && invite.status === 'pending') {
        console.log('Adding user to team:', invite.teamId);
        await prisma.teamMember.create({
          data: {
            userId: user.id,
            teamId: invite.teamId,
            role: invite.role
          }
        }).catch((error) => {
          console.error('Error adding user to team:', error);
          throw error;
        });

        await prisma.invitation.update({
          where: { id: inviteId },
          data: { status: 'accepted' }
        }).catch((error) => {
          console.error('Error updating invitation:', error);
          throw error;
        });

        teamId = invite.teamId;
        console.log('User added to team successfully');
      }
    }

    // アクティビティログの記録
    await prisma.activityLog.create({
      data: {
        teamId,
        userId: user.id,
        action: 'sign_up',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        metadata: {
          email: user.email,
          inviteId: inviteId || null
        }
      }
    }).catch((error) => {
      console.error('Error creating activity log:', error);
      // アクティビティログの作成に失敗しても、ユーザー作成は成功とする
    });

    console.log('Signup process completed successfully');
    return NextResponse.json(
      { 
        success: true,
        userId: user.id,
        teamId
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in signup process:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error details:', {
        code: error.code,
        meta: error.meta,
        message: error.message
      });
      
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'アカウントの作成に失敗しました' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 