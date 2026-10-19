# 四種家庭類型的故事與家系圖

這份檔案收錄四個家庭故事，各代表 GNN 家庭類型分群中的一型，並附上可以直接執行的 FTDL。

- **來源**：故事原文在研究資料夾的 `submission/四個家庭故事.md`，每個故事都從該群的代表家戶生成，代表家戶的選法也寫在那份檔案裡。
- **人物**：姓名為虛構；性別、年齡、教育、工作、同住與親疏方向來自代表家戶。
- **數值**：FTDL 中的 `wellbeing`、`quality`、`closeness` 由代表家戶的標準化分數換算（0.5 + 0.3 × z）。另一位家長在資料中沒有身心分數，所以不填。

使用方式：

- **直接看圖**：切到「編輯」頁，貼上 FTDL，按「執行」。
- **測試 AI**：把「故事」整段貼進下方輸入框，按 Enter；AI 會從敘事中自己歸納人物、出生年與關係標記。

預先匯出的圖在 [examples/](examples/)。

---

## 一、緊密互動型｜橘橘

### 故事

> 2022 年，32 歲的林佳穎（大家都叫她橘橘）還和爸媽、哥哥住在同一個屋簷下。爸爸林國雄 59 歲，國中畢業；媽媽陳秀琴 55 歲，也是國中畢業，當了一輩子的家庭主婦。哥哥林建宏 33 歲，大學畢業後一直在公司上班，和橘橘一樣還沒結婚。橘橘大學畢業工作了幾年，今年剛辭職，白天在家投履歷、上線上課，準備轉換跑道。
>
> 秀琴說，家裡最熱鬧的時間是晚上七點。建宏下班回來，四個人圍著飯桌輪流講今天發生的事：誰面試順不順利、誰被主管念，電視開著也沒人在看。
>
> 秀琴最放不下的是女兒。她不太懂橘橘的工作，但每次橘橘面試回來，她都會先問一句「有沒有吃飯」，再陪女兒把面試官的問題一題一題講完，一聊就是一個晚上。橘橘也離不開媽媽，遇到什麼事第一個想到的就是她，連要不要接哪個工作，都要先問過媽媽。對兒子，秀琴則是默默照顧：幫他準備便當、提醒他早點睡，母子之間什麼都聊，就是不太說心事。
>
> 這個家從 2018 年到 2024 年一直都是這樣，天天見面，你帶動我、我帶動你。只是秀琴偶爾會想：「如果有一天他們都搬出去了，這個家會不會太安靜？」

### FTDL

```ftdl
metadata {
    title: 橘橘的家;
    family_type: 緊密互動型;
    background: amber;
    date: 2022;
}

person { id: guoxiong; name: 林國雄; gender: male; birth: 1963; note: 國中畢業; }
person { id: xiuqin; name: 陳秀琴; gender: female; birth: 1967; wellbeing: 0.64; note: 家庭主婦; }
person { id: jianhong; name: 林建宏; gender: male; birth: 1989; wellbeing: 0.57; note: 上班族，同住; }
person { id: juju; name: 橘橘; gender: female; birth: 1990; wellbeing: 0.48; proband: true; note: 林佳穎，準備轉職，同住; }

relationship {
    partners: [guoxiong, xiuqin];
    type: marriage;
    status: married;
    quality: 0.43;
    children: [jianhong, juju];
}

bond { from: xiuqin; to: juju; closeness: 0.66; }
bond { from: juju; to: xiuqin; closeness: 0.7; }
bond { from: xiuqin; to: jianhong; closeness: 0.43; }
bond { from: jianhong; to: xiuqin; closeness: 0.52; }

tie { from: xiuqin; to: juju; line: thick; label: 強烈; }
tie { from: juju; to: xiuqin; line: thick; label: 依賴; }
tie { from: xiuqin; to: jianhong; line: thin; label: 照顧; }
```

---

## 二、心近身遠型｜小虎

### 故事

