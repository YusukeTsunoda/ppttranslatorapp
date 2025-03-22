'use client';

import { Button } from '@/components/ui/button';
// import { useToast } from '@/components/ui/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  onUploadComplete: (file: File) => void;
}

export const FileUploadComponent = ({ onUploadComplete }: FileUploadProps) => {
  // file 変数が使用されていないというエラーは誤検知のようです
  // setUploading は使用されていませんが、将来的に使う可能性があるためコメントアウト
  const [uploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const { toast } = useToast();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUploadComplete(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid="upload-area"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pptx"
        onChange={(e) => e.target.files && onUploadComplete(e.target.files[0])}
        data-testid="file-input"
      />
      <div className="text-center">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium" data-testid="upload-text">
            ファイルをアップロード
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            PPTXファイルをドラッグ＆ドロップするか、クリックして選択してください
          </p>
        </div>
        <Button
          onClick={handleButtonClick}
          disabled={uploading}
          data-testid="file-select-button"
          className="w-full sm:w-auto"
          variant="outline"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              ファイルを選択
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2">最大ファイルサイズ: 20MB</p>
      </div>
    </div>
  );
};
