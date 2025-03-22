import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

type TranslationType = {
  language: string;
  text: string;
};

type TextItemType = {
  id: string;
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  translations: TranslationType[];
};

type TranslationProps = {
  textItem: TextItemType;
  onUpdate: (updatedTextItem: TextItemType) => void;
  onCancel: () => void;
  targetLanguages: string[];
};

// 言語コードと表示名のマッピング
const languageNames: Record<string, string> = {
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

export const Translation: React.FC<TranslationProps> = ({ textItem, onUpdate, onCancel, targetLanguages }) => {
  // 各言語の翻訳テキストの状態
  const [translationValues, setTranslationValues] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  // 初期値のセット
  useEffect(() => {
    const initialValues: Record<string, string> = {};

    targetLanguages.forEach((lang) => {
      // 言語に対応する翻訳を検索
      const translation = textItem.translations.find((t) => t.language === lang);
      // 存在すれば値をセット、なければ空文字
      initialValues[lang] = translation ? translation.text : '';
    });

    setTranslationValues(initialValues);
  }, [textItem, targetLanguages]);

  // 翻訳テキストの変更ハンドラ
  const handleTranslationChange = (language: string, value: string) => {
    setTranslationValues((prev) => ({
      ...prev,
      [language]: value,
    }));
  };

  // 保存ボタンのハンドラ
  const handleSave = () => {
    // 更新された翻訳リストを作成
    const updatedTranslations = targetLanguages.map((lang) => ({
      language: lang,
      text: translationValues[lang] || '',
    }));

    // 更新されたテキストアイテムを作成
    const updatedTextItem = {
      ...textItem,
      translations: updatedTranslations,
    };

    // 親コンポーネントに更新を通知
    onUpdate(updatedTextItem);
  };

  // 自動翻訳のハンドラ
  const handleAutoTranslate = async () => {
    setIsTranslating(true);

    try {
      // 翻訳APIを呼び出す
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textItem.text,
          sourceLang: 'ja', // 元言語（仮定）
          targetLangs: targetLanguages,
        }),
      });

      if (!response.ok) {
        throw new Error(`翻訳APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 翻訳結果を状態に反映
      setTranslationValues(data.translations);

      toast({
        title: '自動翻訳完了',
        description: '翻訳が完了しました',
      });
    } catch (error) {
      console.error('翻訳エラー:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '翻訳処理中にエラーが発生しました',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {/* 元のテキスト */}
      <div>
        <h3 className="font-medium mb-2">元のテキスト:</h3>
        <p>{textItem.text}</p>
      </div>

      {/* 翻訳フォーム */}
      <div className="space-y-3">
        <h3 className="font-medium">翻訳:</h3>

        {targetLanguages.map((lang) => (
          <div key={lang} className="space-y-1">
            <Label htmlFor={`translation-${lang}`}>{languageNames[lang] || lang}</Label>
            <Input
              id={`translation-${lang}`}
              value={translationValues[lang] || ''}
              onChange={(e) => handleTranslationChange(lang, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex space-x-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="outline" onClick={handleAutoTranslate} disabled={isTranslating}>
          {isTranslating ? '翻訳中...' : '自動翻訳'}
        </Button>
        <Button onClick={handleSave}>保存</Button>
      </div>
    </div>
  );
};
