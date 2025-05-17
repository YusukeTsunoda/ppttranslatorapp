/**
 * 翻訳履歴管理モジュール
 * 翻訳履歴の記録とクレジット管理を担当
 */

import { v4 as uuidv4 } from 'uuid';
import { translationPrisma, userPrisma } from '@/lib/db/prisma';
import { Language, TranslationStatus } from '@prisma/client';
import { TranslationHistoryData } from './types';

/**
 * 翻訳履歴を作成
 * @param userId ユーザーID
 * @param fileId ファイルID
 * @param fileName ファイル名
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @param model 使用モデル
 * @param textCount テキスト総数
 * @param translatedCount 翻訳完了数
 * @param processingTimeMs 処理時間(ms)
 * @param error エラー情報
 * @returns 作成された履歴データ
 */
export async function createTranslationHistory(
  userId: string,
  fileId: string,
  fileName: string,
  sourceLang: Language,
  targetLang: Language,
  model: string,
  textCount: number,
  translatedCount: number,
  processingTimeMs: number,
  error: string | null
): Promise<TranslationHistoryData> {
  // 履歴IDを生成
  const historyId = uuidv4();
  
  // 履歴ステータスを決定
  const historyStatus = error && translatedCount < textCount 
    ? TranslationStatus.FAILED 
    : TranslationStatus.COMPLETED;
  
  // 履歴データを作成
  const historyData: TranslationHistoryData = {
    id: historyId,
    userId,
    fileId,
    fileName,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    status: historyStatus,
    model,
    textCount,
    translatedCount,
    processingTimeMs,
    error
  };
  
  try {
    // データベースに履歴を記録
    await translationPrisma().translationHistory.create({
      data: {
        id: historyData.id,
        userId: historyData.userId,
        fileId: historyData.fileId,
        creditsUsed: textCount, // 使用クレジット数はテキスト数と同じ
        sourceLang: historyData.sourceLanguage,
        targetLang: historyData.targetLanguage,
        status: historyData.status,
        model: historyData.model,
        processingTime: historyData.processingTimeMs,
        errorMessage: historyData.error,
        pageCount: textCount, // ページ数としてテキスト数を記録
        metadata: {
          translatedCount: historyData.translatedCount,
          fileName: historyData.fileName
        }
      },
    });
    
    return historyData;
  } catch (error) {
    console.error('翻訳履歴作成エラー:', error);
    throw error;
  }
}

/**
 * ユーザーの翻訳履歴を取得
 * @param userId ユーザーID
 * @param limit 取得件数
 * @param offset オフセット
 * @returns 翻訳履歴リスト
 */
export async function getUserTranslationHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  try {
    const histories = await translationPrisma().translationHistory.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
    
    return histories;
  } catch (error) {
    console.error('翻訳履歴取得エラー:', error);
    throw error;
  }
}

/**
 * 翻訳に必要なクレジットを計算
 * @param textCount テキスト数
 * @returns 必要クレジット数
 */
export function calculateRequiredCredits(textCount: number): number {
  // 基本的には1テキストあたり1クレジット
  return textCount;
}

/**
 * ユーザーのクレジット残高を確認
 * @param userId ユーザーID
 * @returns クレジット残高
 */
export async function getUserCredits(userId: string): Promise<number> {
  try {
    const user = await userPrisma().user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });
    
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }
    
    return user.credits;
  } catch (error) {
    console.error('クレジット取得エラー:', error);
    throw error;
  }
}

/**
 * ユーザーのクレジットを消費
 * @param userId ユーザーID
 * @param credits 消費クレジット数
 * @returns 更新後のクレジット残高
 */
export async function consumeUserCredits(
  userId: string,
  credits: number
): Promise<number> {
  try {
    const updatedUser = await userPrisma().user.update({
      where: { id: userId },
      data: { credits: { decrement: credits } },
      select: { credits: true }
    });
    
    return updatedUser.credits;
  } catch (error) {
    console.error('クレジット消費エラー:', error);
    throw error;
  }
}

/**
 * クレジット残高が十分かチェック
 * @param userId ユーザーID
 * @param requiredCredits 必要クレジット数
 * @returns クレジットが十分ならtrue、不足ならfalse
 */
export async function checkSufficientCredits(
  userId: string,
  requiredCredits: number
): Promise<{ isEnough: boolean; available: number }> {
  const availableCredits = await getUserCredits(userId);
  
  return {
    isEnough: availableCredits >= requiredCredits,
    available: availableCredits
  };
}
