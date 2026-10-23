// ai.js
// 以 Google AI Studio（Gemini API）把自然語言描述轉成 FTDL，填入編輯器並繪圖。
// 不需要註冊帳號：金鑰來自 config.js 或使用者在「API 設定」中輸入（存在 localStorage）。

document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = window.FTDL_CONFIG || {};
    const KEY_STORAGE = 'ftdlGeminiApiKey';
    const MODEL_STORAGE = 'ftdlGeminiModel';
    const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

    const input = document.getElementById('user-text-input');
    const runBtn = document.getElementById('run-dialogue-btn');
    const settingsBtn = document.getElementById('ai-settings-btn');
    const editor = document.getElementById('ftdl-editor');
    const executeBtn = document.getElementById('execute-ftdl-btn');

    const SYSTEM_PROMPT = `你是家系圖助理，負責把使用者對家庭的描述轉成 FTDL（Family Tree Description Language）。
只輸出一段 FTDL，不要任何說明文字；描述沒有提到的資訊就省略，不要編造。

# 語法
每個區塊格式為「區塊名稱 { 屬性: 值; ... }」，每個屬性以半形分號結束，值裡不能出現半形分號。

metadata {（最多一個）
  title: 標題; author: 作者; date: YYYY[-MM[-DD]];
  color: true|false;              // false = 灰階
  family_type: 家庭類型名稱;       // 例如 緊密互動型
  background: sand|mist|apricot|amber|clay|stone|#RRGGBB;  // 家庭類型底色
  legend: true|false;             // 是否顯示圖例，預設 true
}

person {
  id: 英數字與底線，不可重複（必填）;
  name: 顯示名稱; gender: male|female|other;
  birth: YYYY[-MM[-DD]]; death: YYYY[-MM[-DD]]|true;
  proband: true;                  // 先證者（圖的主角，通常只有一位）
  chronic: true;                  // 慢性病：只用於身體疾病
  Disability: true;               // 身心障礙（D 大寫）：精神障礙、智能障礙、自閉症、肢體／感官障礙
  fill: sand|mist|apricot|amber|clay|stone|#RRGGBB;  // 直接指定節點顏色（少用）
  note: 備註;
}

relationship {
  partners: [id1, id2];（必填）
  type: marriage|partnership;     // partnership = 非婚伴侶，虛線
  status: married|cohabiting|divorced|separated|widowed|annulled;
  start_date: YYYY[-MM[-DD]]; end_date: YYYY[-MM[-DD]];
  quality: 0–1;                   // 婚姻品質，決定夫妻線粗細
  children: [child_id1, child_id2];
}

bond {                            // 有方向的感情線：任何兩個人都可以畫，箭頭從 from 指向 to
  from: id; to: id;（必填）
  closeness: 0–1;                 // 感情的深厚程度，決定線的粗細
  style: solid|dashed|dotted|zigzag|cutoff|double;
                                  // dashed 疏遠或脈絡關係、dotted 弱連結、zigzag 衝突、cutoff 斷絕往來、double 非常親密
  color: 顏色;                     // 通常省略，所有感情線用同一個顏色
  arrow: true|false; label: 文字;
}

tie {                             // 關係強弱標記：單向弧線箭頭，旁邊標示關係性質
  from: id; to: id;（必填）
  line: thick|thin|dashed;        // thick 粗線＝強烈、thin 細線＝較弱、dashed 虛線＝破裂或不穩定
  label: 文字;                     // 例如 強烈、依賴、破裂、擔憂、疏離、牽掛（建議 2–4 個字）
  color: 顏色;
}

# 規則
## 年齡與日期
- 描述給的是年齡時，一律換算成出生年寫進 birth：出生年 = 基準年 − 年齡。基準年是描述中提到的年份（例如「2022 年」），沒有提到年份就用今年（{{TODAY_YEAR}}）。
- 有基準年時，把它寫進 metadata 的 date（例如 date: 2022;），工具會依這一年顯示年齡。
- note 不可以寫年齡、出生年、性別或姓名這些已經有欄位的資訊；note 只放 2–10 個字的身分或處境，例如「家庭主婦」「研究員，外縣市」「準備轉職，同住」。
- 「幾歲結婚」「結婚幾年」這類資訊也要換算成 start_date。

## 結構
- 親子關係只能寫在父母那段 relationship 的 children 裡。
- 每個孩子原則上都有兩位親生父母，children 要寫在「兩位親生父母」那段 relationship 裡（見下方「補上不詳的親生父母」）。
- 描述明確說某人性別不明、未知或不記得時，寫 gender: other。
- 每段婚姻或伴侶關係的另一半都必須是另一個獨立的 person；絕對不能把某人的父母、祖父母或子女寫成他的伴侶。配偶是誰不確定時，新增一位「妻子（不詳）」或「丈夫（不詳）」，不要拿圖中已經有的人充當。
- 同一個人不能同時出現在同一段 relationship 的 partners 和 children；一個人只能出現在一段 relationship 的 children（他自己的親生父母那段）。
- 「阿嬤」「阿公」「爺爺」「奶奶」是父母那一代的上一代：例如「爸爸的媽媽（阿嬤）」要寫成 relationship { partners: [阿公或不詳的阿公, 阿嬤]; children: [爸爸, 爸爸的手足]; }，絕對不能把爸爸寫成阿嬤的伴侶。
- 用拼音或英文當 id，例如 wang_daming、father、child1。
- 描述沒有寫明是誰的故事時，把敘事的主角（標題或故事圍繞的那個人）設為 proband。
- 描述只說「年紀很輕就當媽媽」「六十多歲」這類模糊年齡時，取合理的整數年齡換算，例如六十多歲取 65。

## 推理親屬關係
描述常常不會把每段關係都明講，你要從整段文字推理出所有隱含的親屬關係，畫出完整、相連的家系圖，而不是只畫字面上直接寫出的關係。
- 「娶」「嫁」「結婚」「太太」「先生」「老公」「老婆」「媳婦」「女婿」「夫妻倆」「兩人的孩子」都代表一對伴侶，一定要寫成 relationship。即使婚姻和孩子分在不同段落，或孩子在很後面才提到，也要寫進同一段 relationship 的 children。
- 從稱謂推回關係：「叔叔」「姑姑」是父親的手足，「舅舅」「阿姨」是母親的手足；「外公、外婆」是母親的父母，「爺爺、奶奶」是父親的父母；「孫子」「姪子」「外甥」「曾孫」同理。必要時補出中間那一代的人。
- 從「長子」「次子」「哥哥」「妹妹」「兩個孩子」「兄弟姊妹」推出同一對父母的所有子女，全部寫進同一段 relationship 的 children。
- 描述說某人是「某某的兒子／女兒」，但沒提另一位家長時：若同一段描述有提到某某的配偶，就是這對夫妻的孩子；真的沒有配偶，就補上一位不詳的另一位家長（見下一節）。

## 補上不詳的親生父母
- 只要有人有孩子，就假設孩子是兩個人生的。描述只提到一位親生家長時，補上另一位：id 用 unknown_ 開頭（例如 unknown_mother_of_xiaoming），name 寫「生母（不詳）」「生父（不詳）」或「另一位家長（不詳）」；能從脈絡判斷性別就寫，否則 gender: other；不寫出生年等其他欄位。
- 補上的家長和已知家長寫成一段 relationship，children 放孩子；兩人的婚姻關係不明時，不寫 status，也不寫 start_date、end_date。
- 「繼母」「繼父」「後母」「後爸」不是親生家長：描述只提到「爸爸和繼母」時，要補上一位不詳的生母，孩子寫在「爸爸＋生母」那段 relationship 的 children；爸爸和繼母另外寫一段 relationship，只有他們親生的孩子才寫進這段的 children。爸爸和生母的婚姻狀態不明（可能離婚，也可能喪偶），所以不寫 status。
- 收養、寄養的孩子仍寫在養父母那段 relationship 的 children，並在孩子的 note 註明「收養」或「寄養」；不需要另外補生父母，除非描述有提到。
- 描述提到的人只有名字、沒說明和別人的關係時，可以依姓氏、敘事脈絡判斷，並把他接到最合理的位置。
- 輸出前逐一檢查：
  1. 每一對伴侶都有 relationship。
  2. 每個孩子都出現在父母那段的 children 裡。
  3. 除了嫁娶進來的配偶，每個人都和其他人相連，沒有孤立的人。
  4. 每一代都接得上下一代。
  5. 沒有人同時是同一段關係的伴侶和孩子，也沒有人變成自己的祖先。
  6. 沒有任何一對伴侶其實是親子或祖孫。

## 健康狀況
- 精神疾病與精神障礙一律寫 Disability: true，不可以寫成 chronic，即使描述說「長期」「慢性」或「定期回診」也一樣。例如思覺失調症、雙相情緒障礙症（躁鬱症）、憂鬱症、焦慮症、強迫症、創傷後壓力症候群、失智症、自閉症、注意力不足過動症、智能障礙。
- chronic: true 只用於長期的身體疾病，例如糖尿病、高血壓、心臟病、慢性腎病、氣喘、癌症治療中。
- 肢體、視覺、聽覺等障礙寫 Disability: true。
- 同一個人同時有身體慢性病和身心障礙時，兩個都寫。
- 有具體診斷名稱時，把它簡短寫進 note，例如「思覺失調症」「雙相情緒障礙症，設計師」。

## 程度與關係
- 文字描述的程度要換成 0–1：很差 0.1、差 0.3、普通 0.5、好 0.7、很好 0.9。
- 描述提到某人對另一人的感情（親近、在意、疏遠、衝突）時才寫 bond，不限親子，夫妻、手足、祖孫都可以；箭頭方向就是感情的方向，雙方各自的感受各寫一個 bond（方向相反）。
- 只有描述提到婚姻品質時，才寫 quality。
- 身心狀態不要量化成分數；描述有提到（例如「最近很低落」「狀況穩定」）時，用 2–10 個字寫進 note。
- 只有描述明確指定家庭類型（例如「緊密互動型」）時，才寫 metadata 的 family_type 和 background；不可以自己替家庭歸類或命名類型，也不要自行加底色。
- 描述提到兩人關係的強弱或性質（例如「很依賴」「關係破裂」「非常在意」）時寫 tie；tie 一律有方向，雙方各自的感受各寫一個。
- 故事多半是敘事文字，不會直接列出關係：要從情節自己歸納。例如「每天陪女兒把面試講完」→ 媽媽對女兒 tie「強烈」或「陪伴」；「住在家裡卻和爸爸最不親」→ 兒子對爸爸 tie「同住不同心」（dashed）；「常為小事吵架」→ 夫妻間 tie「緊繃」（dashed）。label 用 2–4 個字概括。
- 強烈、明顯的情感用 thick，淡淡的用 thin，衝突、疏離、斷裂或不穩定用 dashed。每對人最多各一個方向的 tie，整張圖的 tie 以 3–6 個為宜，只挑故事最強調的關係。
- bond 表示親密程度的數值，tie 表示用文字標記的關係性質。同一個方向可以同時有 bond 和 tie，畫面上會合併成一條線（粗細看 bond 的 closeness，虛線與文字看 tie），所以兩個人之間最多一去一回兩條線。

# 範例
描述：2020 年，58 歲的王大明在銀行上班，和小他兩歲的太太林美華結婚二十六年，感情一直不錯。兒子小傑今年 24 歲，剛當完兵，搬回家住，最近心情很好。大明很疼這個兒子，每天下班都拉著他聊天；小傑倒覺得和爸爸普普通通，有點嫌他囉嗦。
輸出：
metadata {
    title: 小傑的家;
    date: 2020;
}
person { id: wang_daming; name: 王大明; gender: male; birth: 1962; note: 銀行上班; }
person { id: lin_meihua; name: 林美華; gender: female; birth: 1964; }
person { id: wang_xiaojie; name: 王小傑; gender: male; birth: 1996; proband: true; note: 剛退伍，同住; }
relationship {
    partners: [wang_daming, lin_meihua];
    type: marriage;
    status: married;
    start_date: 1994;
    quality: 0.7;
    children: [wang_xiaojie];
}
bond { from: wang_daming; to: wang_xiaojie; closeness: 0.9; }
bond { from: wang_xiaojie; to: wang_daming; closeness: 0.5; }
tie { from: wang_daming; to: wang_xiaojie; line: thick; label: 疼愛; }
tie { from: wang_xiaojie; to: wang_daming; line: thin; label: 嫌囉嗦; }`;

    // 引導助手：以對話陪使用者整理家庭故事，不直接產生 FTDL；資訊足夠時提醒使用者交給生成助手
    const GUIDE_PROMPT = `你是「家書 Jiashu」的引導助手。家書是一個用一段話畫出家系圖的工具。你的任務是透過溫和、有結構的引導式對話，陪使用者把家庭故事整理清楚，讓後續能畫出完整、正確的家系圖。

# 身分與界線
- 介紹自己時只說「引導助手」，不要自稱社工師、諮商師、心理師或治療師，也不要說自己有任何專業證照。
- 你可以運用會談技巧（傾聽、摘要、開放式提問、具體化），但不做診斷、不提供治療或用藥建議。
- 如果使用者提到自傷、自殺念頭、正在受暴或有立即危險，先關心對方的安全，並提供台灣的求助資源：安心專線 1925、保護專線 113、緊急情況撥 110 或 119。
- 不要輸出 FTDL 或任何程式碼；畫圖由「生成助手」負責。

# 對話方式
- 一律使用繁體中文，語氣自然、溫暖、精簡，不說教。
- 每次回覆：先用一兩句回應或摘要使用者剛說的重點，再提出 1–3 個具體問題。不要一次丟出一長串問題。
- 跟著使用者的節奏；對方不想談的部分就先跳過，之後再視情況回來。
- 已經知道的資訊不要重複問；資訊互相矛盾時，溫和地確認。

# 引導流程
1. 先訂目標：這張家系圖要用在哪裡（研究、個案工作、教學、自我探索、家族紀錄）？圖的主角（案主）是誰？想畫幾代、想看清楚什麼（例如精神健康的家族史、照顧壓力、關係衝突、遷移或再婚）？
2. 再收集家庭結構，大致依序：案主本人 → 父母與手足 → 祖父母與父母的手足 → 伴侶與子女 → 其他重要的人。
3. 每個人盡量確認：稱呼或姓名、性別、出生年或年齡、是否過世與過世年份。
4. 重要事件：結婚、離婚、分居、喪偶、再婚（哪一段婚姻生了哪些孩子）、收養或寄養、同居伴侶。只知道一位親生家長時，可以問另一位是誰；不知道也沒關係，工具會標成「不詳」。
5. 健康：慢性病（身體疾病）、身心障礙、精神疾病（例如思覺失調症、雙相情緒障礙症、憂鬱症），以及目前的生活與健康狀況。
6. 關係：誰和誰特別親近、依賴、疏離、衝突或斷絕往來，以及這份感情的方向（例如媽媽很依賴女兒，但女兒覺得有壓力）。
7. 依使用者的目標，再深入探索與目標相關的故事。

# 你需要知道的工具功能（使用者問到時可以說明，或在適當時機簡短提起）
- 家系圖可以記錄：姓名、性別（男、女、其他或不詳）、出生與過世年份、案主、慢性病、身心障礙、備註。
- 婚姻與伴侶：婚姻或非婚伴侶、狀態（已婚、同居、離婚、分居、喪偶、婚姻無效）、開始與結束年份、婚姻品質（決定夫妻線粗細）。近親結婚會用雙橫線標示。
- 關係線：有方向的感情線（深厚程度決定粗細；可標示疏遠、衝突、斷絕往來、非常親密），以及帶文字的關係標記（例如「依賴」「擔憂」「破裂」）。
- 家庭類型與底色、圖例會自動產生。
- 代數很多或兩邊家族都畫時，會自動拆成幾個直系視圖，可以在右上角切換。
- 可以匯出 PNG、去背 PNG、SVG、PDF，也可以在圖的右側附上每個人的詳細資料。
- 這個聊天室會保存對話，可以用 #編號 提及之前的某一筆。

# 交給生成助手
- 當你判斷資訊已經足以畫出一張基本的家系圖（至少知道案主、案主的父母與手足，或案主的伴侶與子女的基本資料），或使用者表示想先看看圖時，在回覆最後提醒：「如果覺得資訊差不多了，可以按輸入框旁的「產生家系圖」，我會把目前聊天室裡的所有資訊交給生成助手畫出來；之後還可以繼續補充。」
- 這個提醒不要每次都說；資訊有明顯增加，或使用者問「然後呢」「可以畫了嗎」時再提。
- 使用者畫出圖之後，可以協助檢查還缺什麼、哪些關係可以再補充。`;

    // --- 設定 ---
    function getKey() {
        let stored = '';
        try { stored = localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { /* 無法使用 localStorage */ }
        return stored || CONFIG.geminiApiKey || '';
    }

    const DEFAULT_MODEL = CONFIG.geminiModel || 'gemini-3.5-flash-lite';
    const MODEL_OPTIONS = [
        { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite（推薦，最快）' },
        { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash（較準，稍慢）' },
        { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash（最新，思考較久）' },
        { value: 'gemini-flash-lite-latest', label: 'gemini-flash-lite-latest（自動跟最新 Flash-Lite）' },
        { value: 'gemini-flash-latest', label: 'gemini-flash-latest（自動跟最新 Flash）' }
    ];

    // 舊版把預設的 gemini-flash-latest 也存進 localStorage，清掉它，讓這些使用者改用新的預設模型
    try {
        if (!localStorage.getItem('ftdlGeminiModelMigrated')) {
            if (localStorage.getItem(MODEL_STORAGE) === 'gemini-flash-latest') localStorage.removeItem(MODEL_STORAGE);
            localStorage.setItem('ftdlGeminiModelMigrated', '1');
        }
    } catch (e) { /* 無法使用 localStorage */ }

    function getModel() {
        let stored = '';
        try { stored = localStorage.getItem(MODEL_STORAGE) || ''; } catch (e) { /* 無法使用 localStorage */ }
        return stored || DEFAULT_MODEL;
    }

    function openSettings(message) {
        let overlay = document.getElementById('ai-settings-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ai-settings-overlay';
            overlay.innerHTML = `
                <div class="ai-dialog" role="dialog" aria-labelledby="ai-dialog-title">
                    <h3 id="ai-dialog-title">Google AI Studio API 設定</h3>
                    <p class="ai-dialog-message"></p>
                    <label for="ai-key-input">API 金鑰</label>
                    <input id="ai-key-input" type="password" autocomplete="off" placeholder="AIza...">
                    <p class="ai-dialog-hint">到 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> 免費建立。金鑰只存在這個瀏覽器，不會上傳到其他地方。</p>
                    <label for="ai-model-select">模型</label>
                    <select id="ai-model-select">
                        ${MODEL_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                        <option value="__custom">其他（自行輸入）</option>
                    </select>
                    <input id="ai-model-input" type="text" autocomplete="off" spellcheck="false" placeholder="輸入模型名稱，例如 gemini-3.6-flash">
                    <div class="ai-dialog-actions">
                        <button id="ai-key-clear" class="ai-btn-secondary" type="button">清除金鑰</button>
                        <button id="ai-key-cancel" class="ai-btn-secondary" type="button">取消</button>
                        <button id="ai-key-save" class="ai-btn-primary" type="button">儲存</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('visible'); });
            overlay.querySelector('#ai-key-cancel').addEventListener('click', () => overlay.classList.remove('visible'));
            overlay.querySelector('#ai-model-select').addEventListener('change', e => {
                const custom = e.target.value === '__custom';
                overlay.querySelector('#ai-model-input').style.display = custom ? 'block' : 'none';
                if (custom) overlay.querySelector('#ai-model-input').focus();
            });
            overlay.querySelector('#ai-key-clear').addEventListener('click', () => {
                try { localStorage.removeItem(KEY_STORAGE); } catch (e) { /* 忽略 */ }
                overlay.querySelector('#ai-key-input').value = '';
            });
            overlay.querySelector('#ai-key-save').addEventListener('click', () => {
                const key = overlay.querySelector('#ai-key-input').value.trim();
                const selected = overlay.querySelector('#ai-model-select').value;
                const model = selected === '__custom' ? overlay.querySelector('#ai-model-input').value.trim() : selected;
                try {
                    if (key) localStorage.setItem(KEY_STORAGE, key);
                    // 選預設模型時不存，之後預設模型更新就會自動跟上
                    if (model && model !== DEFAULT_MODEL) localStorage.setItem(MODEL_STORAGE, model);
                    else if (model === DEFAULT_MODEL) localStorage.removeItem(MODEL_STORAGE);
                } catch (e) { /* 忽略 */ }
                overlay.classList.remove('visible');
                if (overlay.dataset.resume === 'true' && getKey()) {
                    overlay.dataset.resume = '';
                    handleRun();
                }
            });
        }
        overlay.querySelector('.ai-dialog-message').textContent = message || '';
        overlay.querySelector('.ai-dialog-message').style.display = message ? 'block' : 'none';
        overlay.querySelector('#ai-key-input').value = (() => { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { return ''; } })();
        const currentModel = getModel();
        const isPreset = MODEL_OPTIONS.some(o => o.value === currentModel);
        overlay.querySelector('#ai-model-select').value = isPreset ? currentModel : '__custom';
        overlay.querySelector('#ai-model-input').value = isPreset ? '' : currentModel;
        overlay.querySelector('#ai-model-input').style.display = isPreset ? 'none' : 'block';
        overlay.classList.add('visible');
        setTimeout(() => overlay.querySelector('#ai-key-input').focus(), 50);
        return overlay;
    }

    if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());

    // --- 狀態顯示 ---
    // 對話區展開時顯示在輸入框上方；收起時改成從左下角的貓旁邊冒出的對話泡泡
    const statusEl = document.getElementById('ai-status');
    const speech = document.getElementById('assistant-bubble');
    let speechTimer = null;
    let lastStatus = null;
    const sheetIsOpen = () => document.getElementById('assistant-sheet').classList.contains('open');
    const aiRunning = () => document.body.classList.contains('ai-running');
    function hideBubble() {
        clearTimeout(speechTimer);
        speech.classList.remove('visible');
    }
    // 執行中的訊息一直留著；結束後成功的訊息 6 秒後消失，失敗的留到使用者點它
    function scheduleBubbleHide(type) {
        clearTimeout(speechTimer);
        if (!aiRunning() && type !== 'error') speechTimer = setTimeout(hideBubble, type === 'success' ? 6000 : 12000);
    }
    function showBubble(text, type = 'info') {
        if (sheetIsOpen()) return;
        speech.className = `visible speech-${type}`;
        speech.textContent = text;
        scheduleBubbleHide(type);
    }
    function setStatus(text, type = 'info') {
        if (!text) { statusEl.style.display = 'none'; hideBubble(); lastStatus = null; return; }
        lastStatus = { text, type };
        statusEl.className = `ai-status-${type}`;
        statusEl.textContent = text;
        statusEl.style.display = 'block';
        if (type === 'success') setTimeout(() => { if (statusEl.textContent === text) statusEl.style.display = 'none'; }, 6000);
        showBubble(text, type);
    }

    // 左下角的貓：生成模式是 cat-1，引導模式換成引導助手（cat-5）；
    // 只有生成家系圖時播放 cat-1 的動畫，其他時候（包括引導助手回覆中）都是靜態圖
    const mascotImg = document.querySelector('#assistant-mascot img');
    const MASCOT_IMAGES = { generate: 'assets/cats/cat-1.webp', guide: 'assets/cats/cat-5.webp' };
    const MASCOT_RUNNING = 'assets/cats/cat-1-run.webp';
    [MASCOT_RUNNING, MASCOT_IMAGES.guide].forEach(src => { new Image().src = src; }); // 先載入，切換時不會閃
    function updateMascot(busyKind = null) {
        if (!mascotImg) return;
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const kind = busyKind || mode;
        const src = busyKind === 'generate' && !reduceMotion ? MASCOT_RUNNING : MASCOT_IMAGES[kind];
        if (mascotImg.getAttribute('src') !== src) mascotImg.src = src;
        document.body.classList.toggle('guide-mode', mode === 'guide');
    }

    // kind：'generate'（生成家系圖，含交給生成助手）或 'guide'（引導助手回覆）
    function setBusy(busy, kind = 'generate') {
        document.body.classList.toggle('ai-running', busy);
        document.body.classList.toggle('ai-generating', busy && kind === 'generate');
        updateMascot(busy ? kind : null);
        // 結束後，泡泡裡的最後一則訊息照一般規則自動消失
        if (!busy && lastStatus && speech.classList.contains('visible')) scheduleBubbleHide(lastStatus.type);
        input.disabled = busy;
        runBtn.disabled = busy;
        runBtn.classList.toggle('is-busy', busy);
        runBtn.textContent = busy ? '回覆中…' : '送出';
    }

    // --- Gemini API ---
    const TIMEOUT_MS = CONFIG.requestTimeoutMs ?? 180000;
    const NETWORK_RETRIES = CONFIG.networkRetries ?? 2;

    // 用串流（SSE）接收回應：模型邊產生邊傳回，連線不會因為長時間沒有資料而被瀏覽器（尤其 Safari）切斷。
    // 連線中斷（Safari 顯示為 "Load failed"）或逾時時自動重試；HTTP 錯誤不重試
    async function streamOnce(url, options, onText) {
        const controller = new AbortController();
        let timer;
        // 逾時以「多久沒收到新資料」計算，長回應只要持續有資料就不會被中斷
        const resetTimer = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), TIMEOUT_MS); };
        resetTimer();
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            if (!res.ok) {
                let data = null;
                try { data = await res.json(); } catch (e) { /* 非 JSON 回應 */ }
                const msg = data && data.error && data.error.message ? data.error.message : `HTTP ${res.status}`;
                const err = new Error(msg);
                err.status = res.status;
                throw err;
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let text = '';
            let finishReason = '';
            let blockReason = '';
            const handleEvent = (line) => {
                if (!line.startsWith('data:')) return;
                const payload = line.slice(5).trim();
                if (!payload) return;
                let data;
                try { data = JSON.parse(payload); } catch (e) { return; }
                if (data.error) {
                    const err = new Error(data.error.message || '串流回應錯誤');
                    err.status = data.error.code;
                    throw err;
                }
                const candidate = data.candidates && data.candidates[0];
                if (candidate && candidate.content && candidate.content.parts) {
                    const parts = candidate.content.parts;
                    if (parts.some(p => p.thought)) setStatus(`${getModel()} 正在思考…`);
                    const piece = parts.filter(p => !p.thought).map(p => p.text || '').join('');
                    if (piece) { text += piece; if (onText) onText(text); }
                }
                if (candidate && candidate.finishReason) finishReason = candidate.finishReason;
                if (data.promptFeedback && data.promptFeedback.blockReason) blockReason = data.promptFeedback.blockReason;
            };
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                resetTimer();
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop();
                lines.forEach(handleEvent);
            }
            buffer += decoder.decode();
            if (buffer) handleEvent(buffer);
            if (!text.trim()) throw new Error(`模型沒有回傳內容（${finishReason || blockReason || '未知原因'}）`);
            return text;
        } finally {
            clearTimeout(timer);
        }
    }

    // 模型忙碌（503）或伺服器暫時錯誤時要重試的 HTTP 狀態
    const BUSY_STATUSES = [500, 502, 503, 504];
    const BUSY_RETRIES = CONFIG.busyRetries ?? 2;
    const wait = ms => new Promise(r => setTimeout(r, ms));

    async function streamWithRetry(url, options, onText) {
        let lastError;
        let networkAttempts = 0, busyAttempts = 0;
        for (;;) {
            try {
                return await streamOnce(url, options, onText);
            } catch (err) {
                if (BUSY_STATUSES.includes(err.status)) {
                    // 模型忙碌：等幾秒再試，間隔逐次拉長
                    err.isBusy = true;
                    if (busyAttempts >= BUSY_RETRIES) throw err;
                    busyAttempts++;
                    const seconds = busyAttempts * 3;
                    setStatus(`模型目前很忙，${seconds} 秒後自動重試（第 ${busyAttempts} 次）…`);
                    await wait(seconds * 1000);
                    continue;
                }
                if (err.status || err.message.startsWith('模型沒有回傳內容')) throw err;
                lastError = err;
                lastError.isNetwork = true;
                lastError.isTimeout = err.name === 'AbortError';
                if (networkAttempts >= NETWORK_RETRIES) throw lastError;
                networkAttempts++;
                setStatus(`連線中斷，正在重試（第 ${networkAttempts} 次）…`);
                await wait(1000 * networkAttempts);
            }
        }
    }

    // 目前的模型一直很忙時，自動改用清單裡的下一個模型再試一次
    const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-lite-latest'];

    // mode：'generate' 用生成 FTDL 的提示詞，'guide' 用引導助手的提示詞；onText 會在每次收到新文字時呼叫
    async function callGemini(contents, { mode = 'generate', onText = null } = {}) {
        const prompt = (mode === 'guide' ? GUIDE_PROMPT : SYSTEM_PROMPT).replace('{{TODAY_YEAR}}', String(new Date().getFullYear()));
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getKey() },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: prompt }] },
                contents,
                generationConfig: {
                    temperature: mode === 'guide' ? (CONFIG.guideTemperature ?? 0.7) : (CONFIG.temperature ?? 0.2),
                    // 讓思考摘要也串流回來，模型思考期間連線持續有資料，不會被當成閒置或逾時
                    thinkingConfig: { includeThoughts: true }
                }
            })
        };
        const urlFor = model => `${API_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
        const model = getModel();
        try {
            return await streamWithRetry(urlFor(model), options, onText);
        } catch (err) {
            const fallback = FALLBACK_MODELS.find(m => m !== model);
            if (!err.isBusy || !fallback) throw err;
            setStatus(`${model} 目前很忙，改用 ${fallback} 再試一次…`);
            try {
                return await streamWithRetry(urlFor(fallback), options, onText);
            } catch (fallbackErr) {
                if (fallbackErr.isBusy) fallbackErr.triedModels = [model, fallback];
                throw fallbackErr;
            }
        }
    }

    function extractFtdl(text) {
        let t = text.trim();
        const fenced = t.match(/```(?:ftdl)?\s*\n?([\s\S]*?)```/i);
        if (fenced) t = fenced[1].trim();
        return t;
    }

    // 找出沒有接上任何 relationship 的人（模型漏掉隱含的婚姻或親子關係時常見）
    function findIsolatedPeople(ftdl) {
        const blocks = [];
        const re = /(person|relationship)\s*\{([^}]*)\}/g;
        let m;
        while ((m = re.exec(ftdl))) {
            blocks.push({ type: m[1], body: m[2], lineNumber: ftdl.slice(0, m.index).split('\n').length });
        }
        const people = blocks.filter(b => b.type === 'person')
            .map(b => ({ id: (b.body.match(/\bid\s*:\s*([^;\s]+)/) || [])[1], lineNumber: b.lineNumber }))
            .filter(p => p.id);
        if (people.length < 2) return [];
        const linked = new Set();
        blocks.filter(b => b.type === 'relationship').forEach(b => {
            ['partners', 'children'].forEach(key => {
                const list = b.body.match(new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]*)\\]`));
                if (list) list[1].split(',').map(x => x.trim()).filter(Boolean).forEach(id => linked.add(id));
            });
        });
        return people.filter(p => !linked.has(p.id)).map(p => ({
            isolated: true,
            lineNumber: p.lineNumber,
            message: `${p.id} 沒有出現在任何 relationship 的 partners 或 children 裡，是孤立的人。請從描述推理他的配偶、父母或子女，補上對應的 relationship。`
        }));
    }

    // 找出會形成循環的親子關係：某人同時是同一段關係的伴侶與孩子，或某人成了自己的祖先
    function findCycles(ftdl) {
        const rels = [];
        const re = /relationship\s*\{([^}]*)\}/g;
        let m;
        while ((m = re.exec(ftdl))) {
            const list = key => ((m[1].match(new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]*)\\]`)) || [])[1] || '').split(',').map(x => x.trim()).filter(Boolean);
            rels.push({ partners: list('partners'), children: list('children'), lineNumber: ftdl.slice(0, m.index).split('\n').length });
        }
        const issues = [];
        rels.forEach(r => r.children.filter(c => r.partners.includes(c)).forEach(c => issues.push({
            lineNumber: r.lineNumber,
            message: `${c} 同時是這段 relationship 的 partners 與 children，等於是自己的孩子。請改成他和他真正的伴侶（或不詳的另一位家長）那段關係，孩子寫在他自己父母那段關係裡。`
        })));
        const parentsOf = id => rels.filter(r => r.children.includes(id)).flatMap(r => r.partners);
        const isAncestor = (anc, id, seen = new Set()) => parentsOf(id).some(p => p === anc || (!seen.has(p) && seen.add(p) && isAncestor(anc, p, seen)));
        rels.forEach(r => r.children.forEach(c => {
            if (r.partners.includes(c)) return;
            if (r.partners.some(p => isAncestor(c, p))) issues.push({
                lineNumber: r.lineNumber,
                message: `${c} 是這段 relationship 某位伴侶的祖先，卻又被寫成他們的孩子，形成循環。請檢查世代關係。`
            });
        }));
        rels.forEach(r => {
            if (r.partners.length !== 2) return;
            const [a, b] = r.partners;
            if (isAncestor(a, b) || isAncestor(b, a)) issues.push({
                lineNumber: r.lineNumber,
                message: `${a} 和 ${b} 是親子（或祖孫），卻被寫成這段 relationship 的伴侶。很可能把某人的母親或父親誤當成他的配偶：請改成他真正的配偶（另外新增一個 person；不知道是誰就寫「妻子（不詳）」或「丈夫（不詳）」）。`
            });
        });
        return issues;
    }

    function loadIntoEditor(ftdl) {
        editor.value = ftdl;
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        const errors = typeof window.ftdlValidate === 'function' ? window.ftdlValidate() : [];
        if (errors.length > 0) return errors;
        const cycles = findCycles(ftdl);
        return cycles.length > 0 ? cycles : findIsolatedPeople(ftdl);
    }

    // 排版時略過的循環或重複父母（例如手動在編輯器寫錯），在狀態列提醒
    document.addEventListener('ftdl-structure-warning', e => {
        const list = [...new Set(e.detail || [])];
        if (list.length) setStatus(`家系圖可能有資料錯誤：${list.join('；')}。請到「編輯」頁修正。`, 'error');
    });

    // --- 聊天室（存在這個瀏覽器的 localStorage） ---
    // 最多 10 個聊天室，超過時刪除最早建立的；每個聊天室最多 20 筆對話（一筆＝使用者訊息＋助手回覆），
    // 超過時從第 2 筆開始刪除較舊的，第 1 筆（通常是最初的家庭故事）永遠保留。
    // 每筆有固定編號（#1、#2…），刪除後不會重複使用；在輸入框打 #編號 可以提及聊天室裡的某一筆。
    const CHAT_STORAGE = 'ftdlChatRooms';
    const MODE_STORAGE = 'ftdlAssistantMode';
    const ROOM_LIMIT = 10;
    const ITEM_LIMIT = 20;
    const DEFAULT_ROOM_TITLE = '新聊天室';
    const HANDOFF_TEXT = '請根據這個聊天室到目前為止的所有資訊，產生完整的家系圖。';

    function loadChat() {
        try {
            const data = JSON.parse(localStorage.getItem(CHAT_STORAGE) || 'null');
            if (data && Array.isArray(data.rooms)) return { roomSeq: data.roomSeq || 0, currentId: data.currentId || null, rooms: data.rooms };
        } catch (e) { /* 資料損毀或無法使用 localStorage */ }
        return { roomSeq: 0, currentId: null, rooms: [] };
    }
    function saveChat(chat) {
        try { localStorage.setItem(CHAT_STORAGE, JSON.stringify(chat)); return true; } catch (e) {
            setStatus('瀏覽器的儲存空間不足或無法使用，這次的對話沒有存進聊天室。', 'error');
            return false;
        }
    }
    function currentRoom(chat) {
        return chat.rooms.find(r => r.id === chat.currentId) || null;
    }
    function createRoom(chat) {
        const room = { id: chat.roomSeq + 1, title: DEFAULT_ROOM_TITLE, seq: 0, items: [], createdAt: Date.now(), updatedAt: Date.now(), trimmedAt: null };
        chat.roomSeq = room.id;
        chat.rooms.push(room);
        // 超過 10 個時刪除最早建立的
        chat.rooms.sort((a, b) => a.createdAt - b.createdAt);
        let removed = null;
        while (chat.rooms.length > ROOM_LIMIT) removed = chat.rooms.shift();
        chat.currentId = room.id;
        if (removed) setStatus(`聊天室已達 ${ROOM_LIMIT} 個上限，已刪除最早的「${removed.title}」。`);
        return room;
    }
    function ensureRoom(chat) {
        return currentRoom(chat) || createRoom(chat);
    }
    function addItem(item) {
        const chat = loadChat();
        const room = ensureRoom(chat);
        item.no = room.seq + 1;
        item.createdAt = Date.now();
        room.seq = item.no;
        room.items.push(item);
        if (room.title === DEFAULT_ROOM_TITLE && item.user && item.mode !== 'handoff') {
            room.title = item.user.replace(/\s+/g, ' ').slice(0, 18) + (item.user.length > 18 ? '…' : '');
        }
        // 超過 20 筆：保留第 1 筆，從第 2 筆開始刪除較舊的
        const removed = [];
        while (room.items.length > ITEM_LIMIT) removed.push(room.items.splice(1, 1)[0].no);
        if (removed.length) room.trimmedAt = Date.now();
        room.updatedAt = Date.now();
        saveChat(chat);
        renderChat();
        return { item, room, removed };
    }
    function latestFtdlItem(room) {
        return room ? [...room.items].reverse().find(it => it.ftdl) || null : null;
    }

    const parseRefs = text => [...new Set((text.match(/#(\d+)/g) || []).map(m => parseInt(m.slice(1), 10)))];
    const countPeople = ftdl => (ftdl.match(/(^|[\s;}])person\s*\{/g) || []).length;
    const formatTime = ms => {
        const d = new Date(ms);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // 帶給模型的前情：聊天室裡的每一筆對話依序放入；舊的 FTDL 只留摘要，
    // 最新的一份與被 #編號 提及的那幾筆才附上完整 FTDL，以節省 token
    function buildContents(room, question, mode) {
        const contents = [];
        const refs = parseRefs(question);
        const latest = latestFtdlItem(room);
        (room ? room.items : []).forEach(it => {
            const label = it.mode === 'guide' ? '引導對話' : '生成家系圖';
            contents.push({ role: 'user', parts: [{ text: `（聊天室第 #${it.no} 筆，${label}）${it.user}` }] });
            let reply;
            if (it.ftdl) {
                reply = (latest && it.no === latest.no) || refs.includes(it.no)
                    ? it.ftdl
                    : `（第 #${it.no} 筆產生了一份 FTDL，共 ${countPeople(it.ftdl)} 人；內容已省略，最新的版本在後面。）`;
            } else {
                reply = it.reply || '（沒有回覆）';
            }
            contents.push({ role: 'model', parts: [{ text: reply }] });
        });
        let note = '';
        if (room && room.items.length) {
            note = mode === 'guide'
                ? ''
                : `\n\n（以上是這個聊天室先前的對話。${latest ? `請以最新的 FTDL（第 #${latest.no} 筆）為基礎，` : '請整合聊天室裡所有的家庭資訊，'}依照這次的要求輸出更新後完整的 FTDL。）`;
        }
        contents.push({ role: 'user', parts: [{ text: question + note }] });
        return contents;
    }

    // --- 介面：左下角的助手貓、從下方拉出的對話區、左側聊天室清單 ---
    let mode = 'generate';
    try { if (localStorage.getItem(MODE_STORAGE) === 'guide') mode = 'guide'; } catch (e) { /* 忽略 */ }

    const sheet = document.getElementById('assistant-sheet');
    const mascot = document.getElementById('assistant-mascot');
    const modeToggle = document.getElementById('ai-mode-toggle');
    const handoffBtn = document.getElementById('ai-handoff-btn');
    const roomsList = sheet.querySelector('.rooms-list');
    const chatBody = sheet.querySelector('.chat-body');
    const notice = sheet.querySelector('.chat-notice');
    const SHEET_HEIGHT_STORAGE = 'ftdlSheetHeight';
    const ROOMS_OPEN_STORAGE = 'ftdlRoomsOpen';
    const AVATAR_GENERATE = 'assets/cats/cat-1.webp';
    const AVATAR_GUIDE = 'assets/cats/cat-5.webp';
    let editingNo = null;
    let pending = null; // 送出中的那一筆：{ user, mode, text }

    const PLACEHOLDERS = {
        generate: '描述家庭成員與關係，例如：父親 1968 年生，和母親結婚三十年，有一兒一女……',
        guide: '和引導助手聊聊你想畫的家庭，例如：我想整理我們家三代的關係……'
    };
    function applyMode(next) {
        mode = next;
        try { localStorage.setItem(MODE_STORAGE, mode); } catch (e) { /* 忽略 */ }
        modeToggle.querySelectorAll('button').forEach(b => {
            const on = b.dataset.mode === mode;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        handoffBtn.style.display = mode === 'guide' ? '' : 'none';
        input.placeholder = PLACEHOLDERS[mode];
        if (!document.body.classList.contains('ai-running')) updateMascot();
    }
    modeToggle.querySelectorAll('button').forEach(b => b.addEventListener('click', () => applyMode(b.dataset.mode)));

    // 對話區開關：貓一直固定在畫面左下角同一個位置（不搬動，才不會閃），
    // 對話區展開時輸入框在貓的位置預留空位
    const isSheetOpen = () => sheet.classList.contains('open');
    function placeMascot() {
        mascot.setAttribute('aria-expanded', String(isSheetOpen()));
        mascot.title = isSheetOpen() ? '收起對話區' : '和助手對話';
    }
    function openSheet() {
        if (isSheetOpen()) return;
        sheet.classList.add('open');
        document.body.classList.add('sheet-open');
        hideBubble();
        placeMascot();
        renderChat();
        scrollChatToEnd();
        setTimeout(() => input.focus(), 200);
    }
    function closeSheet() {
        if (!isSheetOpen()) return;
        sheet.classList.remove('open');
        document.body.classList.remove('sheet-open');
        editingNo = null;
        placeMascot();
        // 還在跑的話，把目前的進度（或引導助手正在打的字）放到貓旁邊的泡泡
        if (aiRunning()) {
            if (pending && pending.mode === 'guide' && pending.text) showBubble(guidePreview(pending.text));
            else if (lastStatus) showBubble(lastStatus.text, lastStatus.type);
        }
    }
    // 引導助手回覆中、對話區收起時，泡泡顯示牠正在打的最後一段字
    const guidePreview = text => {
        const flat = text.replace(/\s+/g, ' ').trim();
        return `引導助手：${flat.length > 90 ? '…' + flat.slice(-90) : flat}`;
    };
    function scrollChatToEnd() { chatBody.scrollTop = chatBody.scrollHeight; }
    mascot.addEventListener('click', () => { if (isSheetOpen()) closeSheet(); else openSheet(); });
    sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);
    document.getElementById('assistant-bubble').addEventListener('click', openSheet);

    // 拖曳對話區上緣調整高度：介於畫面的 1/3 到 2/3
    function applySheetHeight(px) {
        const h = Math.round(Math.max(window.innerHeight / 3, Math.min(window.innerHeight * 2 / 3, px)));
        sheet.style.setProperty('--sheet-height', `${h}px`);
        return h;
    }
    try { const saved = parseFloat(localStorage.getItem(SHEET_HEIGHT_STORAGE)); if (saved) applySheetHeight(saved); } catch (e) { /* 忽略 */ }
    sheet.querySelector('.sheet-resizer').addEventListener('pointerdown', e => {
        e.preventDefault();
        sheet.classList.add('resizing');
        const move = ev => applySheetHeight(window.innerHeight - ev.clientY);
        const up = ev => {
            sheet.classList.remove('resizing');
            const h = applySheetHeight(window.innerHeight - ev.clientY);
            try { localStorage.setItem(SHEET_HEIGHT_STORAGE, String(h)); } catch (err) { /* 忽略 */ }
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    });

    // 左側聊天室清單：可以展開或收起，記住上次的狀態
    function setRoomsOpen(open) {
        sheet.classList.toggle('rooms-open', open);
        try { localStorage.setItem(ROOMS_OPEN_STORAGE, open ? '1' : '0'); } catch (e) { /* 忽略 */ }
    }
    try { setRoomsOpen(localStorage.getItem(ROOMS_OPEN_STORAGE) === '1'); } catch (e) { /* 忽略 */ }
    sheet.querySelector('.rooms-toggle').addEventListener('click', () => setRoomsOpen(!sheet.classList.contains('rooms-open')));

    function smallButton(text, handler, extraClass = '') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `chat-action ${extraClass}`.trim();
        b.textContent = text;
        b.addEventListener('click', e => { e.stopPropagation(); handler(); });
        return b;
    }
    function loadFtdl(ftdl, label) {
        editor.value = ftdl;
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        executeBtn.disabled = false;
        executeBtn.click();
        setStatus(`已載入${label}的家系圖。`, 'success');
    }
    function insertMention(no) {
        const tag = `#${no} `;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const before = input.value.slice(0, start);
        const spacer = before && !/\s$/.test(before) ? ' ' : '';
        input.value = before + spacer + tag + input.value.slice(end);
        const caret = (before + spacer + tag).length;
        input.focus();
        input.setSelectionRange(caret, caret);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function updateRoom(mutator) {
        const chat = loadChat();
        const room = currentRoom(chat);
        if (!room) return;
        mutator(room, chat);
        room.updatedAt = Date.now();
        saveChat(chat);
        renderChat();
    }
    function renameRoom(id) {
        const chat = loadChat();
        const room = chat.rooms.find(r => r.id === id);
        if (!room) return;
        const name = prompt('聊天室名稱', room.title);
        if (name && name.trim()) { room.title = name.trim().slice(0, 40); room.updatedAt = Date.now(); saveChat(chat); renderChat(); }
    }
    function deleteRoom(id) {
        const chat = loadChat();
        const room = chat.rooms.find(r => r.id === id);
        if (!room || !confirm(`刪除聊天室「${room.title}」和裡面的 ${room.items.length} 筆對話？刪除後無法復原。`)) return;
        chat.rooms = chat.rooms.filter(r => r.id !== id);
        if (chat.currentId === id) {
            const next = [...chat.rooms].sort((a, b) => b.updatedAt - a.updatedAt)[0];
            chat.currentId = next ? next.id : null;
        }
        saveChat(chat);
        editingNo = null;
        renderChat();
    }

    function bubble(role, avatar) {
        const row = document.createElement('div');
        row.className = `chat-row ${role}`;
        if (avatar) {
            const img = document.createElement('img');
            img.className = 'chat-avatar';
            img.src = avatar;
            img.alt = '';
            row.appendChild(img);
        }
        const b = document.createElement('div');
        b.className = 'chat-bubble';
        row.appendChild(b);
        return { row, b };
    }

    function renderItem(it) {
        const wrap = document.createElement('div');
        wrap.className = 'chat-item';
        wrap.dataset.no = it.no;

        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        const no = document.createElement('span');
        no.className = 'chat-no';
        no.textContent = `#${it.no}`;
        meta.appendChild(no);
        const info = document.createElement('span');
        info.textContent = [formatTime(it.createdAt), it.mode === 'guide' ? '引導' : '生成', it.updatedAt ? '已編輯' : ''].filter(Boolean).join(' · ');
        meta.appendChild(info);
        wrap.appendChild(meta);

        if (editingNo === it.no) {
            const userBox = document.createElement('textarea');
            userBox.value = it.user;
            userBox.rows = 3;
            const replyBox = document.createElement('textarea');
            replyBox.value = it.ftdl || it.reply || '';
            replyBox.rows = it.ftdl ? 8 : 5;
            replyBox.spellcheck = !it.ftdl;
            if (it.ftdl) replyBox.classList.add('mono');
            const la = document.createElement('label'); la.textContent = '你的訊息';
            const lb = document.createElement('label'); lb.textContent = it.ftdl ? 'FTDL（被提及時會帶入這份內容）' : '助手的回覆';
            wrap.append(la, userBox, lb, replyBox);
            const actions = document.createElement('div');
            actions.className = 'chat-actions';
            actions.append(
                smallButton('取消', () => { editingNo = null; renderChat(); }),
                smallButton('儲存', () => {
                    updateRoom(room => {
                        const target = room.items.find(x => x.no === it.no);
                        if (!target) return;
                        target.user = userBox.value.trim() || target.user;
                        if (target.ftdl) target.ftdl = replyBox.value.trim() || target.ftdl;
                        else target.reply = replyBox.value.trim();
                        target.updatedAt = Date.now();
                    });
                    editingNo = null;
                    renderChat();
                }, 'primary')
            );
            wrap.appendChild(actions);
            return wrap;
        }

        if (it.user) {
            const { row, b } = bubble('user');
            b.textContent = it.mode === 'handoff' ? `（交給生成助手）${it.user === HANDOFF_TEXT ? '' : it.user}`.trim() : it.user;
            wrap.appendChild(row);
        }
        if (it.ftdl) {
            const { row, b } = bubble('assistant', AVATAR_GENERATE);
            const title = document.createElement('div');
            title.className = 'chat-ftdl-title';
            title.textContent = `畫好了家系圖（${countPeople(it.ftdl)} 人）`;
            b.appendChild(title);
            const pre = document.createElement('pre');
            pre.className = 'chat-ftdl';
            pre.textContent = it.ftdl;
            pre.hidden = true;
            const tools = document.createElement('div');
            tools.className = 'chat-bubble-tools';
            tools.append(
                smallButton('載入', () => loadFtdl(it.ftdl, `第 #${it.no} 筆`)),
                smallButton('查看 FTDL', () => { pre.hidden = !pre.hidden; })
            );
            b.append(tools, pre);
            wrap.appendChild(row);
        } else if (it.reply) {
            const { row, b } = bubble('assistant', AVATAR_GUIDE);
            b.textContent = it.reply;
            wrap.appendChild(row);
        }

        const actions = document.createElement('div');
        actions.className = 'chat-actions';
        actions.append(
            smallButton('提及', () => insertMention(it.no)),
            smallButton('編輯', () => { editingNo = it.no; renderChat(); }),
            smallButton('刪除', () => {
                if (!confirm(`刪除第 #${it.no} 筆對話？刪除後無法復原，這個編號也不會再使用。`)) return;
                updateRoom(room => { room.items = room.items.filter(x => x.no !== it.no); });
            }, 'danger')
        );
        wrap.appendChild(actions);
        return wrap;
    }

    function renderRooms(chat, room) {
        roomsList.innerHTML = '';
        const sorted = [...chat.rooms].sort((a, b) => b.updatedAt - a.updatedAt);
        if (!sorted.length) {
            const empty = document.createElement('li');
            empty.className = 'rooms-empty';
            empty.textContent = '還沒有聊天室。送出第一則訊息時會自動建立。';
            roomsList.appendChild(empty);
            return;
        }
        sorted.forEach(r => {
            const li = document.createElement('li');
            li.className = 'room-item' + (room && r.id === room.id ? ' active' : '');
            const main = document.createElement('button');
            main.type = 'button';
            main.className = 'room-main';
            const name = document.createElement('span');
            name.className = 'room-name';
            name.textContent = r.title;
            const meta = document.createElement('span');
            meta.className = 'room-meta';
            meta.textContent = `${r.items.length} 筆 · ${formatTime(r.updatedAt)}`;
            main.append(name, meta);
            main.addEventListener('click', () => {
                const c = loadChat();
                if (!c.rooms.some(x => x.id === r.id)) return;
                c.currentId = r.id;
                saveChat(c);
                editingNo = null;
                renderChat();
                scrollChatToEnd();
                if (window.innerWidth < 760) setRoomsOpen(false);
            });
            const tools = document.createElement('span');
            tools.className = 'room-tools';
            tools.append(
                smallButton('改名', () => renameRoom(r.id)),
                smallButton('刪除', () => deleteRoom(r.id), 'danger')
            );
            li.append(main, tools);
            roomsList.appendChild(li);
        });
    }

    function renderChat() {
        const chat = loadChat();
        const room = currentRoom(chat);
        renderRooms(chat, room);

        const count = room ? room.items.length : 0;
        sheet.querySelector('.sheet-title').textContent = room ? room.title : DEFAULT_ROOM_TITLE;
        sheet.querySelector('.chat-capacity').textContent = room ? `${count}/${ITEM_LIMIT} 筆` : '';
        sheet.querySelector('.chat-load-latest').disabled = !latestFtdlItem(room);

        // 小提示：已經開始刪除舊對話，或快要到上限
        if (room && room.trimmedAt) {
            notice.hidden = false;
            notice.textContent = `這個聊天室已超過 ${ITEM_LIMIT} 筆，會保留第 1 筆，並從第 2 筆開始刪除較舊的對話。需要完整保留的話，可以開一個新聊天室，用「載入最新家系圖」接著做。`;
        } else if (room && count >= ITEM_LIMIT - 2) {
            notice.hidden = false;
            notice.textContent = `快到 ${ITEM_LIMIT} 筆上限了：之後會保留第 1 筆，並從第 2 筆開始刪除較舊的對話。`;
        } else {
            notice.hidden = true;
        }

        chatBody.innerHTML = '';
        if (!room || (!room.items.length && !pending)) {
            const empty = document.createElement('div');
            empty.className = 'chat-empty';
            empty.innerHTML = `
                <div class="chat-empty-title">嗨，想畫誰的家？</div>
                <div>選「<b>生成</b>」，直接描述家庭，我會馬上畫出家系圖；</div>
                <div>選「<b>引導</b>」，引導助手會先和你確認目標，再一步步整理家庭故事。</div>`;
            chatBody.appendChild(empty);
        } else {
            room.items.forEach(it => chatBody.appendChild(renderItem(it)));
        }
        if (pending) {
            const wrap = document.createElement('div');
            wrap.className = 'chat-item pending';
            if (pending.user) {
                const { row, b } = bubble('user');
                b.textContent = pending.mode === 'handoff' ? '（交給生成助手）' : pending.user;
                wrap.appendChild(row);
            }
            const { row, b } = bubble('assistant', pending.mode === 'guide' ? AVATAR_GUIDE : AVATAR_GENERATE);
            b.classList.add('typing');
            b.textContent = pending.text || (pending.mode === 'guide' ? '思考中…' : '正在畫家系圖…');
            pending.bubbleEl = b;
            wrap.appendChild(row);
            chatBody.appendChild(wrap);
        }
    }

    sheet.querySelector('.rooms-new').addEventListener('click', () => {
        const chat = loadChat();
        createRoom(chat);
        saveChat(chat);
        editingNo = null;
        renderChat();
        input.focus();
        if (window.innerWidth < 760) setRoomsOpen(false);
    });
    sheet.querySelector('.chat-load-latest').addEventListener('click', () => {
        const room = currentRoom(loadChat());
        const latest = latestFtdlItem(room);
        if (latest) loadFtdl(latest.ftdl, `聊天室「${room.title}」最新（第 #${latest.no} 筆）`);
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !isSheetOpen() || document.querySelector('#ai-settings-overlay.visible')) return;
        if (document.activeElement && document.activeElement.closest('.chat-item')) return; // 正在編輯某一筆
        closeSheet();
    });
    applyMode(mode);
    placeMascot();
    renderChat();

    // --- 主流程 ---
    function reportError(err) {
        console.error('Gemini API error:', err);
        if (err.isTimeout) {
            setStatus(`等待超過 ${Math.round(TIMEOUT_MS / 1000)} 秒仍沒有回應，請稍後再試，或把描述拆短一點。`, 'error');
        } else if (err.isNetwork) {
            setStatus(`無法連上 Google AI Studio（${err.message}），已自動重試 ${NETWORK_RETRIES} 次。請確認網路與 VPN／iCloud 私密轉送，或暫停翻譯等瀏覽器擴充功能後再試；Safari 不穩時可改用 Chrome。`, 'error');
        } else if (err.status === 400 || err.status === 401 || err.status === 403) {
            setStatus(`API 金鑰或模型設定有誤：${err.message}`, 'error');
            openSettings(`呼叫失敗：${err.message}`);
        } else if (err.status === 404) {
            setStatus(`找不到模型「${getModel()}」，請到 API 設定更換模型名稱。`, 'error');
        } else if (err.isBusy) {
            const tried = err.triedModels ? `（已自動重試，也試過 ${err.triedModels.join('、')}）` : '（已自動重試）';
            setStatus(`Gemini 目前使用量太大，暫時無法回應${tried}。通常過幾分鐘就會恢復，請稍後再試，或到「API 設定」換一個模型。`, 'error');
        } else if (err.status === 429) {
            setStatus('已超過 API 使用額度或請求太頻繁，請稍後再試。', 'error');
        } else {
            setStatus(`產生失敗：${err.message}`, 'error');
        }
    }

    function trimmedNote(removed) {
        return removed.length ? `　這個聊天室已超過 ${ITEM_LIMIT} 筆，已刪除較舊的 ${removed.map(n => '#' + n).join('、')}（第 1 筆保留）。` : '';
    }

    function clearInput() {
        input.value = '';
        input.style.height = '';
    }

    async function runGuide(question) {
        const chat = loadChat();
        const room = ensureRoom(chat);
        saveChat(chat);
        const contents = buildContents(room, question, 'guide');
        pending = { user: question, mode: 'guide', text: '' };
        renderChat();
        openSheet();
        scrollChatToEnd();
        clearInput();
        setStatus('引導助手正在回覆…');
        try {
            const reply = await callGemini(contents, {
                mode: 'guide',
                onText: text => {
                    if (!pending) return;
                    pending.text = text;
                    if (pending.bubbleEl) { pending.bubbleEl.textContent = text; scrollChatToEnd(); }
                    if (!isSheetOpen()) showBubble(guidePreview(text));
                }
            });
            pending = null;
            const { item, removed } = addItem({ mode: 'guide', user: question, reply: reply.trim() });
            setStatus(`引導助手已回覆（第 #${item.no} 筆）。${trimmedNote(removed)}`, removed.length ? 'info' : 'success');
            // 對話區收起時，泡泡直接顯示引導助手回覆的內容，不用打開也看得到牠問了什麼
            if (!isSheetOpen()) { showBubble(guidePreview(reply), 'info'); lastStatus = { text: guidePreview(reply), type: 'info' }; }
            scrollChatToEnd();
        } catch (err) {
            pending = null;
            renderChat();
            if (!input.value) input.value = question; // 失敗時把訊息放回輸入框，方便重送
            reportError(err);
        }
    }

    async function runGenerate(question, { handoff = false } = {}) {
        const chat = loadChat();
        const room = ensureRoom(chat);
        saveChat(chat);
        const refNos = parseRefs(question);
        const missing = refNos.filter(no => !room.items.some(it => it.no === no));
        const contents = buildContents(room, question, 'generate');
        pending = { user: question, mode: handoff ? 'handoff' : 'generate', text: '' };
        renderChat();
        if (isSheetOpen()) scrollChatToEnd();
        setStatus(`正在請 ${getModel()} 產生家系圖${room.items.length ? `（帶入聊天室「${room.title}」的前情）` : ''}…`
            + (missing.length ? `　這個聊天室找不到 ${missing.map(n => '#' + n).join('、')}，已略過。` : ''));
        try {
            let reply = await callGemini(contents);
            let ftdl = extractFtdl(reply);
            let errors = loadIntoEditor(ftdl);

            const maxRepair = CONFIG.maxRepairAttempts ?? 1;
            for (let i = 0; i < maxRepair && errors.length > 0; i++) {
                setStatus(`有 ${errors.length} 個語法或關係問題，正在請模型修正…`);
                contents.push({ role: 'model', parts: [{ text: reply }] });
                contents.push({ role: 'user', parts: [{ text: `上面的 FTDL 有以下問題，請修正後只輸出完整的 FTDL：\n${errors.map(e => `第 ${e.lineNumber} 行：${e.message}`).join('\n')}` }] });
                reply = await callGemini(contents);
                ftdl = extractFtdl(reply);
                errors = loadIntoEditor(ftdl);
            }

            pending = null;
            let savedNote = '', removed = [];
            if (ftdl.trim()) {
                const saved = addItem({ mode: handoff ? 'handoff' : 'generate', user: question, ftdl, refs: refNos });
                removed = saved.removed;
                savedNote = `（已存到聊天室「${saved.room.title}」第 #${saved.item.no} 筆）${trimmedNote(removed)}`;
            } else {
                renderChat();
            }

            if (errors.length > 0 && errors.every(e => e.isolated)) {
                // 語法正確、只是有人沒接上關係：照樣畫圖，提醒使用者補上
                executeBtn.disabled = false;
                executeBtn.click();
                setStatus(`家系圖已畫好，但有 ${errors.length} 個人沒有接上任何關係（${errors.map(e => e.message.split(' ')[0]).join('、')}），可到「編輯」頁補上。${savedNote}`, 'error');
            } else if (errors.length > 0) {
                setStatus(`已載入編輯器，但還有 ${errors.length} 個語法或關係問題，請到「編輯」頁修正。${savedNote}`, 'error');
                document.querySelector('.tab-btn[data-view="editor"]')?.click();
            } else {
                executeBtn.disabled = false;
                executeBtn.click();
                setStatus(`完成！家系圖已經畫好了，可以開心去喝一杯了 🍻${savedNote}`, 'success');
                if (!handoff) clearInput();
            }
        } catch (err) {
            pending = null;
            renderChat();
            reportError(err);
        }
    }

    async function handleRun({ handoff = false } = {}) {
        let question = input.value.trim();
        if (handoff) question = question ? `${HANDOFF_TEXT}\n補充：${question}` : HANDOFF_TEXT;
        if (!question) { input.focus(); return; }
        if (!getKey()) {
            const overlay = openSettings('第一次使用請先輸入 Google AI Studio 的 API 金鑰，儲存後會自動送出。');
            overlay.dataset.resume = 'true';
            return;
        }
        if (runBtn.disabled) return;
        setBusy(true, handoff || mode !== 'guide' ? 'generate' : 'guide');
        handoffBtn.disabled = true;
        try {
            if (handoff) {
                clearInput();
                await runGenerate(question, { handoff: true });
            } else if (mode === 'guide') {
                await runGuide(question);
            } else {
                await runGenerate(question);
            }
        } finally {
            setBusy(false);
            handoffBtn.disabled = false;
        }
    }

    if (runBtn) runBtn.addEventListener('click', () => handleRun());
    handoffBtn.addEventListener('click', () => {
        const room = currentRoom(loadChat());
        if (!room || !room.items.length) {
            setStatus('這個聊天室還沒有任何對話。先和引導助手聊聊家庭的狀況，再按「產生家系圖」。', 'error');
            return;
        }
        applyMode('generate'); // 交給生成助手後，強制切回生成模式
        handleRun({ handoff: true });
    });
    if (input) {
        input.addEventListener('keydown', e => {
            // Enter 換行（預設行為），Shift+Enter 送出
            if (e.key === 'Enter' && e.shiftKey && !e.isComposing) {
                e.preventDefault();
                handleRun();
            }
        });
    }
});
