'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatBytes } from '@/lib/utils';
import { Language } from '@prisma/client';
import { ChevronLeft, Download, RefreshCw, Clock, FileText, CreditCard } from 'lucide-react';

interface HistoryDetailProps {
  historyId: string;
  historyData: any;
  onBack: () => void;
}

const languageNames: Record<Language, string> = {
  ja: '日本語',
  en: '英語',
  zh: '中国語',
  ko: '韓国語',
  fr: 'フランス語',
  de: 'ドイツ語',
  es: 'スペイン語',
  it: 'イタリア語',
  ru: 'ロシア語',
  pt: 'ポルトガル語',
};

export function HistoryDetail({ historyId, historyData, onBack }: HistoryDetailProps) {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  
  if (!historyData || !historyData.historyItem) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p>詳細情報を読み込めませんでした。</p>
              <Button onClick={onBack} className="mt-4">
                履歴一覧に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { historyItem, fileDetails, slides } = historyData;
  
  const handleRetranslate = async () => {
    // 再翻訳処理の実装
    // 例: 翻訳APIを呼び出す
    router.push(`/translate?file=${historyItem.id}`);
  };

  const handleDownload = async () => {
    // ダウンロード処理の実装
    window.open(`/api/download/${fileDetails?.id}`, '_blank');
  };

  return (
    <div data-testid="history-detail" className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div className="flex space-x-2">
          {fileDetails && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              ダウンロード
            </Button>
          )}
          <Button onClick={handleRetranslate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            再翻訳
          </Button>
        </div>
      </div>

      {/* サムネイル表示 */}
      {historyItem.thumbnailPath && (
        <div className="w-full flex justify-center mb-4">
          <Image src={historyItem.thumbnailPath} alt="サムネイル" width={180} height={120} className="rounded shadow" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>翻訳情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">ファイル名</dt>
                <dd data-testid="file-name">{historyItem.fileName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">ステータス</dt>
                <dd>
                  <Badge variant={
                    historyItem.status === 'COMPLETED' ? 'success' :
                    historyItem.status === 'FAILED' ? 'destructive' :
                    'default'
                  }>
                    {historyItem.status === 'COMPLETED' ? '完了' :
                     historyItem.status === 'FAILED' ? 'エラー' :
                     historyItem.status === 'PROCESSING' ? '処理中' :
                     historyItem.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">翻訳日時</dt>
                <dd>{formatDate(new Date(historyItem.createdAt))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">翻訳モデル</dt>
                <dd>{historyItem.model}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">翻訳言語</dt>
                <dd data-testid="translation-languages">{languageNames[historyItem.sourceLang as Language]} → {languageNames[historyItem.targetLang as Language]}</dd>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <dt className="flex items-center font-medium text-gray-500">
                  <FileText className="mr-2 h-4 w-4 text-orange-500" />
                  ページ数
                </dt>
                <dd>{historyItem.pageCount}ページ</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="flex items-center font-medium text-gray-500">
                  <Clock className="mr-2 h-4 w-4 text-orange-500" />
                  処理時間
                </dt>
                <dd>{historyItem.processingTime ? `${(historyItem.processingTime / 1000).toFixed(1)}秒` : '不明'}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="flex items-center font-medium text-gray-500">
                  <CreditCard className="mr-2 h-4 w-4 text-orange-500" />
                  消費クレジット
                </dt>
                <dd>{historyItem.creditsUsed}</dd>
              </div>
              {historyItem.fileSize > 0 && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">ファイルサイズ</dt>
                  <dd data-testid="file-size">{formatBytes(historyItem.fileSize)}</dd>
                </div>
              )}
              {historyItem.tags && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">タグ</dt>
                  <dd className="flex flex-wrap justify-end gap-1">
                    {Array.isArray(historyItem.tags) && historyItem.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </dd>
                </div>
              )}
              {historyItem.metadata && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">メタデータ</dt>
                  <dd className="text-xs text-right max-w-xs break-all">{JSON.stringify(historyItem.metadata)}</dd>
                </div>
              )}
              {historyItem.errorMessage && (
                <div className="flex justify-between">
                  <dt className="font-medium text-red-500">エラーメッセージ</dt>
                  <dd className="text-xs text-red-500 text-right max-w-xs break-all">{historyItem.errorMessage}</dd>
                </div>
              )}
              {historyItem.translatedFileKey && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">翻訳済みファイルキー</dt>
                  <dd className="text-xs text-right max-w-xs break-all">{historyItem.translatedFileKey}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {slides && slides.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>スライドプレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="0" onValueChange={(value) => setActiveSlide(parseInt(value))}>
                <div className="relative aspect-video mb-4 border rounded-md overflow-hidden">
                  {slides[activeSlide]?.imagePath ? (
                    <Image
                      src={slides[activeSlide].imagePath}
                      alt={`スライド ${activeSlide + 1}`}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <p className="text-gray-500">プレビューがありません</p>
                    </div>
                  )}
                </div>
                <TabsList className="grid grid-flow-col auto-cols-fr overflow-x-auto">
                  {slides.map((_: any, index: number) => (
                    <TabsTrigger key={index} value={index.toString()}>
                      {index + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {slides.map((slide: any, index: number) => (
                  <TabsContent key={index} value={index.toString()} className="mt-4">
                    <h4 className="font-medium mb-2">スライド {index + 1} のテキスト</h4>
                    {slide.texts && slide.texts.length > 0 ? (
                      <div className="space-y-4">
                        {slide.texts.map((text: any, textIndex: number) => (
                          <div key={textIndex} className="border rounded-md p-3 space-y-2">
                            <div>
                              <h5 className="text-sm font-medium text-gray-500">元のテキスト:</h5>
                              <p className="p-2 bg-gray-50 rounded">{text.originalText}</p>
                            </div>
                            {text.translations && text.translations.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-500">翻訳後:</h5>
                                <p className="p-2 bg-blue-50 rounded">{text.translations[0].translatedText}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">テキストがありません</p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>スライドプレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] bg-gray-100 rounded-md">
                <p className="text-gray-500">プレビューがありません</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
