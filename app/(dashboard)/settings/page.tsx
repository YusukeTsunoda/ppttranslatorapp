'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">翻訳設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          翻訳の品質と言語に関する設定をカスタマイズできます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>言語設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>翻訳元の言語</Label>
              <Select defaultValue="en">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="言語を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">英語</SelectItem>
                  <SelectItem value="zh">中国語</SelectItem>
                  <SelectItem value="ko">韓国語</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>翻訳先の言語</Label>
              <Select defaultValue="ja">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="言語を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>翻訳オプション</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>フォーマットを保持</Label>
              <p className="text-sm text-gray-500">
                元のスライドのフォーマットとレイアウトを維持します
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>専門用語の翻訳</Label>
              <p className="text-sm text-gray-500">
                業界固有の専門用語を適切に翻訳します
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自動校正</Label>
              <p className="text-sm text-gray-500">
                翻訳後のテキストを自動的に校正します
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          設定を保存
        </Button>
      </div>
    </div>
  );
}
