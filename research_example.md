# 研究用家系圖：語法擴充與範例

這份文件說明為研究需求新增的 FTDL 語法，並附上一組可以直接執行的範例：一段自然語言描述（給 AI 的 prompt）與對應的 FTDL。

圖的風格和研究圖表一致：

- 使用台北黑體。
- 主色為 `#F3E6D2` `#DDD7D1` `#E8C18F` `#D9954D` `#C3A087` `#AFA69D`。
- 方塊與線條不加外框，文字用深棕色 `#3B2F27`。

---

## 一、研究用的視覺編碼

| 想呈現的資訊 | FTDL 寫法 | 畫面上的呈現 |
|---|---|---|
| 個人身心狀態 | `person { wellbeing: 0–1; }` | 節點顏色從灰（低）漸變到橘（高） |
| 婚姻品質 | `relationship { quality: 0–1; }` | 夫妻橫線越粗表示品質越好 |
| 同居 | `relationship { status: cohabiting; }` | 狀態記錄在關係中 |
| 感情的方向與深厚（任何兩人） | `bond { from: A; to: B; closeness: 0–1; }` | 由 A 指向 B 的弧形箭頭：箭頭＝感情的方向，粗細＝感情的深厚；所有感情線同一色，不以顏色區分身分 |
| 關係的性質 | `bond { style: ...; }` | `dashed` 疏遠或脈絡關係、`dotted` 弱連結、`zigzag` 衝突、`cutoff` 斷絕往來、`double` 非常親密 |
| 不需要方向的關係 | `bond { arrow: false; }` | 只畫線，不畫箭頭 |
| 兩人關係的強弱與性質 | `tie { from: A; to: B; line: thick\|thin\|dashed; label: 強烈; }` | A 指向 B 的單向弧線箭頭，彎得比 `bond` 大。粗線＝強烈、細線＝較弱、虛線＝破裂或不穩定；曲線外側標示文字（如「強烈」「破裂」「依賴」）。兩人互相標記時，兩條弧線並排在兩側 |
| 家庭類型 | `metadata { family_type: 名稱; background: 顏色; }` | 標題下方顯示類型名稱，整張圖加上淡色的圓角底色 |
| 圖例 | `metadata { legend: true\|false; }` | 依圖中實際用到的元素自動產生，預設開啟 |
| 指定顏色 | `fill:`、`color:`、`background:` | 可用色名 `sand` `mist` `apricot` `amber` `clay` `stone`，或 `#RRGGBB` |

有 `bond` 或 `tie` 時，人物之間的間距會自動加寬，標籤也會自動避開彼此與節點。

一般家系圖原有的元素也都保留：

- 案主（先證者）：節點外圍一圈深棕色外框。
- 慢性病：右上角四分之一。
- 身心障礙：右半邊。
- 已過世：X 記號並降低飽和度。
- 離婚：雙斜線。
- 分居：單斜線。
- 非婚伴侶：虛線。
- 婚姻日期。

## 二、範例 Prompt（給 AI）

> 請畫一張研究用的數位家系圖，標題是「數位家系圖：家庭 A」，家庭類型是 2018 年的「緊密互動型」，底色用 sand。
>
> 父親 A 在 1962 年出生，身心狀態偏差。母親 A 在 1965 年出生，是另一位家長，沒有身心資料。兩人已婚，婚姻品質中等。
>
> 他們有兩個孩子：子 A1 是 1994 年出生的女兒，身心狀態很差，是這張圖的先證者；子 A2 是 1997 年出生的兒子，身心狀態中上，有慢性病。
>
> 父親覺得和 A1 普通親近，A1 覺得和父親比較疏離；父親覺得和 A2 很親近，A2 覺得和父親偏疏離。母親和兩個孩子的關係只當作脈絡，用虛線、不畫箭頭。兩個孩子之間有衝突。

## 三、範例 FTDL

```ftdl
metadata {
    title: 數位家系圖：家庭 A;
    family_type: 2018 緊密互動型;
    background: sand;
    date: 2018;
}

person { id: father_a; name: 父 A; gender: male; birth: 1962; wellbeing: 0.35; }
person { id: mother_a; name: 母 A; gender: female; birth: 1965; }
person { id: child_a1; name: 子 A1; gender: female; birth: 1994; wellbeing: 0.1; proband: true; }
person { id: child_a2; name: 子 A2; gender: male; birth: 1997; wellbeing: 0.6; chronic: true; }

relationship {
    partners: [father_a, mother_a];
    type: marriage;
    status: married;
    quality: 0.55;
    children: [child_a1, child_a2];
}

bond { from: father_a; to: child_a1; closeness: 0.5; }
bond { from: child_a1; to: father_a; closeness: 0.35; }
bond { from: father_a; to: child_a2; closeness: 0.7; }
bond { from: child_a2; to: father_a; closeness: 0.3; }
bond { from: mother_a; to: child_a1; style: dashed; arrow: false; }
bond { from: mother_a; to: child_a2; style: dashed; arrow: false; }
bond { from: child_a1; to: child_a2; style: zigzag; arrow: false; label: 衝突; }
```

## 四、預期結果

- 整張圖有淡米色的圓角底色，標題下方顯示「2018 緊密互動型」。
- 父 A 是方形，灰中帶米（0.35）；子 A1 是深灰色圓形（0.1），外圍有案主的深棕色外框；子 A2 是米橘色方形（0.6），右上角標示慢性病；母 A 沒有身心資料，維持預設色。
- 夫妻橫線為中等粗細（品質 0.55）。
- 感情線一律同一色：箭頭指向感情的對象，粗細反映感情的深厚。同一對人的兩條線各自往外彎，不會重疊，兩人之間最多一去一回兩條線。
- 母親到兩個孩子是虛線、沒有箭頭，表示只作脈絡。
- 兩個孩子之間是灰色鋸齒線，標示「衝突」。
- 圖下方的圖例只列出這張圖用到的元素。
- 按畫布左下角的「匯出 PNG」可以得到透明背景、3 倍解析度的圖片，標題也會一起輸出。

## 五、數值建議

AI 會把文字描述換成 0–1 的數值，人工撰寫時也可以參考：

| 描述 | 數值 |
|---|---|
| 很差／很低 | 0.1 |
| 差／偏低 | 0.3 |
| 普通／中等 | 0.5 |
| 好／偏高 | 0.7 |
| 很好／很高 | 0.9 |

如果有實際的量表分數，建議先標準化到 0–1 再填入，例如 `(分數 − 最低分) ÷ (最高分 − 最低分)`。這樣不同家庭的圖可以直接比較。
