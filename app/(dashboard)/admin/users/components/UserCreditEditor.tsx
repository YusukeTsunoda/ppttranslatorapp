'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';

interface User {
  id: string;
  name: string | null;
  email: string;
  credits: number;
}

interface UserCreditEditorProps {
  user: User;
  onUpdate: (userId: string, newCredits: number) => void;
}

export default function UserCreditEditor({ user, onUpdate }: UserCreditEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [credits, setCredits] = useState(user.credits.toString());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    // 入力値のバリデーション
    const creditsValue = parseInt(credits, 10);
    if (isNaN(creditsValue) || creditsValue < 0) {
      toast({
        title: '入力エラー',
        description: 'クレジットは0以上の整数を入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/users/credits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          credits: creditsValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'クレジットの更新に失敗しました');
      }

      const data = await response.json();
      
      toast({
        title: '更新完了',
        description: `${user.name || user.email}のクレジットを${creditsValue}に更新しました`,
      });
      
      // 親コンポーネントに更新を通知
      onUpdate(user.id, creditsValue);
      
      // ダイアログを閉じる
      setIsOpen(false);
    } catch (error) {
      console.error('クレジット更新エラー:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'クレジットの更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          編集
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>クレジット編集</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">ユーザー: {user.name || user.email}</p>
            <p className="text-sm text-muted-foreground">現在のクレジット: {user.credits}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="credits" className="text-sm font-medium">
              新しいクレジット値
            </label>
            <Input
              id="credits"
              type="number"
              min="0"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="クレジット数を入力"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '更新中...' : '更新する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
