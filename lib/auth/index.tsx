'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '@/lib/db/schema';

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({
  children,
  initialUser
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);

  // デバッグ用のログ出力
  useEffect(() => {
    console.log('UserProvider: ユーザー状態が更新されました', { user });
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
