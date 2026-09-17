# English Expressions 120

英会話で使える表現・構文120選を、検索・カテゴリ絞り込み・音声読み上げ付きで引ける静的Webサイトです。

元データは `source/120expressions_text_cleaned.md`（PDFのOCRテキスト）で、そこから構造化した `data/expressions.json` をサイトが読み込みます。
Markdownをそのまま表示しているわけではありません。

## 1. 目的

- 120個の英語表現を一覧で見る
- 英語・日本語のどちらからでも検索する
- カテゴリ（初級 / 中・上級 / Part 1〜3）ごとに絞り込む
- 例文と日本語訳を確認する
- 英文をワンクリックで音声確認する（Web Speech API）
- PC / スマートフォンの両方で使う

ログイン・DB・サーバー・フレームワークは使用していません。HTML / CSS / Vanilla JavaScript のみです。

## 2. ファイル構成

```text
.
├── index.html                 ページ本体
├── styles.css                 スタイル
├── app.js                     データ読み込み・検索・フィルター・読み上げ
├── data/
│   └── expressions.json       構造化した120表現データ（Web用）
├── source/
│   ├── 120expressions.pdf                元のPDF教材（原本・サイトからは未使用）
│   └── 120expressions_text_cleaned.md    元PDFをOCR・目視で構造化したテキスト（サイトからは未使用）
└── README.md
```

## 3. ローカルでの起動

`fetch()` でJSONを読み込むため、`file://` で `index.html` を直接開くとブラウザのCORS制限でデータを読み込めません。必ずローカルサーバー経由で開いてください。

```bash
python3 -m http.server 8000
```

ブラウザで <http://localhost:8000> を開きます。

## 4. GitHub Pages への公開

1. このディレクトリをGitHubリポジトリにpushします（`main` ブランチ）。
2. リポジトリの **Settings → Pages** を開きます。
3. **Source** を `Deploy from a branch`、**Branch** を `main` / `/ (root)` に設定して保存します。
4. 数十秒後に `https://USERNAME.github.io/REPOSITORY/` で公開されます。

参照はすべて相対パス（`./styles.css` / `./app.js` / `./data/expressions.json`）なので、サブディレクトリ配下（Project Pages）でもそのまま動作します。ビルド手順はありません。

## 5. データ構造

`data/expressions.json` は120件のオブジェクトの配列です。

```json
{
  "id": "basic-21",
  "number": 21,
  "category": "basic",
  "categoryLabel": "初級構文",
  "expression": "It takes 時間 to do",
  "meaning": "〜するのに時間がかかる",
  "examples": [
    {
      "english": "It takes about 40 minutes to get there.",
      "japanese": "あそこに着くのに大体 40 分かかる。"
    }
  ],
  "explanation": "",
  "sourcePage": 14
}
```

| フィールド | 内容 |
| --- | --- |
| `id` | `カテゴリ-番号`（例: `basic-21`, `part2-30`） |
| `number` | 教材に印字されている表現番号 |
| `category` | `basic` / `advanced` / `part1` / `part2` / `part3` |
| `categoryLabel` | 表示用ラベル（初級構文 / 中・上級構文 / Part 1〜3） |
| `expression` | 英語表現・構文 |
| `meaning` | 日本語の意味 |
| `examples[]` | `english` / `japanese` のペア |
| `explanation` | 教材の解説（Part 1〜3のみ存在。無い場合は空文字） |
| `sourcePage` | 元PDFのページ番号 |

`expression` / `meaning` / `examples` / `examples[].english` / `examples[].japanese` は120件全件で非空であることを検証済みです（詳細は8章）。`missing` / `note` のような欠落マーカーは使用していません。

カテゴリと件数の対応は以下の通りです。

| category | 表示名 | 教材上の区分 | 件数 |
| --- | --- | --- | --- |
| `basic` | 初級構文 | 重要構文 30選 初級編 | 30 |
| `advanced` | 中・上級構文 | 重要構文 30選 中・上級編 | 30 |
| `part1` | Part 1 | よく使う表現 20選 Part 1 | 20 |
| `part2` | Part 2 | よく使う表現 20選 Part 2 | 20 |
| `part3` | Part 3 | よく使う表現 20選 Part 3 | 20 |
| | | **合計** | **120** |

