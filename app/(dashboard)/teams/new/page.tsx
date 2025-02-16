'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NewTeamPage() {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!teamName.trim()) {
      toast({
        title: 'エラー',
        description: 'チーム名を入力してください',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: teamName }),
      });

      if (!response.ok) {
        throw new Error('チームの作成に失敗しました');
      }

      toast({
        title: '成功',
        description: 'チームを作成しました',
      });

      router.push('/teams/settings');
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'チームの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-6">新しいチームを作成</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="team-name">チーム名</Label>
            <Input
              id="team-name"
              data-testid="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="チーム名を入力"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="create-team"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              'チームを作成'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
} 