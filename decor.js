// decor.js
// 介面插圖：畫布還沒有家系圖時，顯示一隻貓和使用說明。
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('family-tree-container');
    if (!container) return;

    const empty = document.createElement('div');
    empty.id = 'canvas-empty-state';
    empty.innerHTML = `
        <img src="assets/cats/cat-9.webp" width="150" height="150" alt="">
        <div class="empty-title">用一段話，畫出一個家</div>
        <div class="empty-hint">點左下角的貓咪，跟牠描述家庭成員與關係；<br>或切到「編輯」直接撰寫 FTDL。</div>`;
    container.appendChild(empty);

    // 畫布上有人物時就藏起來；person.js 每次重畫都會換掉 wrapper 的內容，所以持續觀察
    const update = () => {
        const wrapper = document.getElementById('family-tree-scalable-wrapper');
        const hasTree = !!(wrapper && wrapper.querySelector('.person-figure'));
        empty.classList.toggle('hidden', hasTree);
    };
    new MutationObserver(update).observe(container, { childList: true, subtree: true });
    update();
});
