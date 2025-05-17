import { POST } from '@/app/api/translate/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { Language, TranslationStatus } from '@prisma/client';
import { createPrismaMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';
import Anthropic from '@anthropic-ai/sdk';

// Anthropic SDKのモック
jest.mock('@anthropic-ai/sdk');

// getServerSessionのモック
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// console.logのモック
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const prismaMock = createPrismaMock();
const getServerSessionMock = getServerSession as jest.Mock;

describe('POST /api/translate', () => {
  const mockAnthropicMessages = {
    create: jest.fn(),
  };

  beforeEach(() => {
    clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    (Anthropic as jest.Mock).mockImplementation(() => ({
      messages: mockAnthropicMessages,
    }));
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  it('should translate text successfully', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
      isPremium: true,
      credits: 10,
    });

    getServerSessionMock.mockResolvedValue({
      user: mockUser,
    });

    const mockFile = {
      id: 'test-file-id',
      name: 'test.pptx',
    };

    prismaMock.file.findUnique.mockResolvedValue(mockFile);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue({ ...mockUser, credits: 9 });
    prismaMock.translationHistory.create.mockResolvedValue({
      id: 'test-history-id',
      userId: mockUser.id,
      fileId: mockFile.id,
      status: TranslationStatus.COMPLETED,
    });

    mockAnthropicMessages.create.mockResolvedValue({
      content: [{ text: '翻訳されたテキスト' }],
    });

    const requestBody = {
      texts: ['Hello'],
      sourceLang: Language.EN,
      targetLang: Language.JA,
      model: 'claude-3-haiku-20240307',
      fileName: 'test.pptx',
      fileId: 'test-file-id',
      slides: [
        {
          index: 0,
          texts: [{ text: 'Hello', index: 0 }],
        },
      ],
    };

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.translatedSlides).toHaveLength(1);
    expect(responseBody.translatedSlides[0].translations[0].text).toBe('翻訳されたテキスト');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { credits: { decrement: 1 } },
    });
  });

  it('should return 401 if not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.error).toBe('認証が必要です');
  });

  it('should return 400 if fileId is missing', async () => {
    const mockUser = createMockUser({ id: 'test-user-id' });
    getServerSessionMock.mockResolvedValue({ user: mockUser });

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        texts: ['Hello'],
        sourceLang: Language.EN,
        targetLang: Language.JA,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('ファイルIDが必要です');
  });

  it('should return 404 if file not found', async () => {
    const mockUser = createMockUser({ id: 'test-user-id' });
    getServerSessionMock.mockResolvedValue({ user: mockUser });

    prismaMock.file.findUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        texts: ['Hello'],
        sourceLang: Language.EN,
        targetLang: Language.JA,
        fileId: 'non-existent-file-id',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toBe('指定されたファイルIDがデータベースに存在しません');
  });

  it('should return 403 if user has insufficient credits', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
      credits: 0,
    });

    getServerSessionMock.mockResolvedValue({ user: mockUser });

    const mockFile = {
      id: 'test-file-id',
      name: 'test.pptx',
    };

    prismaMock.file.findUnique.mockResolvedValue(mockFile);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        texts: ['Hello'],
        sourceLang: Language.EN,
        targetLang: Language.JA,
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(403);
    expect(responseBody.error).toBe('クレジットが不足しています');
    expect(responseBody.availableCredits).toBe(0);
    expect(responseBody.requiredCredits).toBe(1);
  });

  it('should use default model for non-premium users', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
      isPremium: false,
      credits: 10,
    });

    getServerSessionMock.mockResolvedValue({ user: mockUser });

    const mockFile = {
      id: 'test-file-id',
      name: 'test.pptx',
    };

    prismaMock.file.findUnique.mockResolvedValue(mockFile);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue({ ...mockUser, credits: 9 });
    mockAnthropicMessages.create.mockResolvedValue({
      content: [{ text: '翻訳されたテキスト' }],
    });

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        texts: ['Hello'],
        sourceLang: Language.EN,
        targetLang: Language.JA,
        model: 'claude-3-opus-20240229',
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(req);

    expect(mockAnthropicMessages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-3-haiku-20240307',
      })
    );
  });

  it('should handle translation API errors', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
      credits: 10,
    });

    getServerSessionMock.mockResolvedValue({ user: mockUser });

    const mockFile = {
      id: 'test-file-id',
      name: 'test.pptx',
    };

    prismaMock.file.findUnique.mockResolvedValue(mockFile);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    mockAnthropicMessages.create.mockRejectedValue(new Error('API Error'));

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        texts: ['Hello'],
        sourceLang: Language.EN,
        targetLang: Language.JA,
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('翻訳に失敗しました');
    expect(prismaMock.translationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TranslationStatus.FAILED,
        errorMessage: expect.any(String),
      })
    );
  });
}); 