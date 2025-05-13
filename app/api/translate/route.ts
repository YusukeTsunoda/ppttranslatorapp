// Node.jsランタイムを明示的に指定
// Anthropic APIの処理を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Session } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { v4 as uuidv4 } from 'uuid';
import { Language, TranslationStatus } from '@prisma/client';

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
export async function POST(request: Request) {
  try {
    // APIキーの確認
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API設定が不足しています' },
        { status: 500 }
      );
    }

    // APIクライアントの設定
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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

    const data = await request.json();

    // リクエストBodyからパラメータ取得
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

    // ★★★ Check if fileId is provided ★★★
    if (!fileId) {
      return NextResponse.json({ error: 'ファイルIDが必要です' }, { status: 400 });
    }
    
    // fileIdがデータベースに存在するか確認
    try {
      const existingFile = await prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!existingFile) {
        console.error(`ファイルID ${fileId} がデータベースに存在しません`);
        // 存在しない場合はエラーを返す
        return NextResponse.json({ 
          error: '指定されたファイルIDがデータベースに存在しません', 
          detail: 'ファイルを再アップロードしてください' 
        }, { status: 404 });
      }
    } catch (dbError) {
      console.error('ファイル存在確認エラー:', dbError);
      // データベースエラーの場合は続行する
    }

    // デフォルトモデルを指定
    const defaultModel = 'claude-3-haiku-20240307';
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

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json({ error: 'テキストが必要です' }, { status: 400 });
    }

    let translations: string[] = [];
    let translatedSlides: any[] = []; // 翻訳結果を格納する配列を宣言
    let translationError: Error | null = null;
    const startTime = Date.now(); // Start time measurement

    try {
      // 翻訳処理の実行
      let translationIndex = 0;
      
      // slidesが存在しない場合のエラー処理
      if (!slides || !Array.isArray(slides)) {
        console.error('翻訳APIエラー: slides配列が存在しません');
        return NextResponse.json({ 
          error: 'スライドデータが不正です', 
          detail: 'ファイルを再アップロードしてください' 
        }, { status: 400 });
      }
      

      // 翻訳結果を格納する配列
      const translatedSlides = [];
      
      // スライドごとに処理
      for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
        const slide = slides[slideIndex];
        
        if (!slide || !slide.texts || !Array.isArray(slide.texts)) {
          console.log(`スライド ${slide?.index || slideIndex} にテキストがありません`);
          translatedSlides.push({
            index: slide?.index || slideIndex,
            translations: []
          });
          continue;
        }
        
        console.log(`スライド ${slideIndex} の翻訳対象テキスト数: ${slide.texts.length}`);
        
        // このスライドの翻訳プロミスを作成
        const slideTranslationPromises = slide.texts.map((element: any, textIndex: number) => {
          if (!element || !element.text || element.text.trim() === '') {
            return Promise.resolve({
              index: textIndex,
              text: '',
              originalText: element?.text || ''
            });
          }

          // 翻訳プロンプトの作成
          const prompt = `あなたは高品質な翻訳エンジンです。以下のテキストを${sourceLang}から${targetLang}に翻訳してください。
元のテキストの意味を正確に保ちながら、自然な${targetLang}に翻訳してください。
フォーマットや記号は保持し、翻訳のみを行ってください。

テキスト: "${element.text}"

翻訳:`;

          // Anthropic APIを使用した翻訳
          return anthropic.messages.create({
            model: selectedModel,
            max_tokens: 1000,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }).then(message => {
            // 翻訳結果から余分なテキストを削除する
            let translatedText = (message.content[0] as any).text.trim();
            
            // 余分なパターンを削除
            const patterns = [
              /^Here is the translation from .+ to .+:\s*/i,
              /^Translation:\s*/i,
              /^Translated text:\s*/i,
              /^The translation is:\s*/i,
              /^In English:\s*/i,
              /^In Japanese:\s*/i,
              /^The text "([^"]+)" translates to:\s*/i,  // The text "..." translates to: パターンを削除
              /^The text "([^"]+)" translates to English as:\s*/i,  // The text "..." translates to English as: パターンを削除
              /^The text "([^"]+)" can be translated to English as:\s*/i,  // The text "..." can be translated to English as: パターンを削除
              /^The text "([^"]+)" in English is:\s*/i,  // The text "..." in English is: パターンを削除
              /^The English translation of "([^"]+)" is:\s*/i,  // The English translation of "..." is: パターンを削除
              /^\"(.+)\"$/,  // 引用符で囲まれたテキストから引用符を削除
              /^(.+):$/,     // ダブルコロンで終わるパターンを削除
            ];
            
            // 各パターンにマッチする場合は削除
            patterns.forEach(pattern => {
              translatedText = translatedText.replace(pattern, '$1');
            });
            
            // 引用符で囲まれた場合の処理
            if (translatedText.startsWith('"') && translatedText.endsWith('"')) {
              translatedText = translatedText.substring(1, translatedText.length - 1);
            }
            
            // 最終的なクリーンアップ
            translatedText = translatedText.trim();
            
            return {
              index: textIndex,
              text: translatedText,
              originalText: element.text
            };
          }).catch(error => {
            // エラーログは残す
            console.error('翻訳APIエラー:', error instanceof Error ? error.message : String(error));
            return {
              index: textIndex,
              text: '[翻訳エラー]',
              originalText: element.text
            };
          });
        });
        
        // このスライドの翻訳結果を取得
        const slideTranslations = await Promise.all(slideTranslationPromises);
        
        // 翻訳結果をスライドに追加
        translatedSlides.push({
          index: slide.index || slideIndex,
          translations: slideTranslations
        });
        
        // 全体の翻訳配列にも追加（後方互換性のため）
        slideTranslations.forEach(t => {
          translations.push(t.text);
        });
      }
      
      console.log(`翻訳完了: ${translations.length}個のテキストを翻訳しました`);
      if (translatedSlides.length > 0 && translatedSlides[0].translations.length > 0) {
        console.log('翻訳サンプル:', translatedSlides[0].translations[0]);
      }

    } catch (error) {
      console.error('翻訳APIエラー:', error instanceof Error ? error.message : String(error));
      translationError = error instanceof Error ? error : new Error(String(error));
    }

    const endTime = Date.now();
    const processingTime = Math.round(endTime - startTime); // Calculate processing time in milliseconds

    // --- History and Credit Logic ---
    let historyStatus: TranslationStatus;
    let historyErrorMessage: string | null = null;

    if (translationError) {
      historyStatus = TranslationStatus.FAILED;
      historyErrorMessage = translationError.message;
    } else {
      historyStatus = TranslationStatus.COMPLETED;
    }

    // ページ数に基づいて必要なクレジット数を計算
    const pageCount = slides?.length ?? 0;
    const requiredCredits = pageCount; // 1ページあたり1クレジット
    
    // Prepare history data regardless of DB operation success
    const historyData = {
      // id: uuidv4(), // Let Prisma handle default cuid()
      userId: session.user.id,
      fileId: fileId, // Use provided fileId
      // fileName: fileName, // Removed, get from File model if needed
      pageCount: pageCount,
      status: historyStatus,
      creditsUsed: historyStatus === TranslationStatus.COMPLETED ? requiredCredits : 0, // ページ数分のクレジットを消費
      sourceLang: sourceLang as Language,
      targetLang: targetLang as Language,
      model: selectedModel,
      // fileSize: 0, // TODO: Get file size if needed, maybe from File record?
      processingTime: processingTime, // Store calculated processing time
      translatedFileKey: null, // Set later when file is generated and stored
      errorMessage: historyErrorMessage,
    };

    // ユーザーの現在のクレジット残高を確認
    let userCredits = 0;
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true }
      });
      
      if (!user) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }
      
      userCredits = user.credits;
      
      // クレジットが不足している場合はエラーを返す
      if (userCredits < requiredCredits) {
        return NextResponse.json(
          { 
            error: 'クレジットが不足しています', 
            requiredCredits,
            availableCredits: userCredits 
          },
          { status: 403 }
        );
      }
      
      // Attempt to update credits (only on success) and create history record
      if (historyStatus === TranslationStatus.COMPLETED) {
        // ページ数分のクレジットを減算
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { decrement: requiredCredits } },
        });
      }

      const createdHistory = await prisma.translationHistory.create({
        data: historyData,
      });

    } catch (dbError) {
      console.error('データベース操作エラー (クレジット更新 or 履歴作成):', dbError);
      // Even if DB fails, try to return the translation result if available
    }
    // --- End History and Credit Logic ---

    // If translation itself failed, return error
    if (translationError) {
        return new NextResponse(JSON.stringify({ error: '翻訳に失敗しました', detail: translationError.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    }

    // Return successful translation with structured data
    return NextResponse.json({
      success: true,
      translations, // 後方互換性のため残す
      translatedSlides, // スライドごとの翻訳結果
      metadata: {
        sourceLang,
        targetLang,
        model: selectedModel,
      },
    });
  } catch (error) {
    console.error('Overall Translation API Error:', error);
    // Attempt to record a FAILED history entry even in outer catch block?
    // This might be complex due to potential lack of data (session, fileId etc.)
    // For now, just return a generic error.
    return new NextResponse(JSON.stringify({ error: '翻訳に失敗しました', detail: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Translation status error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to get translation status' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

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