> 2018 年，41 歲的黃雅婷是三個孩子的媽媽。她專科畢業，年紀很輕就生了老大，這些年一直在家照顧孩子；先生吳志明 39 歲，在外面上班。家裡最小的兒子還在讀國中，另外兩個大孩子都已經不住在家裡了。
>
> 24 歲的大兒子吳子豪剛從大學畢業，還在找工作，在離家半小時車程的地方租了一間小套房，說要「自己試試看」。21 歲的女兒吳詩涵，小名小虎，考上了外縣市的大學，一邊念書一邊在咖啡店打工，學校離家要一到兩個小時，一個月才回來一次。
>
> 雖然很少見面，這個家的心很近。雅婷每天都掛念著女兒，怕她吃不好、怕她太累。小虎則是什麼都想跟媽媽說，每天晚上傳一長串訊息，從被教授點名、打工遇到奧客，到暗戀的學長，一件都不漏。對兒子，雅婷總是放心不下，知道他找工作不順，卻不知道該怎麼開口；子豪回訊息常常只有「嗯」「好」，不順的事從來不提，報喜不報憂。
>
> 四年後，小虎畢業後工作不順，有一段時間身心狀態跌到谷底，那兩年這個家也跟著低落；到了 2024 年，才又慢慢回到原本的樣子。

### FTDL

```ftdl
metadata {
    title: 小虎的家;
    family_type: 心近身遠型;
    background: apricot;
    date: 2018;
}

person { id: yating; name: 黃雅婷; gender: female; birth: 1977; wellbeing: 0.61; note: 家庭主婦; }
person { id: zhiming; name: 吳志明; gender: male; birth: 1979; note: 上班族; }
person { id: zihao; name: 吳子豪; gender: male; birth: 1994; wellbeing: 0.81; note: 剛畢業找工作，半小時車程; }
person { id: xiaohu; name: 小虎; gender: female; birth: 1997; wellbeing: 0.4; proband: true; note: 吳詩涵，大學生，一到兩小時車程; }
person { id: youngest; name: 老么; gender: male; birth: 2005; note: 國中，同住; }

relationship {
    partners: [yating, zhiming];
    type: marriage;
    status: married;
    quality: 0.63;
    children: [zihao, xiaohu, youngest];
}

bond { from: yating; to: xiaohu; closeness: 0.77; }
bond { from: xiaohu; to: yating; closeness: 0.78; }
bond { from: yating; to: zihao; closeness: 0.77; }
bond { from: zihao; to: yating; closeness: 0.46; }

tie { from: yating; to: xiaohu; line: thin; label: 牽掛; }
tie { from: xiaohu; to: yating; line: thick; label: 什麼都說; }
tie { from: yating; to: zihao; line: thin; label: 放心不下; }
tie { from: zihao; to: yating; line: dashed; label: 報喜不報憂; }
```

---

## 三、各自安好型｜棉棉

### 故事

> 2020 年，67 歲的張文德已經退休三年。他高中畢業，在公司做了一輩子，退休後每天早上去公園走路，下午在家種菜，身體和心情都不錯，和六十多歲的太太李玉蘭感情也一直很穩定。
>
> 大女兒張雅雯今年 32 歲，大家都叫她棉棉。她念到研究所，在外縣市的研究單位當研究員，還沒結婚，住的地方離家要兩個多小時車程。棉棉工作一忙，一兩個月才打一通電話，一年回家三次；她說自己過得很好，爸媽也從不催她。29 歲的兒子張家豪大學畢業後在附近上班，也還沒結婚，一直住在家裡。
>
> 最有意思的是家豪：他天天和爸媽見面，卻是全家和爸爸最不親的人，早上出門、晚上回房，父子倆在同一個屋簷下各過各的，同住卻不同心。棉棉和爸爸也不黏，習慣各自獨立地過日子。可是棉棉升上主管那天，文德難得在電話裡多聊了半小時，掛電話前說：「我們以你為榮。」說這句話時，他是真的很驕傲。
>
> 張家在 2018 年還常常聚在一起，從 2020 年開始，就成了各自安好的一家人：孩子大了，各自有了自己的生活。

### FTDL

