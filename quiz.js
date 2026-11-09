// quiz.js
// 家庭問卷：填答 PSFD 題目（子女與父母兩方，另一方可本人接手或模擬）→ 寫一段家庭概述 → 畫出家系圖並判定家庭類型。
// 判定直接使用研究本身的模型，不另外設計規則：
//   答案 → 各構念的 Bartlett 分數（與研究相同的 CFA 參數）→ 研究的 4 群高斯混合模型（GMM）。
//   GMM 的另外五個特徵是 GNN 影響力，需要多波家戶資料，問卷無法取得，所以和略過的面向一起積分消去（取邊際分布）。
//   參數由 workplace/04_gnn/export_quiz_centroids.py 匯出；此流程與研究分群的一致率為 87.0%。
// 問卷答案只存在記憶體；概述與分數只有在使用 AI 畫圖時才送到 Gemini。

document.addEventListener('DOMContentLoaded', () => {
    const NORMS = {"measure":{"A":{"items":["m_sat","m_aff","m_conf"],"item_mean":[3.3229,4.1908,3.4572],"item_sd":[0.6011,0.9067,0.8021],"lam":[1.0,1.1177,0.6553],"nu":[0.1043,0.1149,0.0673],"theta":[0.4816,0.3504,0.7774],"score_mean":-0.1078,"score_sd":0.8356},"D":{"items":["P1_happy","P1_life_good","P1_health_good","P1_nolimit"],"item_mean":[4.9683,5.0398,3.3696,0.8505],"item_sd":[1.3204,1.311,0.8281,0.3566],"lam":[1.0,0.9584,0.4739,0.2527],"nu":[0.0182,0.0138,0.0078,0.0085],"theta":[0.1798,0.2529,0.8139,0.9519],"score_mean":-0.0168,"score_sd":0.9632},"E":{"items":["happy","life_good","health_good","nolimit"],"item_mean":[5.1869,5.1866,3.5752,0.8388],"item_sd":[1.1847,1.2411,0.8279,0.3677],"lam":[1.0,0.9493,0.5012,0.2281],"nu":[0.1483,0.1509,0.0749,0.0385],"theta":[0.2516,0.3158,0.7963,0.9741],"score_mean":-0.1568,"score_sd":0.9465},"PE":{"items":["p_aff","p_tell","p_ctell"],"item_mean":[4.1656,2.1141,2.1494],"item_sd":[0.837,1.0372,1.0291],"lam":[0.4693,1.0,1.1374],"nu":[-0.038,-0.0606,-0.0682],"theta":[0.8631,0.3833,0.2023],"score_mean":0.0605,"score_sd":0.8513},"CE":{"items":["c_ptell","c_tell","c_aff"],"item_mean":[2.1695,2.1105,4.0082],"item_sd":[1.0579,1.013,0.8438],"lam":[0.7938,1.0,0.5629],"nu":[-0.0468,-0.0585,-0.048],"theta":[0.4986,0.1879,0.7591],"score_mean":0.0576,"score_sd":0.9782},"K":{"items":["r_dist","r_calls","r_meet"],"item_mean":[5.828,4.2754,4.9922],"item_sd":[2.5702,1.0536,1.3227],"lam":[1.31,1.0,1.3897],"nu":[0.1008,0.0758,0.0964],"theta":[0.212,0.5486,0.1094],"score_mean":-0.0809,"score_sd":0.7066}},"level":["A","D","E","PE","CE","K"],"std_mean":[0.0069,0.0365,0.0243,-0.0074,-0.0205,0.0381],"std_sd":[0.9794,0.9881,0.8563,0.9105,0.8895,0.8229],"weights":[0.21298,0.31041,0.24887,0.22774],"means":[[-0.09415,0.03894,0.06918,0.95415,0.63111,-0.36098],[0.12301,0.11872,0.26911,0.20636,0.23137,0.97319],[0.19939,0.45939,0.43569,-0.63491,-0.40872,-0.61327],[-0.29749,-0.70024,-0.9076,-0.47976,-0.45891,-0.31868]],"covs":[[[1.25575,0.55251,0.11267,0.13023,0.04997,-0.0389],[0.55251,1.08981,0.16391,-0.05519,-0.06236,-0.12638],[0.11267,0.16391,0.92379,-0.14146,-0.01959,-0.17127],[0.13023,-0.05519,-0.14146,0.66856,0.08393,0.03827],[0.04997,-0.06236,-0.01959,0.08393,0.96254,0.08102],[-0.0389,-0.12638,-0.17127,0.03827,0.08102,0.71829]],[[0.94377,0.38859,0.14557,-0.04574,-0.06145,-0.00053],[0.38859,0.8057,0.0786,0.03606,0.04139,-9e-05],[0.14557,0.0786,0.72118,-0.00105,0.09208,-0.00046],[-0.04574,0.03606,-0.00105,0.99493,0.52763,0.00108],[-0.06145,0.04139,0.09208,0.52763,1.1285,0.00092],[-0.00053,-9e-05,-0.00046,0.00108,0.00092,5e-05]],[[0.73971,0.26079,0.04453,0.03011,-0.02989,-0.03753],[0.26079,0.59049,-0.06664,0.07022,-0.04031,-0.06838],[0.04453,-0.06664,0.48548,-0.0017,0.02622,0.04296],[0.03011,0.07022,-0.0017,0.33516,0.07469,-0.0023],[-0.02989,-0.04031,0.02622,0.07469,0.49646,0.01194],[-0.03753,-0.06838,0.04296,-0.0023,0.01194,0.87014]],[[0.96106,0.08942,0.13481,0.03775,-0.08274,-0.01039],[0.08942,0.88677,-0.22426,0.0573,-0.0379,-0.15387],[0.13481,-0.22426,0.87919,-0.08446,-0.03745,-0.12443],[0.03775,0.0573,-0.08446,0.46326,0.14516,0.0693],[-0.08274,-0.0379,-0.03745,0.14516,0.57154,0.03718],[-0.01039,-0.15387,-0.12443,0.0693,0.03718,0.84298]]]};
    const DIMS = ['A', 'D', 'PE', 'K', 'E', 'CE'];
    const DIM_LABEL = { A: '婚姻品質', D: '父母身心', PE: '親密（父母觀點）', K: '親子接觸', E: '子女身心', CE: '親密（子女觀點）' };
    const TYPES = {
        1: { name: '緊密互動型', bg: 'amber', img: 'cat-4', tagline: '天天見面，你帶動我、我帶動你',
            desc: '家人之間接觸最多，常住在一起或住得很近。親近感是雙向的：父母覺得親，孩子也跟著覺得親，反過來也一樣；婚姻和孩子的身心也彼此牽動。',
            tip: '這份緊密是很好的資源。隨著孩子長大，可以一起留一點各自的空間，讓親近不變成壓力。',
            paths: '親子雙方的親近感互相帶動最強，也是唯一一型，孩子的身心和父母的婚姻彼此連動。' },
        0: { name: '心近身遠型', bg: 'apricot', img: 'cat-7', tagline: '見面不多，心卻很近',
            desc: '家人不常見面，也可能住得比較遠，但彼此感情好、願意說心事。親子的親近循環和夫妻的互相支持同時存在，只是各自進行。',
            tip: '距離沒有帶走感情。固定的一通電話或一則訊息，就很能維持這份連結。',
            paths: '婚姻和父母身心互相支持，親子的親近感也互相帶動，兩個循環同時存在，孩子的身心則不在其中。' },
        2: { name: '各自安好型', bg: 'clay', img: 'cat-6', tagline: '各有各的生活，也都過得不錯',
            desc: '父母和孩子的身心狀態都不錯，彼此往來和說心事比較少。家裡的互動重心偏向父母兩人，婚姻和父母身心互相支持。這不代表感情不好，只是大家習慣各自安好。',
            tip: '想靠近一點的時候，可以從分享一件小事開始，不一定要談很深。',
            paths: '互動集中在父母身上：婚姻和父母身心互相支持，婚姻好時父母也覺得和孩子更親，但沒有親子雙方互相帶動的循環。' },
        3: { name: '身心共振型', bg: 'stone', img: 'cat-2', tagline: '一個人累了，另一個人也睡不好',
            desc: '父母和孩子最近的身心都比較辛苦，孩子的狀態特別容易牽動父母。彼此不太容易說出心事；見面多的時候，也可能伴隨照顧的壓力。',
            tip: '這是目前的狀態，不是這個家的定義。先照顧好自己，也可以讓家人以外的人一起分擔。',
            paths: '親近感仍然互相帶動；虛線是負向路徑：父母身心較差時接觸變多，接觸多時父母身心又變差，像是照顧壓力的循環。' }
    };
    const SHARE = { 1: '32%', 0: '21%', 2: '25%', 3: '22%' }; // 研究樣本 1,411 筆家戶 × 波的比例

    const YEAR = new Date().getFullYear();
    const S5 = [['總是', 5], ['經常', 4], ['有時', 3], ['偶爾', 2], ['從未', 1]];
    const AFF = [['1 很不好', 1], ['2', 2], ['3', 3], ['4', 4], ['5 很好', 5]];
    const SEVEN = (lo, hi) => [1, 2, 3, 4, 5, 6, 7].map(n => [n === 1 ? `1 ${lo}` : n === 7 ? `7 ${hi}` : String(n), n]);
    const HEALTH = [['很好', 5], ['好', 4], ['普通', 3], ['不好', 2], ['很不好', 1]];
    const NOLIMIT = [['有', 0], ['沒有', 1]];
    const wellbeing = keys => [
        { id: keys[0], text: '整個來說，最近這陣子的生活過得快樂嗎？', options: SEVEN('很不快樂', '很快樂') },
        { id: keys[1], text: '過去一年來，生活過得好不好？', options: SEVEN('很不好', '很好') },
        { id: keys[2], text: '你認為自己目前的健康狀況如何？', options: HEALTH },
        { id: keys[3], text: '最近兩星期，有沒有因為身體不舒服或受傷而影響到生活作息（如工作、家事）？', options: NOLIMIT }
    ];

    const MARITAL = [['已婚', 1], ['同居', 2], ['分居', 3], ['離婚', 4], ['喪偶', 5], ['未婚', 6], ['其他／不想說', 7]];
    const FORMER = { 3: 'separated', 4: 'divorced', 5: 'widowed' };   // 婚姻狀態代碼 → FTDL 的 status
    const partnered = a => a.marital === 1 || a.marital === 2;      // 只有已婚或同居者回答婚姻品質（與研究相同）

    const state = { step: 0, answers: {}, basics: {}, otherMode: 'simulate', story: '', result: null, error: '', busy: false };

    // --- 題組 ---
    const isChild = () => state.basics.role === 'child';
    const parentWord = () => (isChild() ? (state.basics.targetParent === 'mother' ? '媽媽' : '爸爸') : (state.basics.selfParent === 'mother' ? '媽媽' : '爸爸'));

    function childItems() {
        const p = parentWord();
        return { key: 'child', title: '孩子這一邊', groups: [
            { title: '最近的自己', items: wellbeing(['happy', 'life_good', 'health_good', 'nolimit']) },
            { title: `和${p}的關係`, items: [
                { id: 'c_ptell', text: `${p}平常會不會跟你說心事或煩惱？`, options: S5 },
                { id: 'c_tell', text: `你平常會不會跟${p}說心事或煩惱？`, options: S5 },
                { id: 'c_aff', text: `你和${p}的感情好不好？`, options: AFF }
            ] }
        ] };
    }

    function parentItems() {
        return { key: 'parent', title: `${parentWord()}這一邊`, groups: [
            { title: '最近的自己', items: wellbeing(['P1_happy', 'P1_life_good', 'P1_health_good', 'P1_nolimit']) },
            { title: '夫妻或伴侶關係', items: [
                { id: 'marital', text: '目前的婚姻或伴侶狀況是？', options: MARITAL, noSkip: true },
                { id: 'partner_rel', text: '現在的配偶或伴侶，和這位孩子是什麼關係？', options: [['孩子的另一位家長（親生或收養）', 1], ['繼父母，或是家長的伴侶', 2], ['不確定／不想說', 3]], noSkip: true, when: partnered },
                { id: 'ex_rel', text: '這段婚姻的對象，是這位孩子的另一位家長嗎？', options: [['是', 1], ['不是', 2], ['不確定／不想說', 3]], noSkip: true, when: a => FORMER[a.marital] !== undefined },
                { id: 'm_sat', text: '整體而言，對婚姻（同居）生活滿意嗎？', options: [['很滿意', 4], ['還算滿意', 3], ['不太滿意', 2], ['很不滿意', 1]], when: partnered },
                { id: 'm_aff', text: '和配偶（同居伴侶）的感情好不好？', options: AFF, when: partnered },
                { id: 'm_conf', text: '和配偶（同居伴侶）平常會不會意見不合？', options: [['總是', 1], ['經常', 2], ['有時', 3], ['偶爾', 4], ['從未', 5]], when: partnered }
            ] },
            { title: '和孩子的關係', hint: '家裡有不只一位孩子時，請想著同一位孩子回答。', items: [
                { id: 'p_aff', text: '你和孩子的感情好不好？', options: AFF },
                { id: 'p_tell', text: '你平常會不會跟孩子說心事或煩惱？', options: S5 },
                { id: 'p_ctell', text: '孩子平常會不會跟你說心事或煩惱？', options: S5 },
                { id: 'r_dist', text: '孩子目前的住處和你的距離多遠？', options: [['同住', 8], ['隔壁或同棟', 7], ['走路 10 分鐘內', 6], ['車程 30 分鐘內', 5], ['車程 31–60 分鐘', 4], ['車程 1–2 小時', 3], ['車程 2 小時以上', 2], ['國外', 1]] },
                { id: 'r_calls', text: '去年平均每月打電話（含網路即時通訊）的次數？', options: [['幾乎每天', 5], ['每週一至三次', 4], ['每月一至三次', 3], ['每月不到一次', 2], ['幾乎不通電話', 1]], when: a => a.r_dist !== 8 },
                { id: 'r_meet', text: '去年見面（不含視訊）的次數？', options: [['幾乎每天', 6], ['每週一至三次', 5], ['每月一至三次', 4], ['二、三個月一次', 3], ['每年一、二次', 2], ['幾乎不碰面', 1]], when: a => a.r_dist !== 8 }
            ] }
        ] };
    }

    const firstSection = () => (isChild() ? childItems() : parentItems());
    const secondSection = () => (isChild() ? parentItems() : childItems());
    const otherWord = () => (isChild() ? parentWord() : '孩子');
    const STEPS = ['intro', 'basic', 'first', 'other', 'second', 'story', 'working'];

    // --- 計分 ---
    function effectiveAnswers() {
        const a = { ...state.answers };
        if (a.r_dist === 8) { a.r_calls = 5; a.r_meet = 6; }    // 同住者的電話、見面以最高頻率計（與研究資料相同）
        if (!partnered(a)) { delete a.m_sat; delete a.m_aff; delete a.m_conf; }
        return a;
    }

    function bartlett(answers, m) {
        let num = 0, den = 0;
        m.items.forEach((item, i) => {
            const v = answers[item];
            if (typeof v !== 'number') return;
            const w = m.lam[i] / m.theta[i];
            num += w * ((v - m.item_mean[i]) / m.item_sd[i] - m.nu[i]);
            den += w * m.lam[i];
        });
        return den === 0 ? null : (num / den - m.score_mean) / m.score_sd;
    }

    // 只用有回答的面向，計算高斯成分的對數密度（Cholesky）
    function logGaussian(x, mean, cov) {
        const n = x.length, L = x.map(() => new Array(n).fill(0));
        let logDet = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = cov[i][j];
                for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
                if (i === j) { L[i][i] = Math.sqrt(sum); logDet += 2 * Math.log(L[i][i]); } else L[i][j] = sum / L[j][j];
            }
        }
        const y = new Array(n).fill(0);
        let quad = 0;
        for (let i = 0; i < n; i++) {
            let sum = x[i] - mean[i];
            for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
            y[i] = sum / L[i][i];
            quad += y[i] * y[i];
        }
        return -0.5 * (quad + logDet);
    }

    function score() {
        const a = effectiveAnswers();
        const z = {};
        NORMS.level.forEach((d, i) => {
            const v = bartlett(a, NORMS.measure[d]);
            if (v !== null) z[d] = (v - NORMS.std_mean[i]) / NORMS.std_sd[i];
        });
        const idx = NORMS.level.map((d, i) => (z[d] === undefined ? -1 : i)).filter(i => i >= 0);
        const x = idx.map(i => z[NORMS.level[i]]);
        const logp = NORMS.weights.map((w, k) => Math.log(w) + logGaussian(x, idx.map(i => NORMS.means[k][i]), idx.map(i => idx.map(j => NORMS.covs[k][i][j]))));
        const top = Math.max(...logp);
        const w = logp.map(l => Math.exp(l - top));
        const total = w.reduce((s, v) => s + v, 0);
        const ranked = w.map((v, k) => ({ type: k, prob: v / total })).sort((p, q) => q.prob - p.prob);
        return { type: ranked[0].type, near: ranked[1].prob >= 0.2 ? ranked[1].type : null, probs: ranked, z, usedCount: idx.length };
    }

    const toUnit = z => Math.max(0.05, Math.min(0.95, 0.5 + 0.3 * z)).toFixed(2);

    // --- FTDL ---
    function withTypeMeta(ftdl, t) {
        const lines = `    family_type: ${t.name};\n    background: ${t.bg};\n`;
        const cleaned = ftdl.replace(/^\s*(family_type|background)\s*:.*$\n?/gm, '');
        if (/metadata\s*\{/.test(cleaned)) return cleaned.replace(/metadata\s*\{\n?/, m => `${m.endsWith('\n') ? m : m + '\n'}${lines}`);
        return `metadata {\n${lines}    date: ${YEAR};\n}\n\n${cleaned}`;
    }

    // AI 把現任伴侶寫成孩子親生家長時的防呆：孩子填答時，把孩子從「現任婚姻／同居」那段移到問卷中的家長名下
    function enforceNotBioParent(ftdl) {
        const a = state.answers;
        if (!partnered(a) || a.partner_rel === 1 || !isChild()) return ftdl;
        const people = ftdl.match(/person\s*\{[^}]*\}/g) || [];
        const field = (b, k) => (b.match(new RegExp(`\\b${k}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
        const proband = people.find(b => /proband\s*:\s*true/.test(b));
        const child = proband && field(proband, 'id');
        if (!child) return ftdl;
        const wanted = parentWord() === '媽媽' ? 'female' : 'male';
        const extra = [];
        const out = ftdl.replace(/relationship\s*\{[^}]*\}/g, block => {
            if (!/status\s*:\s*(married|cohabiting)/.test(block)) return block;
            const kids = ((block.match(/children\s*:\s*\[([^\]]*)\]/) || [])[1] || '').split(',').map(v => v.trim()).filter(Boolean);
            if (!kids.includes(child)) return block;
            const partners = ((block.match(/partners\s*:\s*\[([^\]]*)\]/) || [])[1] || '').split(',').map(v => v.trim());
            const parent = partners.find(id => field(people.find(b => field(b, 'id') === id) || '', 'gender') === wanted) || partners[0];
            extra.push(`relationship {\n    partners: [${parent}];\n    children: [${child}];\n}`);
            const rest = kids.filter(k => k !== child);
            return rest.length ? block.replace(/children\s*:\s*\[[^\]]*\]/, `children: [${rest.join(', ')}]`) : block.replace(/\s*children\s*:\s*\[[^\]]*\]\s*;?/, '');
        });
        return extra.length ? `${out}\n\n${extra.join('\n')}\n` : out;
    }

    // AI 仍畫出伴侶時的防呆：問卷說沒有伴侶，就拿掉這位家長那段關係的現任狀態與補上的「不詳」家長
    function enforceNoPartner(ftdl) {
        if (partnered(state.answers)) return ftdl;
        const proband = (ftdl.match(/person\s*\{[^}]*\}/g) || []).find(b => /proband\s*:\s*true/.test(b));
        const probandId = proband && (proband.match(/\bid\s*:\s*([\w-]+)/) || [])[1];
        if (!probandId) return ftdl;
        const hasId = (list, id) => (list || '').split(',').map(v => v.trim()).includes(id);
        const removed = [];
        const out = ftdl.replace(/relationship\s*\{[^}]*\}/g, block => {
            const partners = (block.match(/partners\s*:\s*\[([^\]]*)\]/) || [])[1];
            const children = (block.match(/children\s*:\s*\[([^\]]*)\]/) || [])[1];
            if (!(isChild() ? hasId(children, probandId) : hasId(partners, probandId))) return block;
            let b = block.replace(/^\s*status\s*:\s*(married|cohabiting)\s*;\s*$\n?/gm, '').replace(/\bstatus\s*:\s*(married|cohabiting)\s*;\s*/g, '')
                .replace(/^\s*quality\s*:[^;]*;\s*$\n?/gm, '').replace(/\bquality\s*:[^;]*;\s*/g, '');
            const kept = partners.split(',').map(v => v.trim()).filter(id => {
                if (/^unknown_/.test(id)) { removed.push(id); return false; }
                return true;
            });
            return b.replace(/partners\s*:\s*\[[^\]]*\]/, `partners: [${kept.join(', ')}]`);
        });
        return removed.reduce((f, id) => f.replace(new RegExp(`person\\s*\\{[^}]*\\bid\\s*:\\s*${id}\\s*;[^}]*\\}\\n?`), ''), out);
    }

    function simpleFtdl(r) {
        const t = TYPES[r.type], b = state.basics;
        const childSelf = isChild();
        const parentGender = parentWord() === '媽媽' ? 'female' : 'male';
        const otherGender = parentGender === 'female' ? 'male' : 'female';
        const otherName = parentGender === 'female' ? '爸爸' : '媽媽';
        const birth = age => (age ? ` birth: ${YEAR - age};` : '');
        const childAge = childSelf ? b.age : b.childAge;
        const childGender = childSelf ? b.gender : b.childGender;
        const parentAge = childSelf ? null : b.age;
        const out = [`metadata {\n    title: 我的家;\n    family_type: ${t.name};\n    background: ${t.bg};\n    date: ${YEAR};\n}`, ''];
        out.push(`person { id: parent_a; name: ${parentWord()}; gender: ${parentGender};${birth(parentAge)}${childSelf ? '' : ' proband: true;'} }`);
        const ans = state.answers, former = FORMER[ans.marital];
        const coParent = partnered(ans) ? ans.partner_rel === 1 : !!former && ans.ex_rel === 1;   // 這個人確定是孩子的另一位家長
        const newPartner = partnered(ans) && !coParent;                                          // 現任伴侶，但不確定或不是孩子的家長
        if (coParent) out.push(`person { id: parent_b; name: ${otherName}; gender: ${otherGender};${ans.marital === 5 ? ' death: true;' : ''} }`);
        if (newPartner) out.push(`person { id: partner; name: ${parentWord()}的伴侶; gender: other; }`);
        out.push(`person { id: child; name: ${childSelf ? '我' : '孩子'}; gender: ${childGender || 'other'};${birth(childAge)}${childSelf ? ' proband: true;' : ''} }`);
        const q = partnered(ans) && r.z.A !== undefined ? `\n    quality: ${toUnit(r.z.A)};` : '';
        const status = ans.marital === 1 ? 'married' : ans.marital === 2 ? 'cohabiting' : former;
        const statusLine = status ? `\n    status: ${status};` : '';
        if (coParent) {
            out.push(`\nrelationship {\n    partners: [parent_a, parent_b];${statusLine}${q}\n    children: [child];\n}`);
        } else {
            out.push(`\nrelationship {\n    partners: [parent_a];\n    children: [child];\n}`);
            if (newPartner) out.push(`\nrelationship {\n    partners: [parent_a, partner];${statusLine}${q}\n}`);
        }
        if (r.z.PE !== undefined) out.push(`bond { from: parent_a; to: child; closeness: ${toUnit(r.z.PE)}; }`);
        if (r.z.CE !== undefined) out.push(`bond { from: child; to: parent_a; closeness: ${toUnit(r.z.CE)}; }`);
        return out.join('\n');
    }

    function relationshipRule() {
        const a = state.answers, p = parentWord();
        const noGuess = `沒有寫明的人不要編造，也不要補上不詳的家長。`;
        if (partnered(a)) {
            const st = a.marital === 1 ? 'married' : 'cohabiting';
            const label = a.marital === 1 ? '已婚' : '同居';
            if (a.partner_rel === 1) return `${p}目前${label}，對象是孩子的另一位家長（親生或收養）。兩人的 relationship 寫 status: ${st};，children 放孩子。`;
            if (a.partner_rel === 2) return `${p}目前${label}，但對象是孩子的繼父母或${p}的伴侶，不是孩子的親生家長。絕對不可以把這個人寫成孩子的親生家長，也不可以直接叫他「爸爸」或「媽媽」（概述用了「繼父」「繼母」等稱呼時照用）。孩子不可以放在${p}和這個人那段 relationship 的 children；這段寫 status: ${st};。孩子的另一位親生家長依概述畫；概述沒提就標成不詳。`;
            return `${p}目前${label}，但不確定這個人是否為孩子的親生家長。除非家庭概述明確寫出，不可以把這個人畫成孩子的親生家長。這段 relationship 寫 status: ${st};，children 不放孩子。`;
        }
        const former = FORMER[a.marital];
        if (former) {
            const label = { separated: '分居', divorced: '離婚', widowed: '喪偶' }[former];
            if (a.ex_rel === 1) return `${p}目前${label}，對象是孩子的另一位家長。兩人的 relationship 寫 status: ${former};，children 放孩子，不可以寫成現任配偶，也不要寫 quality。${former === 'widowed' ? '過世的一方 person 寫 death: true;。' : ''}`;
            return `${p}目前${label}，這段婚姻的對象${a.ex_rel === 2 ? '不是' : '不確定是不是'}孩子的另一位家長。不可以把那個人畫成孩子的家長，也不可以把任何人畫成${p}現在的配偶或同居伴侶。partners 只放${p}一人，children 放孩子。${noGuess}`;
        }
        return `${p}${a.marital === 6 ? '未婚' : '的婚姻狀況未說明'}，目前沒有已知的配偶或同居伴侶。不可以把任何人畫成${p}現在的配偶或同居伴侶，不可寫 status: married、status: cohabiting 或 quality。只有家庭概述明確提到的對象才畫出來；否則 partners 只放${p}一人，children 放孩子。${noGuess}`;
    }

    function aiPrompt(r) {
        const t = TYPES[r.type], b = state.basics;
        const facts = [`今年是 ${YEAR} 年。`,
            isChild() ? `填答者是孩子，${b.age} 歲，性別 ${b.gender || '未說明'}，設為 proband；問卷中的家長是${parentWord()}。`
                : `填答者是${parentWord()}，${b.age} 歲，設為 proband；問卷中的孩子 ${b.childAge} 歲，性別 ${b.childGender || '未說明'}。`];
        const vals = [`metadata 寫 family_type: ${t.name}; background: ${t.bg}; date: ${YEAR};`];
        if (r.z.A !== undefined) vals.push(`${parentWord()}和現任配偶或同居伴侶的 relationship 寫 quality: ${toUnit(r.z.A)};`);
        if (r.z.PE !== undefined) vals.push(`bond 從${parentWord()}到問卷中的孩子，closeness: ${toUnit(r.z.PE)};`);
        if (r.z.CE !== undefined) vals.push(`bond 從問卷中的孩子到${parentWord()}，closeness: ${toUnit(r.z.CE)};`);
        const partnerRule = `\n\n【婚姻與伴侶狀況，一定要遵守】\n${relationshipRule()}`;
        return `以下是一份家庭問卷的結果和填答者寫的家庭概述，請畫成家系圖。\n\n【基本資料】\n${facts.join('\n')}\n\n【家庭概述】\n${state.story}\n\n【問卷換算的數值，一定要寫入】\n${vals.join('\n')}${partnerRule}\n\n人物、稱呼與家庭結構以家庭概述為準；上面的數值以問卷為準。`;
    }

    // --- 介面 ---
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const overlay = document.createElement('div');
    overlay.id = 'quiz-overlay'; overlay.hidden = true;
    overlay.innerHTML = '<div id="quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="quiz-title"></div>';
    document.body.appendChild(overlay);
    const dialog = overlay.firstChild;

    const panel = document.createElement('aside');
    panel.id = 'quiz-result'; panel.hidden = true; panel.setAttribute('aria-label', '家庭類型結果');
    document.body.appendChild(panel);
    const reopen = document.createElement('button');
    reopen.type = 'button'; reopen.id = 'quiz-reopen'; reopen.hidden = true; reopen.textContent = '查看家庭類型';
    document.body.appendChild(reopen);

    function open() { overlay.hidden = false; render(); }
    function close() { overlay.hidden = true; }
    function dirty() { return Object.keys(state.answers).length > 0 || state.story.trim(); }
    function tryClose() {
        if (state.busy) return;
        if (!dirty() || window.confirm('要離開問卷嗎？已填的答案會保留到你關閉這個頁面為止。')) { close(); location.hash = '#/'; }
    }
    function restart() {
        Object.assign(state, { step: 0, answers: {}, basics: {}, otherMode: 'simulate', story: '', result: null, error: '' });
        panel.hidden = true; reopen.hidden = true; open();
    }
    function go(step) { state.step = step; state.error = ''; render(); dialog.scrollTop = 0; }

    function questionHtml(q) {
        const cur = state.answers[q.id];
        const name = `q_${q.id}`;
        const opts = q.options.map(([label, v]) => `<label class="quiz-chip"><input type="radio" name="${name}" data-q="${q.id}" value="${v}" ${cur === v ? 'checked' : ''}><span>${label}</span></label>`).join('');
        const skip = q.noSkip ? '' : `<label class="quiz-chip quiz-skip"><input type="radio" name="${name}" data-q="${q.id}" value="skip" ${cur === null ? 'checked' : ''}><span>不想回答</span></label>`;
        return `<fieldset class="quiz-q" data-qid="${q.id}"><legend>${q.text}</legend><div class="quiz-options">${opts}${skip}</div></fieldset>`;
    }

    function sectionHtml(sec) {
        const a = effectiveRaw();
        return sec.groups.map(g => {
            const items = g.items.filter(q => !q.when || q.when(a)).map(questionHtml).join('');
            return `<section class="quiz-group"><h3>${g.title}</h3>${g.hint ? `<p class="quiz-hint">${g.hint}</p>` : ''}${items}</section>`;
        }).join('');
    }
    const effectiveRaw = () => state.answers;

    function shell(title, body, foot) {
        const visible = STEPS.indexOf(STEPS[state.step]);
        dialog.innerHTML = `<header class="quiz-head"><div class="quiz-bar"><span style="width:${Math.round(100 * visible / (STEPS.length - 1))}%"></span></div>
            <button type="button" class="quiz-x" aria-label="關閉問卷" title="關閉">×</button></header>
            <h2 id="quiz-title" tabindex="-1">${title}</h2><div class="quiz-body">${body}</div>
            ${state.error ? `<p class="quiz-error" role="alert">${esc(state.error)}</p>` : ''}<footer class="quiz-foot">${foot}</footer>`;
        dialog.querySelector('.quiz-x').addEventListener('click', tryClose);
        dialog.querySelector('#quiz-title').focus({ preventScroll: true });
    }

    function radioRow(name, label, options, cur) {
        return `<fieldset class="quiz-q"><legend>${label}</legend><div class="quiz-options">${options.map(([t, v]) => `<label class="quiz-chip"><input type="radio" name="${name}" value="${v}" ${cur === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>`;
    }
    const nav = (back, nextText, nextId = 'quiz-next') => `${back ? '<button type="button" class="quiz-btn ghost" id="quiz-back">上一步</button>' : '<span></span>'}<button type="button" class="quiz-btn" id="${nextId}">${nextText}</button>`;
    const on = (id, fn) => dialog.querySelector('#' + id)?.addEventListener('click', fn);
    const GENDER = [['女', 'female'], ['男', 'male'], ['其他／不想說', 'other']];

    function renderBasic() {
        const b = state.basics;
        let body = radioRow('role', '你是？', [['孩子', 'child'], ['父母', 'parent']], b.role);
        body += `<label class="quiz-field"><span>你今年幾歲？</span><input id="quiz-age" type="number" inputmode="numeric" min="10" max="110" value="${b.age || ''}"></label>`;
        if (b.role === 'child') {
            body += radioRow('gender', '你的性別', GENDER, b.gender);
            body += radioRow('targetParent', '接下來想著哪一位家長回答？', [['爸爸', 'father'], ['媽媽', 'mother']], b.targetParent);
        } else if (b.role === 'parent') {
            body += radioRow('selfParent', '你是孩子的？', [['爸爸', 'father'], ['媽媽', 'mother']], b.selfParent);
            body += `<label class="quiz-field"><span>接下來想著的這位孩子幾歲？</span><input id="quiz-child-age" type="number" inputmode="numeric" min="0" max="90" value="${b.childAge || ''}"></label>`;
            body += radioRow('childGender', '這位孩子的性別', GENDER, b.childGender);
        }
        shell('先認識你', body, nav(true, '下一步'));
        dialog.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => { readBasicNumbers(); b[r.name] = r.value; renderBasic(); }));
        on('quiz-back', () => { readBasicNumbers(); go(0); });
        on('quiz-next', () => {
            readBasicNumbers();
            const miss = !b.role ? '請選擇你是孩子或父母。' : !(b.age >= 10 && b.age <= 110) ? '請填入 10 到 110 之間的年齡。'
                : b.role === 'child' ? (!b.gender ? '請選擇性別。' : !b.targetParent ? '請選擇想著哪一位家長。' : '')
                : !b.selfParent ? '請選擇你是爸爸或媽媽。' : !(b.childAge >= 0 && b.childAge <= 90 && b.childAge !== undefined) ? '請填入孩子的年齡。' : !b.childGender ? '請選擇孩子的性別。' : '';
            if (miss) { state.error = miss; renderBasic(); return; }
            go(2);
        });
    }
    function readBasicNumbers() {
        const a = dialog.querySelector('#quiz-age'), c = dialog.querySelector('#quiz-child-age');
        if (a) state.basics.age = a.value === '' ? undefined : Number(a.value);
        if (c) state.basics.childAge = c.value === '' ? undefined : Number(c.value);
    }

    function renderSection(sec, banner, backStep, nextStep) {
        shell(sec.title, banner + sectionHtml(sec), nav(true, '下一步'));
        dialog.querySelectorAll('.quiz-q input[type=radio]').forEach(r => r.addEventListener('change', () => {
            const q = r.dataset.q;
            state.answers[q] = r.value === 'skip' ? null : Number(r.value);
            if (q === 'marital' || q === 'r_dist') { const top = dialog.scrollTop; renderSection(sec, banner, backStep, nextStep); dialog.scrollTop = top; }
            else r.closest('.quiz-q').classList.remove('missing');
        }));
        on('quiz-back', () => go(backStep));
        on('quiz-next', () => {
            const a = effectiveRaw();
            const missing = sec.groups.flatMap(g => g.items).filter(q => (!q.when || q.when(a)) && a[q.id] === undefined);
            dialog.querySelectorAll('.quiz-q.missing').forEach(e => e.classList.remove('missing'));
            if (missing.length) {
                missing.forEach(q => dialog.querySelector(`[data-qid="${q.id}"]`)?.classList.add('missing'));
                dialog.querySelector(`[data-qid="${missing[0].id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            go(nextStep);
        });
    }

    function renderOther() {
        const w = otherWord();
        const body = `<p>接下來的題目要從<b>${w}</b>的角度回答。</p>
            ${radioRow('otherMode', `${w}現在可以自己填嗎？`, [[`可以，交給${w}填`, 'real'], [`不行，我站在${w}的角度模擬`, 'simulate']], state.otherMode)}
            <p class="quiz-hint">${w}本人填的結果會更準。模擬時，請想像${w}自己會怎麼回答，不是你希望的答案。</p>`;
        shell('換另一邊', body, nav(true, '開始'));
        dialog.querySelectorAll('input[name=otherMode]').forEach(r => r.addEventListener('change', () => { state.otherMode = r.value; }));
        on('quiz-back', () => go(2));
        on('quiz-next', () => go(4));
    }

    function renderStory() {
        const body = `<p>用幾句話介紹你的家，我們會把它畫成家系圖。不用寫得完整，想到什麼寫什麼。</p>
            <ul class="quiz-prompts"><li>家裡有誰？可以寫名字、暱稱或「大姊」這樣的稱呼，大約幾歲</li><li>誰和誰住在一起？爸媽的婚姻狀況？</li><li>誰和誰特別親、誰比較疏遠？</li><li>最近家裡發生了什麼事？</li></ul>
            <textarea id="quiz-story" rows="7" maxlength="1500" placeholder="例如：我和爸媽住在台中，爸爸 58 歲開計程車，媽媽 55 歲是家管。哥哥大我三歲，已經結婚搬到台北。我什麼事都跟媽媽說，和爸爸比較少聊天。">${esc(state.story)}</textarea>
            <p class="quiz-privacy">用 AI 畫圖時，這段文字和問卷換算的分數會送到 Google Gemini。不想寫真名可以用暱稱；如果不想送出，選「只用問卷畫簡圖」。</p>`;
        shell('寫一段你的家', body, `<button type="button" class="quiz-btn ghost" id="quiz-back">上一步</button><span class="quiz-foot-right"><button type="button" class="quiz-btn ghost" id="quiz-simple">只用問卷畫簡圖</button><button type="button" class="quiz-btn" id="quiz-ai">畫出我的家</button></span>`);
        const ta = dialog.querySelector('#quiz-story');
        ta.addEventListener('input', () => { state.story = ta.value; });
        on('quiz-back', () => go(4));
        on('quiz-simple', () => finish(false));
        on('quiz-ai', () => {
            if (state.story.trim().length < 10) { state.error = '再多寫一點吧，至少介紹一下家裡有誰。'; renderStory(); return; }
            const ai = window.FTDLAI;
            if (!ai.hasKey()) { ai.openSettings('請先輸入 Google AI Studio 的 API 金鑰，儲存後再按一次「畫出我的家」。'); return; }
            finish(true);
        });
    }

    function renderWorking() {
        dialog.innerHTML = `<div class="quiz-working" role="status"><img src="assets/cats/cat-1-run.webp" width="110" height="110" alt=""><h2 id="quiz-title">正在畫你的家…</h2><p>通常要十幾秒到一分鐘</p></div>`;
    }

    function render() {
        const name = STEPS[state.step];
        if (name === 'intro') {
            shell('你家是哪一種家庭？', `<p>這份問卷的題目來自<b>臺灣家庭動態調查（PSFD）</b>。回答約 20 題、再寫一小段家庭介紹，就能畫出你家的家系圖，並看看最接近研究中的哪一種家庭。</p>
                <div class="quiz-mascots">${[1, 0, 2, 3].map(k => `<figure><img src="assets/cats/${TYPES[k].img}.webp" alt=""><figcaption>${TYPES[k].name}</figcaption></figure>`).join('')}</div>
                <ul class="quiz-notes"><li>大約 5 分鐘，可以略過不想回答的題目。</li><li>孩子和父母兩邊都要回答：另一方能親自填最好，不行也可以由你模擬。</li><li>答案只留在這個頁面，不會存下來。</li><li>這是自我探索的小工具，不是心理測驗或診斷。未滿 18 歲建議有大人陪同。</li></ul>`, nav(false, '開始'));
            on('quiz-next', () => go(1));
        } else if (name === 'basic') renderBasic();
        else if (name === 'first') renderSection(firstSection(), '<p class="quiz-hint">請依你自己的狀況回答。</p>', 1, 3);
        else if (name === 'other') renderOther();
        else if (name === 'second') {
            const w = otherWord();
            const banner = state.otherMode === 'real'
                ? `<p class="quiz-banner">請把裝置交給<b>${w}</b>，由${w}自己回答。題目裡的「你」就是${w}。</p>`
                : `<p class="quiz-banner">請站在<b>${w}</b>的角度，想像${w}會怎麼回答。題目裡的「你」就是${w}。</p>`;
            renderSection(secondSection(), banner, 3, 5);
        } else if (name === 'story') renderStory();
        else renderWorking();
    }

    async function finish(useAi) {
        const r = score();
        if (r.usedCount < 4) {
            state.error = '回答的題目太少，還沒辦法判斷家庭類型。請回到前面，多回答幾題（至少要涵蓋六個面向中的四個）。';
            renderStory();
            return;
        }
        const t = TYPES[r.type];
        state.result = r; state.drawnWithAi = false; state.aiNote = '';
        if (useAi) {
            state.busy = true;
            go(STEPS.indexOf('working'));
            try {
                const res = await window.FTDLAI.generateFromPrompt(aiPrompt(r), {
                    finalize: f => withTypeMeta(enforceNotBioParent(enforceNoPartner(f)), t)
                });
                state.busy = false;
                if (res.ok) { state.drawnWithAi = true; showResult(); return; }
                state.aiNote = 'AI 畫的圖有問題，先用問卷資料畫了簡圖。';
            } catch (err) {
                state.busy = false;
                state.result = null;
                state.step = STEPS.indexOf('story');
                state.error = `AI 暫時無法畫圖：${err.message || err}。可以再試一次，或選「只用問卷畫簡圖」。`;
                render();
                return;
            }
        }
        window.FTDLAI.drawFtdl(simpleFtdl(r));
        showResult();
    }

    function showResult() {
        close();
        document.querySelector('.tab-btn[data-view="canvas"]')?.click();
        const r = state.result, t = TYPES[r.type], b = state.basics;
        const age = isChild() ? b.age : b.childAge;
        const bars = DIMS.filter(d => r.z[d] !== undefined).map(d => {
            const z = Math.max(-2, Math.min(2, r.z[d]));
            const pct = Math.abs(z) * 25;
            const word = r.z[d] > 0.4 ? '偏高' : r.z[d] < -0.4 ? '偏低' : '接近平均';
            const avg = Math.max(-2, Math.min(2, NORMS.means[r.type][NORMS.level.indexOf(d)]));
            return `<li><span class="qb-label">${DIM_LABEL[d]}</span><span class="qb-track"><i style="${z >= 0 ? `left:50%;width:${pct}%` : `left:${50 - pct}%;width:${pct}%`}"></i><b style="left:${50 + avg * 25}%" title="${t.name}的研究平均"></b></span><span class="qb-word">${word}</span></li>`;
        }).join('');
        const notes = [];
        if (r.near !== null) notes.push(`你家也有點像<b>${TYPES[r.near].name}</b>，兩種型態很接近。`);
        if (age < 15 || age > 36) notes.push('研究裡的孩子大多是 15–36 歲，這個年齡的結果參考性較低。');
        if (!partnered(state.answers)) notes.push('研究分群的家庭都有配偶或同居伴侶；這個狀況只用其他面向判定，參考性較低。');
        if (r.usedCount < (partnered(state.answers) ? 6 : 5)) notes.push('有部分面向沒有資料，結果只根據已回答的題目。');
        if (state.otherMode === 'simulate') notes.push(`${otherWord()}那一邊是模擬作答，和本人的想法可能不同。`);
        if (state.aiNote) notes.push(state.aiNote);
        const worried = r.type === 3 || (r.z.E !== undefined && r.z.E < -1) || (r.z.D !== undefined && r.z.D < -1);
        const probs = r.probs.map(p => {
            const pct = p.prob * 100;
            const text = pct >= 99.95 ? '>99.9%' : pct < 0.1 ? '<0.1%' : `${pct.toFixed(1)}%`;
            return `<li class="${p.type === r.type ? 'is-top' : ''}"><img src="assets/cats/${TYPES[p.type].img}.webp" alt=""><span class="qp-name">${TYPES[p.type].name}</span><span class="qp-track"><i style="width:${pct.toFixed(1)}%"></i></span><span class="qp-val">${text}</span></li>`;
        }).join('');
        panel.innerHTML = `<button type="button" class="quiz-x" id="qr-hide" aria-label="收起結果" title="收起">×</button>
            <div class="qr-hero"><img src="assets/cats/${t.img}.webp" alt="${t.name}的吉祥物"><div><div class="qr-kicker">你家最接近</div><h2>${t.name}</h2><p class="qr-tag">${t.tagline}</p></div></div>
            <p>${t.desc}</p><p class="qr-tip">${t.tip}</p>
            <h3>屬於每一型的機率</h3><ul class="qp-list">${probs}</ul>
            <p class="quiz-hint">由高斯混合模型算出的後驗機率：依你的分數，你家屬於各型的可能性，不是「幾成像」。</p>
            <h3>你家的六個面向</h3><ul class="qb-list">${bars}</ul><p class="quiz-hint">中線是研究樣本的平均，深色短線是研究中「${t.name}」的平均。研究中約 ${SHARE[r.type]} 的家庭屬於這一型。</p>
            <h3>${t.name}的家庭系統</h3>
            <button type="button" class="qr-path" id="qr-path" title="點一下放大"><img src="assets/paths/type-${r.type}.webp" alt="${t.name}的交叉延宕路徑圖"><span>點一下放大</span></button>
            <p class="qr-path-text">${t.paths}</p>
            <p class="quiz-hint">研究中這一型家庭的路徑分析（2018–2024）。箭頭表示 t 時的狀態影響兩年後的 t+1；只畫統計顯著的路徑，線越粗影響越大，實線為正、虛線為負。這是研究的整體結果，不是你家的數字，也不代表因果。</p>
            ${notes.length ? `<ul class="quiz-notes">${notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
            ${worried ? '<p class="qr-care">如果最近真的很辛苦，可以找人談談：安心專線 <b>1925</b>（24 小時）。</p>' : ''}
            <p class="quiz-hint">結果直接由研究的家庭分群模型算出，只是問卷取不到 GNN 影響力，所以用其餘面向判定（與完整分群的一致率約 87%）。這只呈現目前的狀態，不是診斷，也不代表家庭的好壞。</p>
            <div class="qr-actions"><button type="button" class="quiz-btn ghost" id="qr-restart">重新填答</button><button type="button" class="quiz-btn" id="qr-close">看家系圖</button></div>`;
        panel.hidden = false; reopen.hidden = true;
        const hide = () => { panel.hidden = true; reopen.hidden = false; };
        panel.querySelector('#qr-hide').addEventListener('click', hide);
        panel.querySelector('#qr-close').addEventListener('click', hide);
        panel.querySelector('#qr-restart').addEventListener('click', restart);
        panel.querySelector('#qr-path').addEventListener('click', () => {
            const box = document.createElement('div');
            box.id = 'quiz-lightbox';
            box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', `${t.name}的路徑圖`);
            box.innerHTML = `<div class="ql-inner"><button type="button" class="quiz-x" aria-label="關閉">×</button><h3>${t.name}的家庭系統</h3><img src="assets/paths/type-${r.type}.webp" alt="${t.name}的交叉延宕路徑圖"><p>${t.paths}</p></div>`;
            const shut = () => { box.remove(); document.removeEventListener('keydown', onKey, true); };
            const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } };
            box.addEventListener('click', e => { if (e.target === box || e.target.closest('.quiz-x')) shut(); });
            document.addEventListener('keydown', onKey, true);
            document.body.appendChild(box);
            box.querySelector('.quiz-x').focus();
        });
        panel.scrollTop = 0;
    }

    // 由首頁路由呼叫：進入問卷時接續上次的進度或結果，離開時收起問卷的畫面
    window.FTDLQuiz = {
        isBusy: () => state.busy,
        enter() {
            if (state.result) { panel.hidden = false; reopen.hidden = true; } else open();
        },
        leave() { overlay.hidden = true; panel.hidden = true; reopen.hidden = true; }
    };
    reopen.addEventListener('click', () => { panel.hidden = false; reopen.hidden = true; });
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) tryClose(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !overlay.hidden && !document.querySelector('#ai-settings-overlay.visible')) tryClose();
    });
});
