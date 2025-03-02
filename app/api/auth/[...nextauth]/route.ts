import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// authOptionsを使用してNextAuthハンドラーを作成
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };