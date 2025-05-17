// Node.jsランタイムを明示的に指定
// Anthropic APIの処理を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Session } from 'next-auth';
import { filePrisma, translationPrisma, userPrisma } from '@/lib/db/prisma';
import { Language, TranslationStatus } from '@prisma/client';
import { withAPILogging } from '@/lib/utils/api-logging';

// 翻訳モジュールのインポート
import { handleTranslationError, logTranslationError } from '@/lib/translation/error-handler';
import { validateTranslationRequest } from '@/lib/translation/utils';
import { structureTranslations, createPartialTranslationResult } from '@/lib/translation/normalizer';
import { TranslationEngine } from '@/lib/translation/engine';
import { createTranslationHistory, calculateRequiredCredits, checkSufficientCredits, consumeUserCredits, getUserTranslationHistory } from '@/lib/translation/history';
import { 
  TranslationRequest, 
  ValidationResult, 
  TranslationResponse, 
  StructuredTranslation,
  TranslationErrorContext
} from '@/lib/translation/types';

interface CustomSession extends Session {
  user: {
    id: string;
    isPremium?: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// 翻訳APIエンドポイント
async function handler(req: NextRequest) {
  // 処理開始時間を記録
  const startTime = Date.now();
  let translationError: Error | null = null;
  let translatedSlides: StructuredTranslation[] = [];
  let translations: string[] = [];
  
  try {
    // APIキーの確認
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API設定が不足しています' },
        { status: 500 }
      );
    }
    
    // 翻訳エンジンの初期化
    const translationEngine = new TranslationEngine(process.env.ANTHROPIC_API_KEY);

    // セッションからユーザー情報を取得
    const session = (await getServerSession(authOptions)) as CustomSession;
    if (!session) {
      return new NextResponse(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // リクエストデータの取得とバリデーション
    const data = await req.json();
    const { texts, sourceLang, targetLang, model, fileName = 'スライド', slides, fileId } = data;
    
    // デバッグ用にリクエストデータをログ出力
    console.log('翻訳APIリクエストデータ:', {
      fileId,
      sourceLang,
      targetLang,
      model,
      slidesProvided: !!slides,
      slidesLength: slides?.length,
      textsProvided: !!texts,
      textsLength: texts?.length
    });
    
    // リクエストバリデーション
    const translationRequest: TranslationRequest = {
      texts,
      sourceLang,
      targetLang,
      fileId,
      fileName,
      slides,
      model
    };
    
    const validationResult: ValidationResult = validateTranslationRequest(translationRequest);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }
    
    // fileIdがデータベースに存在するか確認
    try {
      const existingFile = await filePrisma().file.findUnique({
        where: { id: fileId }
      });
      
      if (!existingFile) {
        console.error(`ファイルID ${fileId} がデータベースに存在しません`);
        return NextResponse.json({ 
          error: '指定されたファイルIDがデータベースに存在しません', 
          detail: 'ファイルを再アップロードしてください' 
        }, { status: 404 });
      }
    } catch (dbError) {
      console.error('ファイル存在確認エラー:', dbError);
      // データベースエラーの場合は続行する
    }

    // モデル選択とバリデーション
    const defaultModel = TranslationEngine.getFreeUserModel();
    let selectedModel = model || defaultModel;

    // AWS Bedrockモデルの場合の処理
    if (selectedModel.includes('anthropic.claude')) {
      // TODO: AWS Bedrock APIの呼び出し処理を実装
      return NextResponse.json({ error: 'AWS Bedrock APIは現在実装中です' }, { status: 501 });
    }

    // 無料ユーザーは基本モデルのみ利用可能
    if (!session.user?.isPremium) {
      selectedModel = defaultModel;
    }
    
    // モデルが有効か確認
    if (!TranslationEngine.isValidModel(selectedModel)) {
      selectedModel = defaultModel;
    }
    
    // 翻訳エンジンにモデルを設定
    translationEngine.setModel(selectedModel);
    
    // 必要なクレジット数を計算
    const textCount = texts.length;
    const requiredCredits = calculateRequiredCredits(textCount);
    
    // クレジット残高の確認
    const creditCheck = await checkSufficientCredits(session.user.id, requiredCredits);
    if (!creditCheck.isEnough) {
      return NextResponse.json({
        error: 'クレジットが不足しています',
        detail: `必要クレジット: ${requiredCredits}, 利用可能クレジット: ${creditCheck.available}`,
      }, { status: 402 }); // Payment Required
    }

    // 翻訳処理の実行
    const translationResult = await translationEngine.translateTexts(
      texts,
      sourceLang,
      targetLang
    );
    
    translations = translationResult.translations;
    translationError = translationResult.error;
    const processingTime = translationResult.processingTimeMs;
    
    // 部分的な翻訳結果があるかどうか
    const partialTranslationAvailable = translationError && translations.length > 0;
    
    // 翻訳結果を構造化
    if (slides && Array.isArray(slides)) {
      // 構造化された翻訳結果を生成
      translatedSlides = structureTranslations(translations, texts, slides);
    }
    
    // クレジットを消費
    try {
      await consumeUserCredits(session.user.id, requiredCredits);
    } catch (creditError) {
      console.error('クレジット消費エラー:', creditError);
      // クレジット消費に失敗しても翻訳結果は返す
    }
    
    // 翻訳履歴を記録
    let historyStatus: TranslationStatus;
    let historyErrorMessage: string | null = null;

    if (translationError) {
      historyStatus = TranslationStatus.FAILED;
      historyErrorMessage = translationError.message;
    } else {
      historyStatus = TranslationStatus.COMPLETED;
    }
    
    // 翻訳履歴を作成
    try {
      await createTranslationHistory(
        session.user.id,
        fileId,
        fileName,
        sourceLang,
        targetLang,
        selectedModel,
        textCount,
        translations.length,
        processingTime,
        historyErrorMessage
      );
    } catch (historyError) {
      console.error('翻訳履歴作成エラー:', historyError);
      // 履歴作成に失敗しても翻訳結果は返す
    }

    // 部分的な翻訳結果がある場合
    if (partialTranslationAvailable) {
      console.log(`部分的な翻訳結果が利用可能です (${translations.length}/${texts.length})`);
      
      // 部分的な翻訳結果を構造化
      const partialResult = createPartialTranslationResult(
        translations,
        texts,
        slides || [],
        translationError
      );
      
      // 部分的な結果を返す（成功したものだけでも返す）
      return NextResponse.json({
        success: false,
        isPartial: true,
        error: translationError.message,
        translations, // 後方互換性のため残す
        translatedSlides: partialResult.translatedSlides,
        metadata: {
          sourceLang,
          targetLang,
          model: selectedModel,
          completedCount: translations.length,
          totalCount: textCount,
          processingTimeMs: processingTime
        },
      }, { status: 206 }); // Partial Content
    }

    // 完全に失敗した場合
    if (translationError) {
      return new NextResponse(JSON.stringify({ 
        error: '翻訳に失敗しました', 
        detail: translationError.message,
        success: false,
        isPartial: false
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // 完全に成功した場合
    return NextResponse.json({
      success: true,
      isPartial: false,
      translations, // 後方互換性のため残す
      translatedSlides, // スライドごとの翻訳結果
      metadata: {
        sourceLang,
        targetLang,
        model: selectedModel,
        completedCount: translations.length,
        totalCount: textCount,
        processingTimeMs: processingTime
      },
    });
  } catch (error) {
    console.error('Overall Translation API Error:', error);
    
    // 一般的なエラーレスポンスを返す
    return new NextResponse(JSON.stringify({ 
      error: '翻訳に失敗しました', 
      detail: error instanceof Error ? error.message : String(error),
      success: false,
      isPartial: false
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

// 翻訳履歴取得エンドポイント
export async function GET(req: NextRequest) {
  try {
    // セッションの取得
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session?.user) {
      throw Object.assign(new Error('認証が必要です'), { name: 'AuthenticationError' });
    }

    // 翻訳履歴の取得
    const histories = await getUserTranslationHistory(session.user.id);

    return new Response(JSON.stringify({ translations: histories }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    // エラーログの記録
    logTranslationError(error as Error, {
      userId: (await getServerSession(authOptions))?.user?.id,
      operation: 'get_translations',
    });

    // エラーレスポンスの生成
    return handleTranslationError(error as Error);
  }
}

// 言語名を取得する関数
const getLanguageName = (langCode: string): string => {
  const languages: Record<string, string> = {
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
    // 必要に応じて他の言語を追加
  };
  return languages[langCode] || langCode;
};

// ログ機能を適用したハンドラをエクスポート
export const POST = withAPILogging(handler, 'translate');
