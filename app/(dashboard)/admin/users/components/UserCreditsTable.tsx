'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  credits: number;
  _count: {
    File: number;
    TranslationHistory: number;
  };
}

interface UserCreditsTableProps {
  initialUsers: User[];
}

export default function UserCreditsTable({ initialUsers }: UserCreditsTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setEditCredits(user.credits.toString());
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditCredits('');
  };

  const handleSaveCredits = async (userId: string) => {
    // 入力値のバリデーション
    const creditsValue = parseInt(editCredits, 10);
    if (isNaN(creditsValue) || creditsValue < 0) {
      toast({
        title: '入力エラー',
        description: 'クレジットは0以上の整数を入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch('/api/admin/users/credits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          credits: creditsValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'クレジットの更新に失敗しました');
      }

      // ユーザーリストを更新
      setUsers(users.map(user => 
        user.id === userId ? { ...user, credits: creditsValue } : user
      ));

      toast({
        title: '更新完了',
        description: 'クレジットが更新されました',
      });

      // 編集モードを終了
      setEditingUserId(null);
      setEditCredits('');
    } catch (error) {
      console.error('クレジット更新エラー:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'クレジットの更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>メールアドレス</TableHead>
          <TableHead>ロール</TableHead>
          <TableHead>登録日</TableHead>
          <TableHead>クレジット</TableHead>
          <TableHead>ファイル数</TableHead>
          <TableHead>翻訳数</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name || '未設定'}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role === 'ADMIN' ? '管理者' : 'ユーザー'}</TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleDateString('ja-JP')}</TableCell>
            <TableCell>
              {editingUserId === user.id ? (
                <Input
                  type="number"
                  min="0"
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-24"
                />
              ) : (
                user.credits
              )}
            </TableCell>
            <TableCell>{user._count.File}</TableCell>
            <TableCell>{user._count.TranslationHistory}</TableCell>
            <TableCell>
              {editingUserId === user.id ? (
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleSaveCredits(user.id)}
                    disabled={isUpdating}
                  >
                    保存
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    キャンセル
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEditClick(user)}
                >
                  編集
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
