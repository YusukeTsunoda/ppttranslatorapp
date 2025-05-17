'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Download, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BatchFileUpload } from '../components/BatchFileUpload';
import { Badge } from '@/components/ui/badge';

// バッチジョブの型定義
interface BatchJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  options: {
    sourceLang: string;
    targetLang: string;
    model: string;
  };
}

// 利用可能なモデルのリスト
const availableModels = [
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    description: '高速で経済的な翻訳向け',
    premium: false,
  },
  {
    value: 'claude-3-sonnet-20241022',
    label: 'Claude 3 Sonnet',
    description: '高品質な翻訳向け',
    premium: true,
  },
];

// 利用可能な言語のリスト
const availableLanguages = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: '英語' },
  { value: 'zh', label: '中国語' },
  { value: 'ko', label: '韓国語' },
  { value: 'fr', label: 'フランス語' },
  { value: 'de', label: 'ドイツ語' },
  { value: 'es', label: 'スペイン語' },
  { value: 'it', label: 'イタリア語' },
  { value: 'ru', label: 'ロシア語' },
  { value: 'pt', label: 'ポルトガル語' },
];

export default function BatchTranslatePage() {
  const [activeJobs, setActiveJobs] = useState<BatchJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<BatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceLang, setSourceLang] = useState('ja');
  const [targetLang, setTargetLang] = useState('en');
  const [selectedModel, setSelectedModel] = useState(availableModels[0].value);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // セッション情報から権限を確認
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // ユーザーのプレミアムステータスを確認（実際の実装に合わせて調整）
      setIsPremium(session.user.role === 'ADMIN' || session.user.role === 'PREMIUM');
      fetchCredits();
    }
  }, [status, session]);

  // クレジット残高を取得
  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/user/credits');
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits);
      }
    } catch (error) {
      console.error('クレジット取得エラー:', error);
    }
  };

  // バッチジョブ一覧を取得
  const fetchBatchJobs = async () => {
    try {
      const response = await fetch('/api/batch-upload');
      if (response.ok) {
        const data = await response.json();
        
        // アクティブなジョブと完了したジョブを分ける
        const active = data.jobs.filter((job: BatchJob) => 
          job.status === 'PENDING' || job.status === 'PROCESSING'
        );
        
        const completed = data.jobs.filter((job: BatchJob) => 
          job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED'
        );
        
        setActiveJobs(active);
        setCompletedJobs(completed);
      }
    } catch (error) {
      console.error('バッチジョブ取得エラー:', error);
      toast({
        title: "エラー",
        description: "バッチジョブの取得に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ポーリングの開始
  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(() => {
      if (activeJobs.length > 0) {
        fetchBatchJobs();
      }
    }, 5000); // 5秒ごとに更新
    
    setPollingInterval(interval);
    return interval;
  };

  // 初期データ取得とポーリング設定
  useEffect(() => {
    if (status === 'authenticated') {
      fetchBatchJobs();
      const interval = startPolling();
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [status]);

  // ファイルアップロード処理
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      // ファイルパスの配列を作成（実際のアップロード処理は省略）
      const filePaths = files.map(file => ({
        name: file.name,
        path: `/tmp/uploads/${file.name}`, // 仮のパス
      }));
      
      // バッチジョブを登録
      const response = await fetch('/api/batch-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: filePaths,
          options: {
            sourceLang,
            targetLang,
            model: selectedModel,
          },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "バッチジョブ登録完了",
          description: `${files.length}ファイルの処理を開始しました`,
        });
        
        // ジョブ一覧を更新
        fetchBatchJobs();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'バッチジョブの登録に失敗しました');
      }
    } catch (error) {
      console.error('バッチアップロードエラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : 'バッチジョブの登録に失敗しました',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ジョブのキャンセル処理
  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch-upload/${jobId}/cancel`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "ジョブをキャンセルしました",
        });
        fetchBatchJobs();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'ジョブのキャンセルに失敗しました');
      }
    } catch (error) {
      console.error('ジョブキャンセルエラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : 'ジョブのキャンセルに失敗しました',
        variant: "destructive"
      });
    }
  };

  // ジョブの再試行処理
  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch-upload/${jobId}/retry`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "ジョブを再試行します",
        });
        fetchBatchJobs();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'ジョブの再試行に失敗しました');
      }
    } catch (error) {
      console.error('ジョブ再試行エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : 'ジョブの再試行に失敗しました',
        variant: "destructive"
      });
    }
  };

  // 一括ダウンロード処理
  const handleDownloadAll = async (jobId: string) => {
    try {
      // ダウンロードリンクを取得
      const response = await fetch(`/api/batch-upload/${jobId}/download`);
      
      if (response.ok) {
        const data = await response.json();
        
        // ダウンロードリンクを開く
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'ダウンロードに失敗しました');
      }
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : 'ダウンロードに失敗しました',
        variant: "destructive"
      });
    }
  };

  // 進捗率を計算
  const calculateProgress = (job: BatchJob) => {
    if (job.totalFiles === 0) return 0;
    return Math.round((job.processedFiles / job.totalFiles) * 100);
  };

  // ステータスバッジを表示
  const renderStatusBadge = (status: BatchJob['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100"><Clock className="h-3 w-3 mr-1" /> 待機中</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-blue-100"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 処理中</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-100"><CheckCircle className="h-3 w-3 mr-1" /> 完了</Badge>;
      case 'FAILED':
        return <Badge variant="outline" className="bg-red-100"><XCircle className="h-3 w-3 mr-1" /> 失敗</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-gray-100">キャンセル</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 日時フォーマット
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  // 経過時間を計算
  const calculateElapsedTime = (job: BatchJob) => {
    const startTime = job.createdAt ? new Date(job.createdAt).getTime() : 0;
    const endTime = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    
    const elapsedMs = endTime - startTime;
    const minutes = Math.floor(elapsedMs / (1000 * 60));
    const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
    
    return `${minutes}分${seconds}秒`;
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">バッチ翻訳</h1>
        <div className="text-sm text-gray-500">
          {userCredits !== null && (
            <span>残りクレジット: {userCredits}</span>
          )}
        </div>
      </div>

      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">新規バッチ</TabsTrigger>
          <TabsTrigger value="active">処理中 ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">完了済み ({completedJobs.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">バッチ翻訳設定</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="source-lang">翻訳元言語</Label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger id="source-lang">
                    <SelectValue placeholder="翻訳元言語を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="target-lang">翻訳先言語</Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger id="target-lang">
                    <SelectValue placeholder="翻訳先言語を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="model-select">翻訳モデル</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="モデルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem 
                        key={model.value} 
                        value={model.value}
                        disabled={model.premium && !isPremium}
                      >
                        {model.label}
                        {model.premium && !isPremium && ' (プレミアム限定)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <BatchFileUpload 
              onUploadComplete={handleFileUpload}
              maxFiles={50}
              maxFileSize={20}
            />
          </Card>
        </TabsContent>
        
        <TabsContent value="active">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">処理中のジョブ</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchBatchJobs}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                処理中のジョブはありません
              </div>
            ) : (
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <Card key={job.id} className="p-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="font-medium">ジョブID: {job.id.substring(0, 8)}...</span>
                          <span className="ml-2">{renderStatusBadge(job.status)}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCancelJob(job.id)}
                          disabled={job.status === 'COMPLETED' || job.status === 'FAILED'}
                        >
                          キャンセル
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>作成日時: {formatDate(job.createdAt)}</div>
                        <div>経過時間: {calculateElapsedTime(job)}</div>
                        <div>ファイル数: {job.totalFiles}</div>
                        <div>処理済み: {job.processedFiles} / {job.totalFiles}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>進捗状況</span>
                          <span>{calculateProgress(job)}%</span>
                        </div>
                        <Progress value={calculateProgress(job)} className="h-2" />
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        翻訳設定: {job.options.sourceLang} → {job.options.targetLang} ({job.options.model})
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="completed">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">完了済みジョブ</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchBatchJobs}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : completedJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                完了済みのジョブはありません
              </div>
            ) : (
              <div className="space-y-4">
                {completedJobs.map((job) => (
                  <Card key={job.id} className="p-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="font-medium">ジョブID: {job.id.substring(0, 8)}...</span>
                          <span className="ml-2">{renderStatusBadge(job.status)}</span>
                        </div>
                        <div className="space-x-2">
                          {job.status === 'FAILED' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRetryJob(job.id)}
                            >
                              再試行
                            </Button>
                          )}
                          
                          {job.status === 'COMPLETED' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadAll(job.id)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              ダウンロード
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>作成日時: {formatDate(job.createdAt)}</div>
                        <div>完了日時: {formatDate(job.completedAt)}</div>
                        <div>ファイル数: {job.totalFiles}</div>
                        <div>処理済み: {job.processedFiles} / {job.totalFiles}</div>
                        {job.failedFiles > 0 && (
                          <div className="text-red-500">失敗: {job.failedFiles}</div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        翻訳設定: {job.options.sourceLang} → {job.options.targetLang} ({job.options.model})
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        処理時間: {calculateElapsedTime(job)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