## 6. 主な機能

- **一覧表示**: 1表現 = 1カード。英語表現 → 英語例文 → 日本語意味 → 日本語訳 の順に視覚的な強弱をつけています。
- **検索**: 英語表現・日本語意味・英語例文・日本語訳・解説を対象にリアルタイム絞り込み。大文字小文字は区別しません。OCR由来の半角スペース（例: `大体 40 分`）があるため、空白を除いた比較も併用しており、`40分` でも `takes` でもヒットします。
- **カテゴリフィルター**: すべて / 初級 / 中・上級 / Part 1 / Part 2 / Part 3。スマートフォンでは横スクロールします。
- **音声読み上げ**: 各例文のスピーカーボタンで英文のみを読み上げます（`window.speechSynthesis`）。外部の音声APIは使用していません。
  - `lang = "en-US"`、利用可能な `en-US` の音声を優先。
  - `getVoices()` が初回に空を返すブラウザ向けに `speechSynthesis.onvoiceschanged` にも対応。
  - 新しい英文の再生前に `speechSynthesis.cancel()` を実行し、再生中の音声を停止します。
  - 再生中の英文のボタンをもう一度押すと停止します。
  - Web Speech API 非対応ブラウザでは、読み上げボタンを表示せず、その旨を画面上部に表示します（サイト自体は通常どおり動作）。
- **読み上げ速度**: 0.75x / 1.0x（デフォルト 1.0x）。以降のすべての読み上げに反映されます。
- **レスポンシブ**: PCは最大幅860pxの1カラム中央配置、スマートフォンは画面幅いっぱい。

## 7. データ復元・修正の経緯

初回構築時はテキストOCR（`source/120expressions_text_cleaned.md`）のみを基に120表現を抽出しましたが、その時点で3表現が完全欠落し、複数箇所で部分的な文字化けが残っていました。そこで元PDF（`source/120expressions.pdf`、全104ページ）をページ画像としてレンダリングし、**104ページ全ページを1ページずつ目視で再確認**した上で、`source/120expressions_text_cleaned.md` を修正 → その修正済みMarkdownを基準に `data/expressions.json` を再構築しました。現在、`missing` フラグや欠落メモは一切残っていません。

### 7-1. ページ全体がOCRで空になっていたため、PDF画像から復元した表現（3件）

| id | 元PDFページ | 復元した内容 |
| --- | --- | --- |
| `advanced-24` | p.38 | `X is like, 文`（文と言った、思った）。例文3件 |
| `advanced-25` | p.38 | `in which case 文`（もしそうなったら文）。例文2件 |
| `part2-30` | p.73 | `in this case`（この場合は）。例文4件・解説文 |

### 7-2. 一部フィールドがOCRで欠落していたため、PDF画像から復元した箇所（7件）

| id | 復元した内容 |
| --- | --- |
| `basic-14` | 例文「He didn't speak English as fluently as I expected.」の日本語訳「期待してたほど彼は英語を流暢に話さなかった。」 |
| `advanced-04` | 例文「What if it rains tomorrow?」の日本語訳「明日、雨降ったらどうする?」 |
| `advanced-26` | 例文「When it comes to studying, consistency is the key.」の日本語訳「勉強に関して言えば、一貫してやり続けることが重要だよ。」 |
| `part2-28` | `come across` の意味「〜に出会う、見つける」 |
| `part3-02` | 例文1の日本語訳「私たちは問題の原因を解明しようとしています。」に加え、OCRで丸ごと欠落していた例文2「I'm in the process of learning English. / 英語学習の過程にあります。」を追加（例文が1件→2件に） |
| `part3-08` | 意味「突然に」、例文1の英文「Everyone started talking about it out of the blue.」、解説の末尾「驚きを表現するのに適しています。」 |
| `part3-13` | 例文「I'd say risk and opportunity are two sides of the same coin.」の日本語訳「リスクとチャンスは表裏一体だと言えます。」 |

