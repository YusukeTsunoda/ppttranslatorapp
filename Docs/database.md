# Database Documentation

## Overview
- PostgreSQLを使用
- PrismaをORMとして採用

## Database Schema
- User: ユーザー情報管理
- Subscription: サブスクリプション状態管理
- Product: 製品情報管理
- Price: 価格情報管理

## Prisma Setup
- `schema.prisma`でデータモデルを定義
- マイグレーション管理
- シードデータの設定

## Connection
- 環境変数`DATABASE_URL`で接続設定
- 開発/本番環境の分離