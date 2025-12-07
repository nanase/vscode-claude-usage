# vscode-claude-usage - 要件定義

## 概要
VSCodeのステータスバーにClaude APIの使用量を表示する拡張機能

## 機能要件

### 主要機能
- ステータスバー（下部）にClaudeの使用量を表示
- 定期的（5分間隔）に使用量を取得・更新
- セッションキーの安全な保存と管理

### 表示内容
- 形式: `Claude: {5時間使用率}% / {週間使用率}%`
- 例: `Claude: 3% / 31%`

### セキュリティ要件
- セッションキーはVSCode SecretStorage APIで暗号化保存
- セッションキー入力はコマンドパレット経由
- 外部へのデータ送信なし（Claude公式API以外）
- セッションキーの平文保存禁止

## 技術要件

### 開発環境
- **言語**: TypeScript
- **ランタイム**: Node.js v24以上
- **エディタ**: Visual Studio Code
- **パッケージマネージャ**: Yarn v4.11

### 必要なパッケージ
- `vscode` - VSCode拡張機能API（型定義）
- `@types/node` - Node.js型定義
- `@types/vscode` - VSCode型定義
- `typescript` - TypeScriptコンパイラ
- `@biomejs/biome` - リンタ・フォーマッタ
- `vitest` - テストスイート
- `husky` - コミット時のリント・フォーマット確認、ビルド・ステージしわすれ防止

### 開発ツール
- `@vscode/vsce` - 拡張機能パッケージングツール
- `yo generator-code` - 拡張機能雛形生成（推奨）

### API仕様
- **エンドポイント**: `https://claude.ai/api/organizations/{org_id}/usage` （非公開API）
- **認証**: Cookieヘッダーにセッションキーを含める
- **取得間隔**: 5分に1回（何分に1回にするかは設定で変更できる）
- **注意**: 非公開APIのため利用規約違反の可能性あり（承知済み）

## ファイル構成
```
extension/
├── package.json          # 拡張機能マニフェスト
├── src/
│   └── extension.ts      # メインロジック
├── tsconfig.json         # TypeScript設定
└── .vscodeignore         # パッケージ除外設定
```

このほか、単体テストを用意する。

## 開発フロー
1. `yo code`で雛形生成 または 手動でプロジェクト作成
2. `extension.ts`に実装
3. F5キーでExtension Development Hostを起動してデバッグ
4. `vsce package`でVSIXファイル生成

## 制約事項
- Claude APIは非公開のため、仕様変更のリスクあり
- セッションキーの有効期限管理は未対応（将来的に必要かも）
- エラーハンドリング（ネットワークエラー、認証失敗等）は実装時に考慮

## 懸念点（解決すべきこと）

- VSCodeを複数ウィンドウ開いてもAPIへのアクセス回数は1回にしたい
  - 複数のウィンドウで個別にアクセスする必要がない
  - アクセス1つに制限できる方法・同じことができる方法を使う

## 参考

### APIのレスポンス例

```json
{
  "five_hour": {
    "utilization": 3.0,
    "resets_at": "2025-12-07T16:59:59.563479+00:00"
  },
  "seven_day": {
    "utilization": 31.0,
    "resets_at": "2025-12-09T00:59:59.563498+00:00"
  },
  "seven_day_oauth_apps": null,
  "seven_day_opus": null,
  "seven_day_sonnet": null,
  "iguana_necktie": null,
  "extra_usage": null
}
```
