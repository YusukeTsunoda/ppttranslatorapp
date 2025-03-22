/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadComponent } from '@/app/(dashboard)/translate/components/FileUpload';
import '@testing-library/jest-dom';

describe('FileUploadComponent', () => {
  const mockOnUploadComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされること', () => {
    render(<FileUploadComponent onUploadComplete={mockOnUploadComplete} />);
    
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
    expect(screen.getByTestId('upload-text')).toHaveTextContent('ファイルをアップロード');
    expect(screen.getByTestId('file-select-button')).toHaveTextContent('ファイルを選択');
  });

  it('ファイル選択ボタンをクリックするとファイル選択ダイアログが開くこと', () => {
    render(<FileUploadComponent onUploadComplete={mockOnUploadComplete} />);
    
    const fileInput = screen.getByTestId('file-input');
    const clickSpy = jest.spyOn(fileInput, 'click');
    
    fireEvent.click(screen.getByTestId('file-select-button'));
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('ファイルが選択されたときにonUploadCompleteが呼ばれること', () => {
    render(<FileUploadComponent onUploadComplete={mockOnUploadComplete} />);
    
    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(mockOnUploadComplete).toHaveBeenCalledWith(file);
  });

  it('ドラッグ&ドロップでファイルをアップロードできること', () => {
    render(<FileUploadComponent onUploadComplete={mockOnUploadComplete} />);
    
    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const uploadArea = screen.getByTestId('upload-area');
    
    // ドラッグオーバーイベントをシミュレート
    fireEvent.dragOver(uploadArea);
    
    // ドロップイベントをシミュレート
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [file]
      }
    });
    
    expect(mockOnUploadComplete).toHaveBeenCalledWith(file);
  });

  it('ドラッグ&ドロップ中にスタイルが変わること', () => {
    render(<FileUploadComponent onUploadComplete={mockOnUploadComplete} />);
    
    const uploadArea = screen.getByTestId('upload-area');
    
    // 初期状態ではドラッグオーバースタイルが適用されていないこと
    expect(uploadArea.className).toContain('border-gray-300');
    
    // ドラッグオーバー時にスタイルが変わること
    fireEvent.dragOver(uploadArea);
    expect(uploadArea.className).toContain('border-primary');
    
    // ドラッグリーブ時に元のスタイルに戻ること
    fireEvent.dragLeave(uploadArea);
    expect(uploadArea.className).toContain('border-gray-300');
  });
});
