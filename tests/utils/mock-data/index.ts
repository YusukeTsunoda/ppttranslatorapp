import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker/locale/ja';
import PptxGenJS from 'pptxgenjs';

/**
 * モックPPTXファイルの生成
 */
export async function generateMockPPTX(options: {
  slideCount?: number;
  textPerSlide?: number;
  outputPath?: string;
}) {
  const {
    slideCount = 5,
    textPerSlide = 3,
    outputPath = path.join(process.cwd(), 'tests/mock-data/sample.pptx'),
  } = options;

  const pptx = new PptxGenJS();

  // スライドの生成
  for (let i = 0; i < slideCount; i++) {
    const slide = pptx.addSlide();

    // タイトル
    slide.addText(faker.lorem.sentence(), {
      x: 1,
      y: 1,
      w: 8,
      h: 1,
      fontSize: 24,
      bold: true,
    });

    // 本文テキスト
    for (let j = 0; j < textPerSlide; j++) {
      slide.addText(faker.lorem.paragraph(), {
        x: 1,
        y: 2 + j,
        w: 8,
        h: 1,
        fontSize: 14,
      });
    }
  }

  // ファイルの保存
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

/**
 * モックAPIレスポンスの生成
 */
export function generateMockAPIResponse<T>(template: T, count: number = 1): T[] {
  return Array(count)
    .fill(null)
    .map(() => ({
      ...template,
      id: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: new Date(),
    }));
}

/**
 * 外部サービス連携のモックデータ
 */
export const mockExternalServices = {
  stripe: {
    customer: {
      id: 'cus_mock',
      email: faker.internet.email(),
      name: faker.person.fullName(),
      created: Math.floor(Date.now() / 1000),
    },
    subscription: {
      id: 'sub_mock',
      customer: 'cus_mock',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
    price: {
      id: 'price_mock',
      unit_amount: 1000,
      currency: 'jpy',
      recurring: {
        interval: 'month',
      },
    },
  },
  anthropic: {
    completion: {
      id: 'completion_mock',
      model: 'claude-3-opus-20240229',
      role: 'assistant',
      content: faker.lorem.paragraphs(3),
    },
  },
}; 