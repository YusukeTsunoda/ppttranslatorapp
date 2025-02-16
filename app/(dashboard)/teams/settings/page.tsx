'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/teams/members');
      if (!response.ok) {
        throw new Error('メンバー一覧の取得に失敗しました');
      }
      const data = await response.json();
      setMembers(data.members);
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'メンバー一覧の取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    if (!inviteEmail.trim()) {
      toast({
        title: 'エラー',
        description: 'メールアドレスを入力してください',
        variant: 'destructive',
      });
      setInviting(false);
      return;
    }

    try {
      const response = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) {
        throw new Error('招待の送信に失敗しました');
      }

      toast({
        title: '成功',
        description: '招待を送信しました',
      });

      setInviteEmail('');
      await fetchMembers();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '招待の送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('メンバーの削除に失敗しました');
      }

      toast({
        title: '成功',
        description: 'メンバーを削除しました',
      });

      await fetchMembers();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'メンバーの削除に失敗しました',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-6">チーム設定</h1>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-medium mb-4">メンバーを招待</h2>
            <form onSubmit={handleInvite} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">メールアドレス</Label>
                <Input
                  id="invite-email"
                  data-testid="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="メールアドレスを入力"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={inviting}
                data-testid="invite-member"
              >
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    招待中...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    招待する
                  </>
                )}
              </Button>
            </form>
          </div>

          <div>
            <h2 className="text-xl font-medium mb-4">メンバー一覧</h2>
            <div className="space-y-4" data-testid="member-list">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    data-testid={`remove-member-${member.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  メンバーはまだいません
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 