# 二代家庭範例：長描述與 FTDL

這份檔案提供一組測試資料：

1. **長描述**：模擬使用者在 AI 輸入框中，用一般文字描述的家庭狀況。
2. **FTDL 語法**：上面那段描述應該轉換出來的 FTDL，可以直接貼進編輯器執行，畫出一張二代家系圖。

這個範例刻意涵蓋多種情況，包括再婚、離婚、前段婚姻的子女、已過世、先證者、慢性病、身心障礙，以及關係的起訖日期，方便同時測試 AI 轉換與繪圖結果。

---

## 一、長描述（AI 輸入文字）

> 我叫王小傑，1996 年 4 月 12 日出生，這張圖以我為主。
>
> 我爸爸叫王大明，1968 年 3 月 5 日出生，目前在一家建設公司當工程師。我媽媽叫林美華，1970 年 8 月 21 日出生，是國小老師。爸媽在 1994 年結婚，到現在都還在一起。我媽媽有第二型糖尿病，已經控制好幾年了。
>
> 爸爸在認識我媽媽之前，曾經和陳淑芬結過婚。陳淑芬 1969 年出生，他們 1990 年結婚、1993 年離婚。他們有一個女兒，也就是我同父異母的姊姊王怡君，1991 年 11 月出生，現在住在台中，已經是護理師了。陳淑芬阿姨很可惜在 2018 年因病過世。
>
> 爸爸和媽媽總共生了三個小孩：老大是我；老二是妹妹王小雯，1999 年 7 月 3 日出生，目前在讀研究所；老三是弟弟王小宇，2004 年 1 月 18 日出生。小宇從小有聽力障礙，現在戴人工電子耳，正在讀大學。
>
> 請幫我把爸爸、媽媽、爸爸的前妻，還有我們四個兄弟姊妹都畫出來。圖的標題可以叫「王家家系圖」，作者寫王小傑，日期寫 2026 年 10 月。

---

## 二、FTDL 語法

```ftdl
metadata {
    title: 王家家系圖;
    author: 王小傑;
    date: 2026-10;
    color: true;
}

person {
    id: wang_daming;
    name: 王大明;
    gender: male;
    birth: 1968-03-05;
    note: 工程師;
}

person {
    id: lin_meihua;
    name: 林美華;
    gender: female;
    birth: 1970-08-21;
    chronic: true;
    note: 國小老師，第二型糖尿病;
}

person {
    id: chen_shufen;
    name: 陳淑芬;
    gender: female;
    birth: 1969;
    death: 2018;
    note: 因病過世;
}

person {
    id: wang_yijun;
    name: 王怡君;
    gender: female;
    birth: 1991-11;
    note: 護理師，住台中;
}

person {
    id: wang_xiaojie;
    name: 王小傑;
    gender: male;
    birth: 1996-04-12;
    proband: true;
}

person {
    id: wang_xiaowen;
    name: 王小雯;
    gender: female;
    birth: 1999-07-03;
    note: 研究生;
}

person {
    id: wang_xiaoyu;
    name: 王小宇;
    gender: male;
    birth: 2004-01-18;
    Disability: true;
    note: 聽力障礙，配戴人工電子耳;
}

relationship {
    partners: [wang_daming, chen_shufen];
    type: marriage;
    status: divorced;
    start_date: 1990;
    end_date: 1993;
    children: [wang_yijun];
}

relationship {
    partners: [wang_daming, lin_meihua];
    type: marriage;
    status: married;
    start_date: 1994;
    children: [wang_xiaojie, wang_xiaowen, wang_xiaoyu];
}
```

---

## 三、預期的圖形結果

| 項目 | 畫面上的呈現 |
|---|---|
| 世代 | 第一代是王大明、林美華、陳淑芬；第二代是四個子女 |
| 王大明（男） | 方形 |
| 林美華、陳淑芬、王怡君、王小雯（女） | 圓形 |
| 王小傑（案主／先證者） | 節點外圍一圈深棕色外框，名字加粗 |
| 林美華（慢性病） | 圖形右上角四分之一加深 |
| 王小宇（身心障礙） | 圖形右半邊加深 |
| 陳淑芬（已過世） | 圖形降低飽和度，並加上 X 記號 |
| 王大明與陳淑芬 | 王大明左側的婚姻線，線上有雙斜線離婚記號，並標示「1990 - 1993」 |
| 王大明與林美華 | 王大明右側的實線婚姻線，標示「1994」 |
| 子女 | 王怡君連到前段婚姻線；三個弟妹透過手足連接線，一起連到 1994 年那段婚姻 |
| 標題區 | 顯示「王家家系圖」、作者與日期，並以彩色模式繪製；副標題會由樹系選擇器自動帶入根節點夫妻的名字 |

## 四、撰寫注意事項

- `id` 只能使用英文字母、數字和底線，而且不能重複。
- 日期可以寫成 `YYYY`、`YYYY-MM` 或 `YYYY-MM-DD`。
- `Disability` 的開頭是大寫 D，這是目前語法的規定。
- 屬性值裡不能出現半形分號 `;`，因為分號是屬性的結束符號。中文全形標點（例如「，」）可以使用。
