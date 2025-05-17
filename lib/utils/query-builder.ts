import { Prisma } from '@prisma/client';
import { 
  FilterParams, 
  TranslationHistoryFilterParams, 
  FileFilterParams, 
  UserFilterParams, 
  ActivityLogFilterParams,
  sanitizeString
} from './query-filter';

// 基本的なページネーション情報を生成
export function getPaginationParams(params: FilterParams) {
  const page = params.page || 1;
  const limit = params.limit || 10;
  
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

// 日付フィルターを生成
export function getDateFilter(startDate?: string, endDate?: string): Prisma.DateTimeFilter | undefined {
  const dateFilter: Prisma.DateTimeFilter = {};
  
  if (startDate) {
    try {
      dateFilter.gte = new Date(startDate);
    } catch {
      // 無効な日付は無視
    }
  }
  
  if (endDate) {
    try {
      dateFilter.lte = new Date(endDate);
    } catch {
      // 無効な日付は無視
    }
  }
  
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

// 翻訳履歴フィルターのクエリを構築
export function buildTranslationHistoryQuery(
  params: TranslationHistoryFilterParams,
  userId: string
): {
  where: Prisma.TranslationHistoryWhereInput,
  orderBy: Prisma.TranslationHistoryOrderByWithRelationInput | Prisma.TranslationHistoryOrderByWithRelationInput[],
  pagination: { skip: number; take: number; }
} {
  const { page, limit, sort, order, search, startDate, endDate, status, sourceLang, targetLang,
    minPageCount, maxPageCount, minCreditsUsed, maxCreditsUsed, minFileSize, maxFileSize, tags } = params;
  
  // フィルタリング条件を構築
  const whereCondition: Prisma.TranslationHistoryWhereInput = {
    userId,
  };

  // タグによるフィルタリングがある場合（JSON配列内の文字列検索）
  if (tags && tags.length > 0) {
    whereCondition.tags = {
      path: '$',
      array_contains: tags
    } as any; // Prismaの型定義でJSON検索がうまく型付けできない場合
  }
  
  // 検索テキストによるフィルタリング
  if (search) {
    // サニタイズして安全な検索テキストを使用
    const safeSearch = sanitizeString(search);
    whereCondition.file = {
      originalName: {
        contains: safeSearch,
        mode: 'insensitive',
      }
    };
  }
  
  // 日付範囲によるフィルタリング
  const dateFilter = getDateFilter(startDate, endDate);
  if (dateFilter) {
    whereCondition.createdAt = dateFilter;
  }
  
  // ステータスによるフィルタリング
  if (status) {
    whereCondition.status = status;
  }
  
  // 言語によるフィルタリング
  if (sourceLang) {
    whereCondition.sourceLang = sourceLang;
  }
  
  if (targetLang) {
    whereCondition.targetLang = targetLang;
  }
  
  // 数値範囲のフィルタリング
  if (minPageCount !== undefined || maxPageCount !== undefined) {
    whereCondition.pageCount = {};
    
    if (minPageCount !== undefined) {
      whereCondition.pageCount.gte = minPageCount;
    }
    
    if (maxPageCount !== undefined) {
      whereCondition.pageCount.lte = maxPageCount;
    }
  }
  
  if (minCreditsUsed !== undefined || maxCreditsUsed !== undefined) {
    whereCondition.creditsUsed = {};
    
    if (minCreditsUsed !== undefined) {
      whereCondition.creditsUsed.gte = minCreditsUsed;
    }
    
    if (maxCreditsUsed !== undefined) {
      whereCondition.creditsUsed.lte = maxCreditsUsed;
    }
  }
  
  if (minFileSize !== undefined || maxFileSize !== undefined) {
    whereCondition.fileSize = {};
    
    if (minFileSize !== undefined) {
      whereCondition.fileSize.gte = minFileSize;
    }
    
    if (maxFileSize !== undefined) {
      whereCondition.fileSize.lte = maxFileSize;
    }
  }
  
  // ソート条件を構築
  let orderByCondition: Prisma.TranslationHistoryOrderByWithRelationInput | Prisma.TranslationHistoryOrderByWithRelationInput[];
  
  if (sort === 'originalFileName') {
    orderByCondition = {
      file: {
        originalName: order,
      },
    };
  } else {
    orderByCondition = {
      [sort]: order,
    } as Prisma.TranslationHistoryOrderByWithRelationInput;
  }
  
  // ページネーション設定
  const pagination = getPaginationParams({ page, limit });
  
  return {
    where: whereCondition,
    orderBy: orderByCondition,
    pagination,
  };
}

// ファイルフィルターのクエリを構築
export function buildFileQuery(
  params: FileFilterParams,
  userId: string
): {
  where: Prisma.FileWhereInput,
  orderBy: Prisma.FileOrderByWithRelationInput,
  pagination: { skip: number; take: number; }
} {
  const { page, limit, sort, order, search, startDate, endDate, status, mimeType, minFileSize, maxFileSize } = params;
  
  // フィルタリング条件を構築
  const whereCondition: Prisma.FileWhereInput = {
    userId,
  };
  
  // 検索テキストによるフィルタリング
  if (search) {
    whereCondition.originalName = {
      contains: sanitizeString(search),
      mode: 'insensitive',
    };
  }
  
  // 日付範囲によるフィルタリング
  const dateFilter = getDateFilter(startDate, endDate);
  if (dateFilter) {
    whereCondition.createdAt = dateFilter;
  }
  
  // ステータスによるフィルタリング
  if (status) {
    whereCondition.status = status;
  }
  
  // MIMEタイプによるフィルタリング
  if (mimeType) {
    whereCondition.mimeType = {
      contains: mimeType,
    };
  }
  
  // ファイルサイズ範囲のフィルタリング
  if (minFileSize !== undefined || maxFileSize !== undefined) {
    whereCondition.fileSize = {};
    
    if (minFileSize !== undefined) {
      whereCondition.fileSize.gte = minFileSize;
    }
    
    if (maxFileSize !== undefined) {
      whereCondition.fileSize.lte = maxFileSize;
    }
  }
  
  // ソート条件を構築
  const orderByCondition: Prisma.FileOrderByWithRelationInput = {
    [sort]: order,
  } as Prisma.FileOrderByWithRelationInput;
  
  // ページネーション設定
  const pagination = getPaginationParams({ page, limit });
  
  return {
    where: whereCondition,
    orderBy: orderByCondition,
    pagination,
  };
}

// ユーザーフィルターのクエリを構築（管理者用）
export function buildUserQuery(
  params: UserFilterParams
): {
  where: Prisma.UserWhereInput,
  orderBy: Prisma.UserOrderByWithRelationInput,
  pagination: { skip: number; take: number; }
} {
  const { page, limit, sort, order, search, startDate, endDate, role, emailVerified, minCredits, maxCredits } = params;
  
  // フィルタリング条件を構築
  const whereCondition: Prisma.UserWhereInput = {};
  
  // 検索テキストによるフィルタリング（名前またはメールアドレス）
  if (search) {
    const safeSearch = sanitizeString(search);
    whereCondition.OR = [
      {
        name: {
          contains: safeSearch,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: safeSearch,
          mode: 'insensitive',
        },
      },
    ];
  }
  
  // 日付範囲によるフィルタリング
  const dateFilter = getDateFilter(startDate, endDate);
  if (dateFilter) {
    whereCondition.createdAt = dateFilter;
  }
  
  // ロールによるフィルタリング
  if (role) {
    whereCondition.role = role;
  }
  
  // メール確認状態によるフィルタリング
  if (emailVerified !== undefined) {
    if (emailVerified) {
      // メール確認済みユーザーのみ
      whereCondition.emailVerified = { not: null };
    } else {
      // メール未確認ユーザーのみ
      whereCondition.emailVerified = null;
    }
  }
  
  // クレジット範囲のフィルタリング
  if (minCredits !== undefined || maxCredits !== undefined) {
    whereCondition.credits = {};
    
    if (minCredits !== undefined) {
      whereCondition.credits.gte = minCredits;
    }
    
    if (maxCredits !== undefined) {
      whereCondition.credits.lte = maxCredits;
    }
  }
  
  // ソート条件を構築
  const orderByCondition: Prisma.UserOrderByWithRelationInput = {
    [sort]: order,
  } as Prisma.UserOrderByWithRelationInput;
  
  // ページネーション設定
  const pagination = getPaginationParams({ page, limit });
  
  return {
    where: whereCondition,
    orderBy: orderByCondition,
    pagination,
  };
}

// アクティビティログフィルターのクエリを構築
export function buildActivityLogQuery(
  params: ActivityLogFilterParams,
  currentUserId?: string,
  isAdmin = false
): {
  where: Prisma.ActivityLogWhereInput,
  orderBy: Prisma.ActivityLogOrderByWithRelationInput,
  pagination: { skip: number; take: number; }
} {
  const { page, limit, sort, order, search, startDate, endDate, type, userId } = params;
  
  // フィルタリング条件を構築
  const whereCondition: Prisma.ActivityLogWhereInput = {};
  
  // 管理者でない場合は、自分のアクティビティのみに制限
  if (!isAdmin && currentUserId) {
    whereCondition.userId = currentUserId;
  } else if (userId) {
    // 管理者で特定ユーザーを指定した場合
    whereCondition.userId = userId;
  }
  
  // 検索テキストによるフィルタリング
  if (search) {
    whereCondition.description = {
      contains: sanitizeString(search),
      mode: 'insensitive',
    };
  }
  
  // 日付範囲によるフィルタリング
  const dateFilter = getDateFilter(startDate, endDate);
  if (dateFilter) {
    whereCondition.createdAt = dateFilter;
  }
  
  // アクティビティタイプによるフィルタリング
  if (type) {
    whereCondition.type = type;
  }
  
  // ソート条件を構築
  const orderByCondition: Prisma.ActivityLogOrderByWithRelationInput = {
    [sort]: order,
  } as Prisma.ActivityLogOrderByWithRelationInput;
  
  // ページネーション設定
  const pagination = getPaginationParams({ page, limit });
  
  return {
    where: whereCondition,
    orderBy: orderByCondition,
    pagination,
  };
}

// レスポンス形式の統一ユーティリティ
export function formatPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number
) {
  return {
    data,
    total: totalCount,
    page,
    limit,
    pageCount: Math.ceil(totalCount / limit),
    hasNextPage: page * limit < totalCount,
    hasPreviousPage: page > 1,
  };
} 