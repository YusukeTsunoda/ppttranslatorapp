/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// テスト用の型定義
interface ProgressData {
  totalTexts: number;
  translatedTexts: {
    [key: string]: number;
  };
}

interface TranslationProgressProps {
  progressData: ProgressData;
  selectedLanguage?: string;
}

// モックデータ
const mockProgressData: ProgressData = {
  totalTexts: 10,
  translatedTexts: {
    en: 5,
    fr: 3,
    de: 0,
  },
};

// TranslationProgressコンポーネントを定義
const TranslationProgress = ({ progressData, selectedLanguage }: TranslationProgressProps) => (
  <div data-testid="translation-progress">
    <div data-testid="total-texts">{progressData.totalTexts}</div>
    <div data-testid="translated-texts">
      {selectedLanguage ? progressData.translatedTexts[selectedLanguage] || 0 : 0}
    </div>
    <div data-testid="progress-percentage">
      {selectedLanguage && progressData.totalTexts > 0
        ? Math.round(((progressData.translatedTexts[selectedLanguage] || 0) / progressData.totalTexts) * 100)
        : 0}
      %
    </div>
  </div>
);

describe('TranslationProgress', () => {
  it('翻訳の進捗状況を正しく表示する（英語）', () => {
    render(<TranslationProgress progressData={mockProgressData} selectedLanguage="en" />);

    expect(screen.getByTestId('total-texts')).toHaveTextContent('10');
    expect(screen.getByTestId('translated-texts')).toHaveTextContent('5');
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('50%');
  });

  it('翻訳の進捗状況を正しく表示する（フランス語）', () => {
    render(<TranslationProgress progressData={mockProgressData} selectedLanguage="fr" />);

    expect(screen.getByTestId('translated-texts')).toHaveTextContent('3');
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('30%');
  });

  it('言語が設定されていない場合は0を表示する', () => {
    render(
      <TranslationProgress
        progressData={mockProgressData}
        selectedLanguage="ja" // 存在しない言語
      />,
    );

    expect(screen.getByTestId('translated-texts')).toHaveTextContent('0');
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('0%');
  });

  it('テキストがない場合は0%を表示する', () => {
    render(<TranslationProgress progressData={{ totalTexts: 0, translatedTexts: {} }} selectedLanguage="en" />);

    expect(screen.getByTestId('total-texts')).toHaveTextContent('0');
    expect(screen.getByTestId('translated-texts')).toHaveTextContent('0');
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('0%');
  });
});