```ftdl
metadata {
    title: 棉棉的家;
    family_type: 各自安好型;
    background: clay;
    date: 2020;
}

person { id: wende; name: 張文德; gender: male; birth: 1953; wellbeing: 0.75; note: 已退休; }
person { id: yulan; name: 李玉蘭; gender: female; birth: 1956; }
person { id: mianmian; name: 棉棉; gender: female; birth: 1988; wellbeing: 0.66; proband: true; note: 張雅雯，研究員，外縣市; }
person { id: jiahao; name: 張家豪; gender: male; birth: 1991; wellbeing: 0.73; note: 上班族，同住; }

relationship {
    partners: [wende, yulan];
    type: marriage;
    status: married;
    quality: 0.62;
    children: [mianmian, jiahao];
}

bond { from: wende; to: mianmian; closeness: 0.47; }
bond { from: mianmian; to: wende; closeness: 0.34; }
bond { from: wende; to: jiahao; closeness: 0.47; }
bond { from: jiahao; to: wende; closeness: 0.13; }

tie { from: wende; to: mianmian; line: thick; label: 以她為榮; }
tie { from: mianmian; to: wende; line: thin; label: 各自獨立; }
tie { from: jiahao; to: wende; line: dashed; label: 同住不同心; }
```

---

## 四、身心共振型｜墨墨

### 故事

> 2022 年，王家四個人都住在一起，但家裡很安靜。爸爸王振福 54 歲，高中畢業，在工廠上班，這兩年身體和心情都不太好；媽媽蔡美玲 53 歲，國中畢業。夫妻倆結婚快三十年，最近常常為了小事吵架，關係越來越緊繃。
>
> 27 歲的女兒王怡君，小名墨墨，大學畢業後在一家公司做行政，常常加班到晚上九點，回家吃完飯就關進房間，假日睡到中午。她說自己「不是不開心，只是很累」，整個人的狀態很差。25 歲的弟弟王柏翰剛從研究所畢業，開始上班，兩個人都還沒結婚，也都住在家裡。
>
> 這個家的人其實不常談心。振福和兩個孩子都不算親，和柏翰更是疏離，父子倆一天講不到三句話。可是墨墨累垮的那幾個月，美玲跟著整夜睡不好，墨墨的狀態牽動著媽媽的身體和心情，美玲也每天擔心女兒會撐不下去。柏翰找到工作、心情好起來之後，振福反而先鬆了一口氣，兒子的狀態也牽動著他。
>
> 王家在 2020、2022 年都是這樣，一個人往下掉，其他人就跟著往下。到了 2024 年，這個家卻變成了天天互動、彼此帶動的一家人。

### FTDL

```ftdl
metadata {
    title: 墨墨的家;
    family_type: 身心共振型;
    background: stone;
    date: 2022;
}

person { id: zhenfu; name: 王振福; gender: male; birth: 1968; wellbeing: 0.25; note: 工廠上班; }
person { id: meiling; name: 蔡美玲; gender: female; birth: 1969; }
person { id: momo; name: 墨墨; gender: female; birth: 1995; wellbeing: 0.05; proband: true; note: 王怡君，上班族，同住; }
person { id: bohan; name: 王柏翰; gender: male; birth: 1997; wellbeing: 0.59; note: 剛開始上班，同住; }

relationship {
    partners: [zhenfu, meiling];
    type: marriage;
    status: married;
    quality: 0.38;
    children: [momo, bohan];
}

bond { from: zhenfu; to: momo; closeness: 0.34; }
bond { from: momo; to: zhenfu; closeness: 0.43; }
bond { from: zhenfu; to: bohan; closeness: 0.1; }
bond { from: bohan; to: zhenfu; closeness: 0.41; }

tie { from: momo; to: meiling; line: thick; label: 牽動身心; }
tie { from: meiling; to: momo; line: thick; label: 擔憂; }
tie { from: zhenfu; to: bohan; line: dashed; label: 疏離; }
tie { from: bohan; to: zhenfu; line: thin; label: 牽動; }
tie { from: zhenfu; to: meiling; line: dashed; label: 緊繃; }
```
