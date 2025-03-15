'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function IntegrationsPage() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [usageData, setUsageData] = useState({
    tokenCount: 0,
    apiCalls: 0
  });
  const { toast } = useToast();

  // 統合情報を取得
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/integrations');
        
        if (!response.ok) {
          throw new Error('統合情報の取得に失敗しました');
        }
        
        const data = await response.json();
        setIsConnected(data.anthropic?.isConnected || false);
        setApiEndpoint(data.anthropic?.apiEndpoint || 'https://api.anthropic.com/v1');
        setUsageData({
          tokenCount: data.usage?.tokenCount || 0,
          apiCalls: data.usage?.apiCalls || 0
        });
      } catch (error) {
        console.error('統合情報取得エラー:', error);
        toast({
          title: 'エラー',
          description: '統合情報の取得に失敗しました',
          variant: 'destructive',
        });
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchIntegrations();
  }, [toast]);

  // 接続テスト
  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
      });
      
      const data = await response.json();
      setIsConnected(data.success);
      
      toast({
        title: data.success ? '接続成功' : '接続失敗',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('接続テストエラー:', error);
      setIsConnected(false);
      toast({
        title: '接続テスト失敗',
        description: '接続テスト中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
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
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : isConnected === null ? (
              <Badge className="bg-gray-100 text-gray-800">
                未確認
              </Badge>
            ) : isConnected ? (
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
            {isLoading ? (
              <Skeleton className="h-10 w-full mt-1" />
            ) : (
              <>
                <Input
                  type="password"
                  value="••••••••••••••••"
                  disabled
                  className="mt-1 font-mono"
                />
                <p className="mt-1 text-sm text-gray-500">
                  APIキーは環境変数で管理されています
                </p>
              </>
            )}
          </div>

          <div>
            <Label>API エンドポイント</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full mt-1" />
            ) : (
              <Input
                value={apiEndpoint}
                disabled
                className="mt-1"
              />
            )}
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleTest} 
              disabled={isLoading || isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  接続テスト中...
                </>
              ) : (
                '接続テスト'
              )}
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
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className="mt-1 text-2xl font-semibold">{usageData.tokenCount.toLocaleString()} トークン</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">APIコール数</p>
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className="mt-1 text-2xl font-semibold">{usageData.apiCalls.toLocaleString()} 回</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
