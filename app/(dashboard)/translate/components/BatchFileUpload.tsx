'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Loader2, X, Upload, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface BatchFileUploadProps {
  onUploadComplete: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

export const BatchFileUpload = ({
  onUploadComplete,
  maxFiles = 50,
  maxFileSize = 20,
}: BatchFileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
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

  const handleFiles = (newFiles: File[]) => {
    // フィルタリング: PPTXファイルのみ
    const pptxFiles = newFiles.filter(file => 
      file.name.toLowerCase().endsWith('.pptx')
    );
    
    // サイズチェック
    const validFiles = pptxFiles.filter(file => {
      const isValidSize = file.size <= maxFileSize * 1024 * 1024;
      if (!isValidSize) {
        toast({
          title: "ファイルサイズエラー",
          description: `${file.name}は${maxFileSize}MBを超えています`,
          variant: "destructive"
        });
      }
      return isValidSize;
    });
    
    // 重複チェック
    const nonDuplicateFiles = validFiles.filter(file => 
      !files.some(existingFile => 
        existingFile.name === file.name && 
        existingFile.size === file.size
      )
    );
    
    // 最大ファイル数チェック
    const totalFiles = [...files, ...nonDuplicateFiles];
    if (totalFiles.length > maxFiles) {
      toast({
        title: "ファイル数制限",
        description: `一度にアップロードできるファイルは最大${maxFiles}個です`,
        variant: "destructive"
      });
      
      // 最大数まで追加
      const availableSlots = maxFiles - files.length;
      const filesToAdd = nonDuplicateFiles.slice(0, availableSlots);
      setFiles([...files, ...filesToAdd]);
      return;
    }
    
    setFiles(totalFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const startUpload = () => {
    if (files.length === 0) {
      toast({
        title: "ファイルが選択されていません",
        description: "アップロードするファイルを選択してください",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    // 進捗表示のためのダミー処理（実際の実装では、アップロードAPIの進捗イベントを使用）
    const simulateProgress = () => {
      const newProgress = { ...uploadProgress };
      
      files.forEach((file, index) => {
        const currentProgress = newProgress[file.name] || 0;
        if (currentProgress < 100) {
          // ランダムな進捗増加（5-15%）
          const increment = Math.floor(Math.random() * 10) + 5;
          newProgress[file.name] = Math.min(currentProgress + increment, 100);
        }
      });
      
      setUploadProgress(newProgress);
      
      // すべてのファイルが100%になったかチェック
      const allCompleted = files.every(file => newProgress[file.name] === 100);
      
      if (allCompleted) {
        // アップロード完了
        setTimeout(() => {
          onUploadComplete(files);
          setUploading(false);
          toast({
            title: "アップロード完了",
            description: `${files.length}個のファイルをアップロードしました`,
            variant: "default"
          });
        }, 500);
      } else {
        // まだ完了していないので続行
        setTimeout(simulateProgress, 300);
      }
    };
    
    // 進捗シミュレーション開始
    setTimeout(simulateProgress, 300);
  };

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="batch-upload-area"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pptx"
          multiple
          onChange={handleFileInputChange}
          data-testid="batch-file-input"
        />
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium" data-testid="batch-upload-text">
              バッチアップロード
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              複数のPPTXファイルをドラッグ＆ドロップするか、クリックして選択してください
            </p>
          </div>
          <Button
            onClick={handleButtonClick}
            disabled={uploading}
            data-testid="batch-file-select-button"
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
          <p className="text-xs text-gray-500 mt-2">
            最大{maxFiles}ファイル、各ファイル{maxFileSize}MBまで
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">選択されたファイル ({files.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              すべてクリア
            </Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center overflow-hidden">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                
                {uploading ? (
                  <div className="w-24 flex items-center">
                    {uploadProgress[file.name] === 100 ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="text-xs">{uploadProgress[file.name] || 0}%</span>
                    )}
                    <Progress 
                      value={uploadProgress[file.name] || 0} 
                      className="h-2 w-16 ml-2" 
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button
              onClick={startUpload}
              disabled={uploading || files.length === 0}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {files.length}ファイルをアップロード
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
