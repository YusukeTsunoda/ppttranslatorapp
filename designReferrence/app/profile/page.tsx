"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, History, Settings, User, FileText, Bell, Shield, LogOut, Edit, Save, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [isEditing, setIsEditing] = useState(false)
  const [activeHistoryItem, setActiveHistoryItem] = useState<number | null>(null)
  const [notifications, setNotifications] = useState([
    { id: 1, read: false, title: "翻訳完了", message: "四半期報告書_1.pptxの翻訳が完了しました", time: "1時間前" },
    { id: 2, read: true, title: "アカウント確認", message: "メールアドレスの確認が完了しました", time: "2日前" },
  ])

  // スクロールアニメーション
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal")

    const reveal = () => {
      revealElements.forEach((element) => {
        const windowHeight = window.innerHeight
        const elementTop = element.getBoundingClientRect().top
        const elementVisible = 150

        if (elementTop < windowHeight - elementVisible) {
          element.classList.add("active")
        }
      })
    }

    window.addEventListener("scroll", reveal)
    // 初期表示時にも実行
    reveal()

    return () => window.removeEventListener("scroll", reveal)
  }, [])

  const toggleEdit = () => {
    setIsEditing(!isEditing)
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
            <Globe className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
            <span>PPT Translator</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium nav-link">
              ホーム
            </Link>
            <Link href="/translate" className="text-sm font-medium nav-link">
              翻訳
            </Link>
            <Link href="/profile" className="text-sm font-medium nav-link">
              プロフィール
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8 text-center animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
              アカウント管理
            </h1>
            <p className="mt-2 text-gray-500">プロフィール情報の確認と設定変更</p>
          </div>

          <div className="mx-auto max-w-4xl animate-scale-in">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger
                  value="profile"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
                >
                  <User className="h-4 w-4" />
                  プロフィール
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
                >
                  <History className="h-4 w-4" />
                  翻訳履歴
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
                >
                  <Bell className="h-4 w-4" />
                  通知
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                  設定
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6 reveal">
                <Card className="hover-glow dark:border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>プロフィール情報</CardTitle>
                      <CardDescription>アカウント情報を確認・編集できます</CardDescription>
                    </div>
                    <Button
                      variant={isEditing ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleEdit}
                      className="transition-all duration-200"
                    >
                      {isEditing ? (
                        <>
                          <X className="mr-2 h-4 w-4" /> 編集キャンセル
                        </>
                      ) : (
                        <>
                          <Edit className="mr-2 h-4 w-4" /> 編集する
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-x-4 sm:space-y-0">
                      <div className="relative group">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 border-2 border-primary/20 transition-all duration-300 group-hover:border-primary dark:from-primary/20 dark:to-blue-500/20">
                          <User className="h-12 w-12 text-primary transition-all duration-300 group-hover:scale-110" />
                        </div>
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-white dark:bg-gray-800 shadow-md hover:bg-primary hover:text-white transition-all duration-200"
                          >
                            <span className="sr-only">アバターを変更</span>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="w-full space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="first-name">姓</Label>
                            <Input
                              id="first-name"
                              defaultValue="山田"
                              readOnly={!isEditing}
                              className={!isEditing ? "bg-gray-50 dark:bg-gray-800" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last-name">名</Label>
                            <Input
                              id="last-name"
                              defaultValue="太郎"
                              readOnly={!isEditing}
                              className={!isEditing ? "bg-gray-50 dark:bg-gray-800" : ""}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">メールアドレス</Label>
                          <Input
                            id="email"
                            type="email"
                            defaultValue="yamada@example.com"
                            readOnly={!isEditing}
                            className={!isEditing ? "bg-gray-50 dark:bg-gray-800" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">会社名</Label>
                          <Input
                            id="company"
                            defaultValue="株式会社サンプル"
                            readOnly={!isEditing}
                            className={!isEditing ? "bg-gray-50 dark:bg-gray-800" : ""}
                          />
                        </div>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex justify-end">
                        <Button className="gap-2 transition-all duration-300 hover:scale-105">
                          <Save className="h-4 w-4" />
                          変更を保存
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6 hover-glow dark:border-gray-700 reveal">
                  <CardHeader>
                    <CardTitle>アカウント統計</CardTitle>
                    <CardDescription>あなたの翻訳活動の概要</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border dark:border-gray-700 p-4 text-center hover-lift">
                        <div className="text-3xl font-bold text-primary">12</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">翻訳済みファイル</div>
                      </div>
                      <div className="rounded-lg border dark:border-gray-700 p-4 text-center hover-lift">
                        <div className="text-3xl font-bold text-primary">243</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">翻訳済みスライド</div>
                      </div>
                      <div className="rounded-lg border dark:border-gray-700 p-4 text-center hover-lift">
                        <div className="text-3xl font-bold text-primary">3</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">使用言語数</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6 reveal">
                <Card className="hover-glow dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>翻訳履歴</CardTitle>
                    <CardDescription>過去の翻訳履歴を確認できます</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-lg border dark:border-gray-700 p-4 transition-all duration-200 hover-lift ${
                            activeHistoryItem === i ? "border-primary bg-primary/5 dark:bg-primary/10" : ""
                          }`}
                          onClick={() => setActiveHistoryItem(activeHistoryItem === i ? null : i)}
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className={`rounded-md p-2 ${
                                activeHistoryItem === i ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"
                              }`}
                            >
                              <FileText
                                className={`h-6 w-6 ${activeHistoryItem === i ? "text-primary" : "text-gray-500 dark:text-gray-400"}`}
                              />
                            </div>
                            <div>
                              <h4 className="font-medium">四半期報告書_{i}.pptx</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">日本語 → 英語</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">2025/0{i}/01</p>
                            <Button variant="ghost" size="sm" className="mt-1 transition-colors hover:text-primary">
                              再ダウンロード
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {activeHistoryItem && (
                      <div className="mt-6 rounded-lg border dark:border-gray-700 p-4 animate-scale-in">
                        <h4 className="font-medium mb-2">翻訳詳細</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">ファイル名</p>
                            <p>四半期報告書_{activeHistoryItem}.pptx</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">翻訳日時</p>
                            <p>2025/0{activeHistoryItem}/01 14:30</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">元の言語</p>
                            <p>日本語</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">翻訳先言語</p>
                            <p>英語</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">スライド数</p>
                            <p>24枚</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">処理時間</p>
                            <p>1分42秒</p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            詳細を表示
                          </Button>
                          <Button size="sm">再ダウンロード</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6 reveal">
                <Card className="hover-glow dark:border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>通知</CardTitle>
                      <CardDescription>システムからの通知を確認できます</CardDescription>
                    </div>
                    {unreadCount > 0 && (
                      <Button variant="outline" size="sm" onClick={markAllAsRead}>
                        すべて既読にする
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`rounded-lg border dark:border-gray-700 p-4 transition-all duration-200 hover-lift ${
                              !notification.read ? "border-l-4 border-l-primary" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{notification.title}</h4>
                                  {!notification.read && (
                                    <Badge variant="primary" className="h-5 px-1.5">
                                      新着
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{notification.time}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                          <p>通知はありません</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6 reveal">
                <Card className="hover-glow dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>アカウント設定</CardTitle>
                    <CardDescription>アカウントの設定を変更できます</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="language">インターフェース言語</Label>
                      <Select defaultValue="ja">
                        <SelectTrigger id="language" className="transition-all duration-200 hover:border-primary">
                          <SelectValue placeholder="言語を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="en">英語</SelectItem>
                          <SelectItem value="zh">中国語</SelectItem>
                          <SelectItem value="ko">韓国語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-source">デフォルト元言語</Label>
                      <Select defaultValue="ja">
                        <SelectTrigger id="default-source" className="transition-all duration-200 hover:border-primary">
                          <SelectValue placeholder="言語を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="en">英語</SelectItem>
                          <SelectItem value="zh">中国語</SelectItem>
                          <SelectItem value="ko">韓国語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-target">デフォルト翻訳先言語</Label>
                      <Select defaultValue="en">
                        <SelectTrigger id="default-target" className="transition-all duration-200 hover:border-primary">
                          <SelectValue placeholder="言語を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="en">英語</SelectItem>
                          <SelectItem value="zh">中国語</SelectItem>
                          <SelectItem value="ko">韓国語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                      <h3 className="font-medium">通知設定</h3>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-notifications">メール通知</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">翻訳完了時にメールで通知する</p>
                        </div>
                        <Switch id="email-notifications" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="browser-notifications">ブラウザ通知</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ブラウザ上で通知を表示する</p>
                        </div>
                        <Switch id="browser-notifications" defaultChecked />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                      <h3 className="font-medium">セキュリティ</h3>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>二段階認証</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">アカウントのセキュリティを強化する</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Shield className="h-4 w-4" />
                          設定する
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t dark:border-gray-700">
                      <Button
                        variant="outline"
                        className="gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        ログアウト
                      </Button>
                      <Button className="gap-2 transition-all duration-300 hover:scale-105">
                        <Save className="h-4 w-4" />
                        設定を保存
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <footer className="border-t py-6 md:py-8 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
              ホーム
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/translate" className="text-gray-500 hover:text-gray-900 transition-colors">
              翻訳
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/profile" className="text-gray-500 hover:text-gray-900 transition-colors">
              プロフィール
            </Link>
          </div>
          <div className="text-center text-sm text-gray-500">© 2025 PPT Translator. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
