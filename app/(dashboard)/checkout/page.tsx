'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!plan) {
      toast({
        title: 'エラー',
        description: 'プランが選択されていません',
        variant: 'destructive',
      });
    }
  }, [plan, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          cardNumber,
          expiry,
          cvc,
        }),
      });

      if (!response.ok) {
        throw new Error('支払い処理に失敗しました');
      }

      toast({
        title: '支払い完了',
        description: 'プランのアップグレードが完了しました',
      });

      // 支払い完了後、ダッシュボードにリダイレクト
      window.location.href = '/translate';
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '支払い処理に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-6">お支払い情報</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="card-number">カード番号</Label>
            <Input
              id="card-number"
              data-testid="card-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry">有効期限</Label>
              <Input
                id="expiry"
                data-testid="expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                required
              />
            </div>
            <div>
              <Label htmlFor="cvc">セキュリティコード</Label>
              <Input
                id="cvc"
                data-testid="cvc"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                placeholder="123"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="submit-payment"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              '支払いを完了する'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
} 