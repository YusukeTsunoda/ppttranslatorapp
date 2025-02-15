import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  teamId: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // ユーザー情報取得などの処理をここに実装
    // 仮のユーザーデータを設定例:
    setUser({ id: '1', name: 'Test User', teamId: 'team-1' });
  }, []);

  return { user };
}
