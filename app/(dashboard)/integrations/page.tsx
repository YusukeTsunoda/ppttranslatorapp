'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function IntegrationsPage() {
  const [isConnected, setIsConnected] = useState(true); // デモ用
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/anthropic/test', {
        method: 'POST',
      });
      const data = await response.json();
      setIsConnected(data.success);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">API連携</h1>
        <p className="mt-1 text-sm text-gray-500">
          Anthropic APIの接続状態を確認・管理できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Anthropic API</span>
            {isConnected ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                接続済み
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-4 w-4" />
                未接続
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value="••••••••••••••••"
              disabled
              className="mt-1 font-mono"
            />
            <p className="mt-1 text-sm text-gray-500">
              APIキーは環境変数で管理されています
            </p>
          </div>

          <div>
            <Label>API エンドポイント</Label>
            <Input
              value={process.env.NEXT_PUBLIC_ANTHROPIC_API_URL || 'https://api.anthropic.com/v1'}
              disabled
              className="mt-1"
            />
          </div>

          <div className="pt-4">
            <Button onClick={handleTest} disabled={isLoading}>
              {isLoading ? '接続テスト中...' : '接続テスト'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">今月の使用量</p>
              <p className="mt-1 text-2xl font-semibold">1,234 トークン</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">APIコール数</p>
              <p className="mt-1 text-2xl font-semibold">89 回</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
