/**
 * ファイルパス構造ヘルパー
 * 新しいファイルパス構造に合わせたパス生成と検証を行うためのユーティリティ
 */

import path from 'path';
import fs from 'fs/promises';

// 新しいファイルパス構造: /tmp/users/{userId}/{fileId}/slides
// 旧形式のパス構造: /tmp/users/{userId}/slides/{fileId}

/**
 * 新しいファイルパス構造に基づいてパスを生成
 */
export function generateNewFilePath(
  userId: string,
  fileId: string,
  fileName?: string,
  baseDir: string = 'tmp'
): string {
  const slidesDir = path.join(process.cwd(), baseDir, 'users', userId, fileId, 'slides');
  
  if (fileName) {
    return path.join(slidesDir, fileName);
  }
  
  return slidesDir;
}

/**
 * 旧形式のファイルパス構造に基づいてパスを生成（互換性のため）
 */
export function generateLegacyFilePath(
  userId: string,
  fileId: string,
  fileName?: string,
  baseDir: string = 'tmp'
): string {
  const slidesDir = path.join(process.cwd(), baseDir, 'users', userId, 'slides', fileId);
  
  if (fileName) {
    return path.join(slidesDir, fileName);
  }
  
  return slidesDir;
}

/**
 * 新しいファイルパス構造のディレクトリを作成
 */
export async function createNewFilePathDirectories(
  userId: string,
  fileId: string,
  baseDir: string = 'tmp'
): Promise<string> {
  const slidesDir = generateNewFilePath(userId, fileId, undefined, baseDir);
  
  try {
    await fs.mkdir(slidesDir, { recursive: true });
  } catch (error) {
    console.error(`ディレクトリの作成中にエラーが発生しました: ${slidesDir}`, error);
    throw error;
  }
  
  return slidesDir;
}

/**
 * 旧形式のファイルパス構造のディレクトリを作成（互換性のため）
 */
export async function createLegacyFilePathDirectories(
  userId: string,
  fileId: string,
  baseDir: string = 'tmp'
): Promise<string> {
  const slidesDir = generateLegacyFilePath(userId, fileId, undefined, baseDir);
  
  try {
    await fs.mkdir(slidesDir, { recursive: true });
  } catch (error) {
    console.error(`ディレクトリの作成中にエラーが発生しました: ${slidesDir}`, error);
    throw error;
  }
  
  return slidesDir;
}

/**
 * ファイルパスが新しい構造に準拠しているか検証
 */
export function isNewFilePathStructure(filePath: string): boolean {
  // パスを正規化
  const normalizedPath = path.normalize(filePath);
  
  // 新しい構造のパターン: /tmp/users/{userId}/{fileId}/slides/...
  const pattern = /[\/\\]tmp[\/\\]users[\/\\][^\/\\]+[\/\\][^\/\\]+[\/\\]slides[\/\\]?/;
  
  return pattern.test(normalizedPath);
}

/**
 * ファイルパスが旧形式の構造に準拠しているか検証
 */
export function isLegacyFilePathStructure(filePath: string): boolean {
  // パスを正規化
  const normalizedPath = path.normalize(filePath);
  
  // 旧形式の構造のパターン: /tmp/users/{userId}/slides/{fileId}/...
  const pattern = /[\/\\]tmp[\/\\]users[\/\\][^\/\\]+[\/\\]slides[\/\\][^\/\\]+[\/\\]?/;
  
  return pattern.test(normalizedPath);
}

/**
 * ファイルパスからユーザーIDとファイルIDを抽出
 */
export function extractIdsFromFilePath(filePath: string): {
  userId?: string;
  fileId?: string;
  isNewStructure: boolean;
} {
  // パスを正規化
  const normalizedPath = path.normalize(filePath);
  
  // 新しい構造のパターン: /tmp/users/{userId}/{fileId}/slides/...
  const newPattern = /[\/\\]tmp[\/\\]users[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)[\/\\]slides[\/\\]?/;
  const newMatch = normalizedPath.match(newPattern);
  
  if (newMatch) {
    return {
      userId: newMatch[1],
      fileId: newMatch[2],
      isNewStructure: true,
    };
  }
  
  // 旧形式の構造のパターン: /tmp/users/{userId}/slides/{fileId}/...
  const legacyPattern = /[\/\\]tmp[\/\\]users[\/\\]([^\/\\]+)[\/\\]slides[\/\\]([^\/\\]+)[\/\\]?/;
  const legacyMatch = normalizedPath.match(legacyPattern);
  
  if (legacyMatch) {
    return {
      userId: legacyMatch[1],
      fileId: legacyMatch[2],
      isNewStructure: false,
    };
  }
  
  return {
    isNewStructure: false,
  };
}

/**
 * 旧形式のパスを新しい構造のパスに変換
 */
export function convertLegacyToNewPath(filePath: string): string {
  const { userId, fileId } = extractIdsFromFilePath(filePath);
  
  if (!userId || !fileId) {
    throw new Error(`無効なファイルパス: ${filePath}`);
  }
  
  // ファイル名を抽出
  const fileName = path.basename(filePath);
  
  // 新しい構造のパスを生成
  return generateNewFilePath(userId, fileId, fileName);
}

/**
 * 新しい構造のパスを旧形式のパスに変換（互換性のため）
 */
export function convertNewToLegacyPath(filePath: string): string {
  const { userId, fileId } = extractIdsFromFilePath(filePath);
  
  if (!userId || !fileId) {
    throw new Error(`無効なファイルパス: ${filePath}`);
  }
  
  // ファイル名を抽出
  const fileName = path.basename(filePath);
  
  // 旧形式の構造のパスを生成
  return generateLegacyFilePath(userId, fileId, fileName);
}

/**
 * APIエンドポイントのパスを生成
 */
export function generateApiEndpointPath(
  fileId: string,
  imageName?: string
): string {
  if (imageName) {
    return `/api/slides/${fileId}/slides/${imageName}`;
  }
  
  return `/api/slides/${fileId}`;
}
