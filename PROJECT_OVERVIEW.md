# DLFM：研究用家系圖生成工具（FTDL）

## 這個專案是什麼

這是一個在瀏覽器中執行的家系圖工具。用 **FTDL（Family Tree Description Language）** 描述家庭成員與關係，系統就會自動排版，畫出家系圖。

除了一般家系圖，也支援研究需要的資訊，例如：

- 慢性病、身心障礙
- 婚姻品質
- 有方向的感情線（任何兩人之間，箭頭＝方向、粗細＝深厚）
- 衝突、疏遠、斷絕往來等關係性質
- 家庭類型

圖的風格和研究圖表一致：台北黑體、六色研究色盤，方塊與線條不加外框。

不想自己寫 FTDL 時，可以直接在畫面下方用一般文字描述家庭。系統會透過 **Google AI Studio（Gemini API）** 產生 FTDL，並直接畫成圖，不需要註冊帳號。

## 使用方式

1. 用瀏覽器打開 `index.html`。也可以在專案資料夾執行 `python3 -m http.server`，再打開 `http://localhost:8000`。匯出圖片時如果無法嵌入台北黑體，會自動改用系統字型。
2. 有兩種輸入方式：
   - **用文字描述**：在下方輸入框描述家庭，按 Enter。第一次使用會要求輸入 Google AI Studio 的 API 金鑰（到 https://aistudio.google.com/apikey 免費建立），金鑰只存在你的瀏覽器裡。
   - **直接寫 FTDL**：切到「編輯」頁撰寫，再按「執行」。
3. 在「畫布」頁可以縮放、拖曳畫布，滑鼠移到人物上會顯示詳細資料。
4. 按左下角的「匯出 PNG／SVG」下載圖片（透明背景，3 倍解析度）。

## 工作流程

```
文字描述 ──▶ Gemini API ──▶ FTDL ──▶ 語法驗證 ──（有錯就自動請模型修正一次）
                                         │
直接撰寫 FTDL ───────────────────────────┘
                                         ▼
               解析 → 樹系辨識 → 世代計算 → 排版 → 繪製人物與線條
                                         ▼
                       研究層：婚姻品質、親密箭頭、關係標記、家庭類型底色、圖例
                                         ▼
                                    匯出 PNG／SVG
```

## FTDL 一覽

| 區塊 | 用途 | 主要屬性 |
|---|---|---|
| `metadata` | 整張圖的資訊 | `title` `author` `date` `color` `family_type` `background` `legend` |
| `person` | 一個人 | `id` `name` `gender` `birth` `death` `proband` `chronic` `Disability` `fill` `note` |
| `relationship` | 伴侶關係與子女 | `partners` `type` `status` `start_date` `end_date` `quality` `children` |
| `bond` | 有方向的關係線 | `from` `to` `closeness` `style` `color` `arrow` `label` |
| `tie` | 關係強弱標記（單向弧線＋文字） | `from` `to` `line`（thick／thin／dashed） `label` `color` |

研究擴充的完整說明與範例見 [research_example.md](research_example.md)；依四種家庭類型（GNN 分群）撰寫的故事與家系圖見 [family_type_stories.md](family_type_stories.md)，預先匯出的圖在 [examples/](examples/)；一般家庭範例見 [two_generation_example.md](two_generation_example.md)。

## 檔案說明

| 檔案 | 內容 |
|---|---|
| `index.html` | 主頁面 |
| `config.js` | Gemini API 設定（預設模型、可選的共用金鑰、自動修正次數） |
| `ai.js`／`ai.css` | 文字轉 FTDL：呼叫 Gemini、驗證、自動修正、API 設定視窗 |
| `grammar.js` | FTDL 語法規則、即時驗證、自動補全 |
| `person.js` | 人物符號、縮放與拖曳、提示框 |
| `relationship.js` | 世代計算、排版、婚姻與親子線 |
| `research.js` | 研究層：色盤、`bond` 箭頭、`tie` 關係標記、標籤避讓、家庭類型底色、圖例、匯出 |
| `treeSelector.js` | 辨識並切換多棵不相連的家族樹 |
| `metadata.js` | 標題區與灰階模式 |
| `theme.css` | 研究配色主題（最後載入，覆蓋其他樣式） |
| `fonts/` | 台北黑體（Taipei Sans TC Beta，SIL OFL 1.1） |

## 關於 API 金鑰

前端直接呼叫 Gemini API 很方便，但金鑰會出現在瀏覽器的網路請求裡。所以：

- 平常讓每位使用者輸入自己的金鑰，金鑰只存在他自己的瀏覽器。
- 如果要讓試用者免輸入就能用，可以在 `config.js` 填入共用金鑰。但任何打開網頁的人都看得到它，只適合本機或小範圍試用。
- 公開部署時，應改由後端代理呼叫 API。
- 家系圖常包含健康資訊，使用前請確認 Google 的資料使用政策符合研究倫理要求。
