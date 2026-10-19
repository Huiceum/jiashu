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
    const dialogue = document.getElementById('dialogue-container');
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
  chronic: true; Disability: true; // 慢性病、身心障礙（D 大寫）
  wellbeing: 0–1;                 // 身心狀態分數，0 = 很差、1 = 很好，決定節點顏色
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
- 單親或另一位家長不明時，partners 只寫一個人。
- 用拼音或英文當 id，例如 wang_daming、father、child1。
- 描述沒有寫明是誰的故事時，把敘事的主角（標題或故事圍繞的那個人）設為 proband。
- 描述只說「年紀很輕就當媽媽」「六十多歲」這類模糊年齡時，取合理的整數年齡換算，例如六十多歲取 65。

## 程度與關係
- 文字描述的程度要換成 0–1：很差 0.1、差 0.3、普通 0.5、好 0.7、很好 0.9。
- 描述提到某人對另一人的感情（親近、在意、疏遠、衝突）時才寫 bond，不限親子，夫妻、手足、祖孫都可以；箭頭方向就是感情的方向，雙方各自的感受各寫一個 bond（方向相反）。
- 只有描述提到身心狀態、婚姻品質時，才寫 wellbeing、quality。
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
person { id: wang_xiaojie; name: 王小傑; gender: male; birth: 1996; proband: true; wellbeing: 0.8; note: 剛退伍，同住; }
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

    // --- 設定 ---
    function getKey() {
        let stored = '';
        try { stored = localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { /* 無法使用 localStorage */ }
        return stored || CONFIG.geminiApiKey || '';
    }

    function getModel() {
        let stored = '';
        try { stored = localStorage.getItem(MODEL_STORAGE) || ''; } catch (e) { /* 無法使用 localStorage */ }
        return stored || CONFIG.geminiModel || 'gemini-flash-latest';
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
                    <label for="ai-model-input">模型</label>
                    <input id="ai-model-input" type="text" autocomplete="off">
                    <div class="ai-dialog-actions">
                        <button id="ai-key-clear" class="ai-btn-secondary" type="button">清除金鑰</button>
                        <button id="ai-key-cancel" class="ai-btn-secondary" type="button">取消</button>
                        <button id="ai-key-save" class="ai-btn-primary" type="button">儲存</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('visible'); });
            overlay.querySelector('#ai-key-cancel').addEventListener('click', () => overlay.classList.remove('visible'));
            overlay.querySelector('#ai-key-clear').addEventListener('click', () => {
                try { localStorage.removeItem(KEY_STORAGE); } catch (e) { /* 忽略 */ }
                overlay.querySelector('#ai-key-input').value = '';
            });
            overlay.querySelector('#ai-key-save').addEventListener('click', () => {
                const key = overlay.querySelector('#ai-key-input').value.trim();
                const model = overlay.querySelector('#ai-model-input').value.trim();
                try {
                    if (key) localStorage.setItem(KEY_STORAGE, key);
                    if (model) localStorage.setItem(MODEL_STORAGE, model);
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
        overlay.querySelector('#ai-model-input').value = getModel();
        overlay.classList.add('visible');
        setTimeout(() => overlay.querySelector('#ai-key-input').focus(), 50);
        return overlay;
    }

    if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());

    // --- 狀態顯示 ---
    function setStatus(text, type = 'info') {
        let status = document.getElementById('ai-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'ai-status';
            dialogue.appendChild(status);
        }
        if (!text) { status.style.display = 'none'; return; }
        status.className = `ai-status-${type}`;
        status.textContent = text;
        status.style.display = 'block';
        if (type === 'success') setTimeout(() => { if (status.textContent === text) status.style.display = 'none'; }, 6000);
    }

    function setBusy(busy) {
        input.disabled = busy;
        runBtn.disabled = busy;
        runBtn.classList.toggle('is-busy', busy);
        runBtn.textContent = busy ? '產生中…' : '執行';
    }

    // --- Gemini API ---
    const TIMEOUT_MS = CONFIG.requestTimeoutMs ?? 90000;
    const NETWORK_RETRIES = CONFIG.networkRetries ?? 2;

    // 連線中斷（Safari 顯示為 "Load failed"）或逾時時自動重試；HTTP 錯誤不重試
    async function fetchWithRetry(url, options) {
        let lastError;
        for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
            try {
                return await fetch(url, { ...options, signal: controller.signal });
            } catch (err) {
                lastError = err;
                lastError.isNetwork = true;
                lastError.isTimeout = err.name === 'AbortError';
                if (attempt < NETWORK_RETRIES) {
                    setStatus(`連線中斷，正在重試（第 ${attempt + 1} 次）…`);
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            } finally {
                clearTimeout(timer);
            }
        }
        throw lastError;
    }

    async function callGemini(contents) {
        const model = getModel();
        const res = await fetchWithRetry(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getKey() },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT.replace('{{TODAY_YEAR}}', String(new Date().getFullYear())) }] },
                contents,
                generationConfig: { temperature: CONFIG.temperature ?? 0.2 }
            })
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* 非 JSON 回應 */ }
        if (!res.ok) {
            const msg = data && data.error && data.error.message ? data.error.message : `HTTP ${res.status}`;
            const err = new Error(msg);
            err.status = res.status;
            throw err;
        }
        const candidate = data && data.candidates && data.candidates[0];
        const text = candidate && candidate.content && candidate.content.parts
            ? candidate.content.parts.map(p => p.text || '').join('')
            : '';
        if (!text.trim()) {
            const reason = (candidate && candidate.finishReason) || (data && data.promptFeedback && data.promptFeedback.blockReason) || '未知原因';
            throw new Error(`模型沒有回傳內容（${reason}）`);
        }
        return text;
    }

    function extractFtdl(text) {
        let t = text.trim();
        const fenced = t.match(/```(?:ftdl)?\s*\n?([\s\S]*?)```/i);
        if (fenced) t = fenced[1].trim();
        return t;
    }

    function loadIntoEditor(ftdl) {
        editor.value = ftdl;
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        return typeof window.ftdlValidate === 'function' ? window.ftdlValidate() : [];
    }

    // --- 主流程 ---
    async function handleRun() {
        const question = input.value.trim();
        if (!question) { input.focus(); return; }
        if (!getKey()) {
            const overlay = openSettings('第一次使用請先輸入 Google AI Studio 的 API 金鑰，儲存後會自動送出。');
            overlay.dataset.resume = 'true';
            return;
        }

        setBusy(true);
        setStatus(`正在請 ${getModel()} 產生家系圖…`);
        const contents = [{ role: 'user', parts: [{ text: question }] }];
        try {
            let reply = await callGemini(contents);
            let ftdl = extractFtdl(reply);
            let errors = loadIntoEditor(ftdl);

            const maxRepair = CONFIG.maxRepairAttempts ?? 1;
            for (let i = 0; i < maxRepair && errors.length > 0; i++) {
                setStatus(`語法有 ${errors.length} 個問題，正在請模型修正…`);
                contents.push({ role: 'model', parts: [{ text: reply }] });
                contents.push({ role: 'user', parts: [{ text: `上面的 FTDL 驗證失敗，請修正後只輸出完整的 FTDL：\n${errors.map(e => `第 ${e.lineNumber} 行：${e.message}`).join('\n')}` }] });
                reply = await callGemini(contents);
                ftdl = extractFtdl(reply);
                errors = loadIntoEditor(ftdl);
            }

            if (errors.length > 0) {
                setStatus(`已載入編輯器，但還有 ${errors.length} 個語法問題，請到「編輯」頁修正。`, 'error');
                document.querySelector('.tab-btn[data-view="editor"]')?.click();
            } else {
                executeBtn.disabled = false;
                executeBtn.click();
                setStatus('完成！家系圖已經畫好了，可以開心去喝一杯了 🍻', 'success');
                input.value = '';
                input.style.height = '';
            }
        } catch (err) {
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
            } else if (err.status === 429) {
                setStatus('已超過 API 使用額度或請求太頻繁，請稍後再試。', 'error');
            } else {
                setStatus(`產生失敗：${err.message}`, 'error');
            }
        } finally {
            setBusy(false);
        }
    }

    if (runBtn) runBtn.addEventListener('click', handleRun);
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                handleRun();
            }
        });
    }
});
