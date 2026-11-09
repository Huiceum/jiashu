// home.js
// 首頁與路由：#/ 首頁、#/survey 家庭問卷、#/genogram 文字轉家系圖。
// 兩個功能共用編輯器與畫布，切換時各自保存 FTDL，讓彼此的圖不會互相覆蓋。

document.addEventListener('DOMContentLoaded', () => {
    const TITLES = {
        home: '家書 Jiashu｜用一段話畫出一個家',
        survey: '家書 Jiashu｜家庭問卷',
        genogram: '家書 Jiashu｜用一段話畫出一個家'
    };
    const editor = document.getElementById('ftdl-editor');
    const executeBtn = document.getElementById('execute-ftdl-btn');
    const titleEl = document.querySelector('.app-title');
    const hasTree = () => !!document.querySelector('#family-tree-container .person-figure');
    const parse = () => {
        const name = location.hash.replace(/^#\/?/, '');
        return TITLES[name] ? name : 'home';
    };

    // genogram 一開始沿用編輯器從 localStorage 載入的內容，但和原本一樣要按「執行」才畫
    const saved = { genogram: { text: editor.value, drawn: false }, survey: { text: '', drawn: false } };
    let current = null;

    function setEditor(text) {
        editor.value = text;
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    function runEditor() {
        executeBtn.disabled = false;
        executeBtn.click();
    }

    function restore(route) {
        const { text, drawn } = saved[route];
        document.querySelector('.tab-btn[data-view="canvas"]')?.click();
        setEditor(drawn ? text : '');
        runEditor();                 // 沒有圖時以空白內容執行，清掉另一個功能留下的圖
        if (!drawn) setEditor(text);
    }

    function apply() {
        const route = parse();
        if (route === current) return;
        if (current === 'survey' && window.FTDLQuiz.isBusy()) {   // AI 正在畫圖時留在問卷，避免圖畫到別的功能
            location.hash = '#/survey';
            return;
        }
        if (saved[current]) saved[current] = { text: editor.value, drawn: hasTree() };
        document.body.dataset.route = route;
        document.title = TITLES[route];
        if (titleEl) titleEl.textContent = TITLES[route];
        if (route === 'survey') window.FTDLQuiz?.enter(); else window.FTDLQuiz?.leave();
        if (saved[route]) restore(route);
        current = route;
        window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', apply);
    apply();
});
