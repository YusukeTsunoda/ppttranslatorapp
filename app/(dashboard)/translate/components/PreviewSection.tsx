"use client";

import { Card } from "@/components/ui/card";
import { Slide, TextItem, TranslationItem } from "../types";
import { useState } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit2, Save, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PreviewSectionProps {
  slide: Slide;
  onTranslationEdit?: (index: number, newText: string) => void;
}

export const PreviewSectionComponent = ({ slide, onTranslationEdit }: PreviewSectionProps) => {
  const [imageError, setImageError] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [scale, setScale] = useState(1);

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditValue(text);
  };

  const saveEdit = (index: number) => {
    if (onTranslationEdit) {
      onTranslationEdit(index, editValue);
    }
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
  };

  return (
    <Card className="p-4 space-y-4 w-full">
      {/* ズームコントロール */}
      <div className="flex justify-end space-x-2 mb-2">
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={resetZoom}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      
      {/* スライド画像 - 高さを大きくする */}
      <div className="relative w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
        {imageError ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            画像の読み込みに失敗しました
          </div>
        ) : (
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }} className="w-full h-full flex items-center justify-center">
            <Image
              src={slide.imageUrl}
              alt={`スライド ${slide.index + 1}`}
              fill
              className="object-contain"
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">スライド {slide.index + 1}</h3>
        
        {slide.texts.map((textItem, index) => {
          const translation = slide.translations && slide.translations[index] 
            ? slide.translations[index].text 
            : "";
            
          return (
            <div key={index} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">テキスト {index + 1}</span>
                {translation && onTranslationEdit && editingIndex !== index && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => startEditing(index, translation)}
                    className="h-7 px-2"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    編集
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500">原文:</h4>
                  <div className="p-2 bg-gray-50 rounded min-h-[60px] text-sm">
                    {textItem.text}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500">翻訳:</h4>
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="flex space-x-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={cancelEdit}
                          className="h-7 px-2"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          キャンセル
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => saveEdit(index)}
                          className="h-7 px-2"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-50 rounded min-h-[60px] text-sm">
                      {translation || "翻訳がありません"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}; 