### 7-3. 末尾が途切れていた解説を、PDF画像から全文復元した箇所（3件）

| id | 復元した解説の末尾 |
| --- | --- |
| `part1-01` | 「…how が that 節と同じ意味で使われているのが**面白いですね。**」 |
| `part1-19` | 「…動詞をとる時は doing の形を続けましょう**(例:We decided to go to the park instead of staying at home)。**」 |
| `part2-22` | 「…about と比べると若干フォーマルな表現です。**口語でも使える表現です。**」 |

### 7-4. その他、PDF画像との突合で見つかった修正

- `advanced-13`（the more 文 the more 文）: 初回構築時は「The more you listen, the more you learn.」の重複と判断して1件に統合していましたが、PDF上で実際に「The more you listen, The more you learn.」が意図的に2回掲載されていることを確認したため、例文を5件→6件に復元しました。
- Part 3 の解説文に残っていた装飾アイコンのOCR誤認識断片（`CJR`、`CIE`、`Cee`、`DES,`、`ARGO`、`LEASES Meese` など）を、PDF画像で確認した正しい文言に置き換えました（意味を変える修正ではなく、装飾アイコンの誤OCRの除去です）。

### 7-5. 明らかなOCR誤認識として修正した箇所（テキストOCR由来）

- 単語の連結・誤認識: `ldontlike` → `I don't like`、`twassucha` → `It was such a`、`Givemeacall as soon as Voudethere.` → `Give me a call as soon as you get there.`、`9otothe cafe` → `go to the cafe`、`『m` → `I'm`、`Il can't` → `I can't`、`tryind` → `trying`、`taking about this book` → `talking about this book`
- 日本語の誤変換: `必ずしも買いわけではない` → `必ずしも賢いわけではない`、`とても買いと思います` → `とても賢いと思います`、`語繋の点では` → `語彙の点では`、`人前で話せるほと` → `人前で話せるほど`、`なせぜ日本に` → `なぜ日本に`、`高すずぎ` → `高すぎ`、`投資しをたとしたら` → `投資したとしたら`、`もつと効率的` → `もっと効率的`、`ニケヶ国語` → `2 ヶ国語`、`育定しておきたい` → `肯定しておきたい`
- 「〜」が `て` / `と` / `こ` としてOCRされている箇所（`てするのに時間がかかる` など）を `〜` に統一
- 各ページのヘッダー（`ATSU の表現・構文厳選 120 選総集編 0XX`）、`何度も反復しよう!`、`例文` / `解説` の見出し記号（`®@`, `+: fie` など）といった装飾要素由来のOCRノイズは除去

## 8. データ検証結果

`data/expressions.json` は、104ページ全ページをPDF画像と1件ずつ突合した上で以下を確認済みです。

- 総件数: **120件**
- カテゴリ別件数: basic 30 / advanced 30 / part1 20 / part2 20 / part3 20（教材の構成と一致）
- 番号の連続性: basic 1〜30、advanced 1〜30、part1 1〜20、part2 21〜40、part3 1〜20（いずれも欠番・重複なし）
- `id` の重複: なし
- **必須項目の非空チェック**: 全120件について `expression` / `meaning` / `examples` / `examples[].english` / `examples[].japanese` が空でないことを検証済み
- `missing` フラグや欠落メモ（`note`）を持つ項目: **0件**（すべて解消済み）
- 例文の総数: 305件（初回構築時の293件から、PDF画像との突合で見つかった欠落例文12件を復元・追加）
- 解説を持つ表現: 60件（Part 1〜3。重要構文（初級・中上級）には教材上そもそも解説がありません）
- 英文フィールドにOCR由来の未分割語（`ldontlike` のような連結）が残っていないこと
- 日本語フィールドに英字のOCRノイズが残っていないこと（固有名詞 iPhone / YouTube / Zoom / Wi-Fi / Atsueigo / Distinction を除く）
- 同一表現の重複: `It's 形容詞 how 文` のみ2件（`advanced-10` と `part1-01`）。これは教材にも両方掲載されているため、意図的に残しています。
