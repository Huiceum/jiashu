// person.js

document.addEventListener('DOMContentLoaded', () => {
    // const executeBtn = document.getElementById('execute-ftdl-btn'); // Removed
    // const ftdlEditor = document.getElementById('ftdl-editor'); // Removed
    const familyTreeContainer = document.getElementById('family-tree-container');
    let tooltip = null;
    let scalableWrapper = null; 

    let currentScale = 1.0;
    const scaleStep = 0.1;
    const minScale = 0.3;
    const maxScale = 2.5;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    let startMouseX = 0;
    let startMouseY = 0;

    function initializeCanvasEnhancements() {
        if (!familyTreeContainer) {
            console.error("Family tree container not found for enhancements.");
            return;
        }

        if (!document.getElementById('family-tree-scalable-wrapper')) {
            scalableWrapper = document.createElement('div');
            scalableWrapper.id = 'family-tree-scalable-wrapper';
            while (familyTreeContainer.firstChild && familyTreeContainer.firstChild.id !== 'canvas-zoom-controls') {
                scalableWrapper.appendChild(familyTreeContainer.firstChild);
            }
            if (document.getElementById('canvas-zoom-controls')) {
                 familyTreeContainer.appendChild(scalableWrapper);
            } else {
                familyTreeContainer.appendChild(scalableWrapper);
            }
        } else {
            scalableWrapper = document.getElementById('family-tree-scalable-wrapper');
        }
        applyTransform();


        if (!document.getElementById('canvas-zoom-controls')) {
            const zoomControls = document.createElement('div');
            zoomControls.id = 'canvas-zoom-controls';

            const zoomInBtn = document.createElement('button');
            zoomInBtn.classList.add('zoom-btn'); zoomInBtn.id = 'zoom-in-btn'; zoomInBtn.textContent = '+'; zoomInBtn.title = '放大';
            zoomInBtn.addEventListener('click', (e) => { e.stopPropagation(); updateScale(currentScale + scaleStep); });

            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.classList.add('zoom-btn'); zoomOutBtn.id = 'zoom-out-btn'; zoomOutBtn.textContent = '-'; zoomOutBtn.title = '縮小';
            zoomOutBtn.addEventListener('click', (e) => { e.stopPropagation(); updateScale(currentScale - scaleStep); });

            const zoomResetBtn = document.createElement('button');
            zoomResetBtn.classList.add('zoom-btn'); zoomResetBtn.id = 'zoom-reset-btn'; zoomResetBtn.textContent = '100%'; zoomResetBtn.title = '重置';
            zoomResetBtn.addEventListener('click', (e) => { e.stopPropagation(); resetView(); });

            zoomControls.appendChild(zoomInBtn);
            zoomControls.appendChild(zoomOutBtn);
            zoomControls.appendChild(zoomResetBtn);
            familyTreeContainer.insertBefore(zoomControls, familyTreeContainer.firstChild);
        }

        familyTreeContainer.addEventListener('mousedown', handlePanStart);
        familyTreeContainer.addEventListener('touchstart', handlePanStart, { passive: false });

        window.addEventListener('mousemove', handlePanMove);
        window.addEventListener('mouseup', handlePanEnd);
        window.addEventListener('touchmove', handlePanMove, { passive: false });
        window.addEventListener('touchend', handlePanEnd);
        window.addEventListener('touchcancel', handlePanEnd);

        familyTreeContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
        familyTreeContainer.addEventListener('DOMMouseScroll', handleWheelZoom, { passive: false }); 

        const currentActiveCanvas = document.querySelector('#family-tree-container.view-panel.active');
        toggleZoomControlsVisibility(currentActiveCanvas !== null);
    }

    function applyTransform() {
        if (scalableWrapper) {
            scalableWrapper.style.transition = isPanning ? 'none' : 'transform 0.3s ease-out';
            scalableWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
        }
        // 資料卡固定在人物右側：畫布移動或縮放時跟著重新定位（等平移動畫結束再算一次）
        if (cardState.figure) {
            positionCard();
            clearTimeout(cardState.repositionTimer);
            cardState.repositionTimer = setTimeout(positionCard, 320);
        }
    }

    // 排版完成後把案主移到畫布可見區域的正中間（對話區展開時畫布會變矮，以縮小後的畫布為準）
    function centerOnProband() {
        if (!scalableWrapper || !familyTreeContainer) return;
        const proband = scalableWrapper.querySelector('.person-figure.is-proband');
        const containerRect = familyTreeContainer.getBoundingClientRect();
        if (!proband || containerRect.width === 0) return;
        scalableWrapper.style.transition = 'none';
        scalableWrapper.style.transform = `translate(0px, 0px) scale(${currentScale})`;
        void scalableWrapper.offsetWidth; // 讓瀏覽器先套用沒有平移的位置，再量人物的位置
        const r = proband.getBoundingClientRect();
        panX = (containerRect.left + containerRect.right) / 2 - (r.left + r.width / 2);
        panY = (containerRect.top + containerRect.bottom) / 2 - (r.top + r.height / 2);
        applyTransform();
    }

    // 編輯人物後重畫時保留目前的縮放與位置（不重設、不重新置中）
    let preserveViewOnce = false;
    window.ftdlPreserveViewOnce = () => { preserveViewOnce = true; };

    function updateScale(newScale, zoomCenterX, zoomCenterY) {
        const prevScale = currentScale;
        currentScale = Math.max(minScale, Math.min(maxScale, parseFloat(newScale.toFixed(2))));

        if (zoomCenterX === undefined || zoomCenterY === undefined) {
            if (familyTreeContainer) { 
                const containerRect = familyTreeContainer.getBoundingClientRect();
                zoomCenterX = containerRect.width / 2;
                zoomCenterY = containerRect.height / 2;
            } else { 
                zoomCenterX = window.innerWidth / 2;
                zoomCenterY = window.innerHeight / 2;
            }
        }
        
        panX = zoomCenterX - ((zoomCenterX - panX) / prevScale) * currentScale;
        panY = zoomCenterY - ((zoomCenterY - panY) / prevScale) * currentScale;

        applyTransform();

        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        if (zoomResetBtn) {
            zoomResetBtn.textContent = `${Math.round(currentScale * 100)}%`;
        }
    }

    function handleWheelZoom(event) {
        if (!familyTreeContainer || !familyTreeContainer.classList.contains('active')) return;
        event.preventDefault();

        const delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail || -event.deltaY)));
        const rect = familyTreeContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (delta > 0) {
            updateScale(currentScale + scaleStep, mouseX, mouseY);
        } else {
            updateScale(currentScale - scaleStep, mouseX, mouseY);
        }
    }

    function resetView() {
        currentScale = 1.0;
        panX = 0;
        panY = 0;
        
        applyTransform();

        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        if (zoomResetBtn) {
            zoomResetBtn.textContent = '100%';
        }
    }

    function handlePanStart(event) {
        if (event.target.closest('.zoom-btn') || event.target.closest('.person-figure')) {
             if(!event.target.closest('.person-figure')) event.preventDefault(); 
             return; 
        }
        if (event.type === 'touchstart') {
            event.preventDefault();
        }

        isPanning = true;
        if (!cardState.editing) hideTooltip();
        if (familyTreeContainer) familyTreeContainer.classList.add('is-dragging');

        if (event.type === 'touchstart') {
            startMouseX = event.touches[0].clientX;
            startMouseY = event.touches[0].clientY;
        } else {
            startMouseX = event.clientX;
            startMouseY = event.clientY;
        }
        startPanX = panX;
        startPanY = panY;

        if(scalableWrapper) scalableWrapper.style.transition = 'none';
    }

    function handlePanMove(event) {
        if (!isPanning) return;
        if (event.type === 'touchmove') {
            event.preventDefault(); 
        }

        let currentMouseX, currentMouseY;
        if (event.type === 'touchmove') {
            if (event.touches.length > 0) {
                currentMouseX = event.touches[0].clientX;
                currentMouseY = event.touches[0].clientY;
            } else return;
        } else {
            currentMouseX = event.clientX;
            currentMouseY = event.clientY;
        }

        const dx = currentMouseX - startMouseX;
        const dy = currentMouseY - startMouseY;

        panX = startPanX + dx;
        panY = startPanY + dy;

        applyTransform();
    }

    function handlePanEnd() {
        if (isPanning) {
            isPanning = false;
            if (familyTreeContainer) familyTreeContainer.classList.remove('is-dragging');
            if(scalableWrapper) applyTransform(); // Restore transition
        }
    }

    function toggleZoomControlsVisibility(show) {
        const zoomControls = document.getElementById('canvas-zoom-controls');
        if (zoomControls) {
            zoomControls.style.display = show ? 'flex' : 'none';
        }
    }
    
    function handleViewChange(activeViewId) {
        if (activeViewId === 'family-tree-container') {
            toggleZoomControlsVisibility(true);
        } else {
            toggleZoomControlsVisibility(false);
        }
    }

    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
        const viewObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                 if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const changedElement = mutation.target;
                    if (changedElement.classList.contains('view-panel')) {
                        if (changedElement.id === 'family-tree-container' && changedElement.classList.contains('active')) {
                            handleViewChange('family-tree-container');
                        } else if (changedElement.id === 'ftdl-editor-view' && changedElement.classList.contains('active')) {
                            handleViewChange('ftdl-editor-view');
                        }
                    }
                }
            }
        });
        const ftContainerElement = document.getElementById('family-tree-container');
        const editorViewElement = document.getElementById('ftdl-editor-view');
        if (ftContainerElement) viewObserver.observe(ftContainerElement, { attributes: true, attributeFilter: ['class'] });
        if (editorViewElement) viewObserver.observe(editorViewElement, { attributes: true, attributeFilter: ['class'] });
    } else { console.warn("View container for observer not found."); }

    function switchToCanvasView() {
        if (typeof setActiveView === 'function') {
            setActiveView('canvas');
        } else {
            console.warn('Global setActiveView function is not defined. Falling back to manual view switch.');
            const ftc = document.getElementById('family-tree-container');
            const edv = document.getElementById('ftdl-editor-view');
            if (ftc) { ftc.classList.add('active'); ftc.style.display = 'flex'; }
            if (edv) { edv.classList.remove('active'); edv.style.display = 'none'; }
            handleViewChange('family-tree-container');
        }
    }


    function createTooltip() {
        if (!document.getElementById('person-tooltip')) {
            tooltip = document.createElement('div');
            tooltip.id = 'person-tooltip';
            document.body.appendChild(tooltip);
        } else {
            tooltip = document.getElementById('person-tooltip');
        }
    }
    createTooltip();

    // --- 人物資料卡：固定顯示在人物右側；可直接編輯這個人在 FTDL 裡的內容 ---
    const cardState = { figure: null, person: null, editing: false, hideTimer: null, repositionTimer: null };

    function showTooltip(event, personData) {
        if (isPanning || !tooltip) return;
        const figure = event && event.currentTarget;
        if (cardState.editing) return; // 編輯中不切換到別人
        clearTimeout(cardState.hideTimer);
        cardState.figure = figure;
        cardState.person = personData;
        renderCardView(personData);
        tooltip.style.display = 'block';
        positionCard();
    }

    function hideTooltip() {
        if (!tooltip) return;
        clearTimeout(cardState.hideTimer);
        tooltip.style.display = 'none';
        tooltip.classList.remove('editing');
        tooltip.innerHTML = '';
        cardState.figure = null;
        cardState.person = null;
        cardState.editing = false;
    }

    // 滑鼠離開人物或資料卡後稍等一下再關，讓滑鼠能從人物移到資料卡上；編輯中不關
    function scheduleHide() {
        if (cardState.editing) return;
        clearTimeout(cardState.hideTimer);
        cardState.hideTimer = setTimeout(() => {
            if (!cardState.editing && !tooltip.matches(':hover')) hideTooltip();
        }, 160);
    }
    tooltip.addEventListener('mouseenter', () => clearTimeout(cardState.hideTimer));
    tooltip.addEventListener('mouseleave', scheduleHide);
    tooltip.addEventListener('mousedown', e => e.stopPropagation());
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && tooltip.style.display === 'block') hideTooltip();
    });
    window.addEventListener('resize', () => { if (cardState.figure) positionCard(); });

    function positionCard() {
        if (!tooltip || !cardState.figure || !cardState.figure.isConnected) return;
        const r = cardState.figure.getBoundingClientRect();
        const gap = 12;
        const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
        let x = r.right + gap;
        if (x + w > window.innerWidth - 8) x = Math.max(8, r.left - gap - w); // 右邊放不下就改放左邊
        let y = r.top;
        y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    const GENDER_TEXT = { male: '男', female: '女', other: '其他／不詳' };

    function renderCardView(personData) {
        tooltip.classList.remove('editing');
        tooltip.innerHTML = '';
        const head = document.createElement('div');
        head.className = 'card-head';
        const name = document.createElement('div');
        name.className = 'card-name';
        name.textContent = personData.name || '未命名';
        head.appendChild(name);
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'card-edit-btn';
        editBtn.textContent = '編輯';
        editBtn.addEventListener('click', e => { e.stopPropagation(); renderCardEditor(cardState.person); });
        head.appendChild(editBtn);
        tooltip.appendChild(head);

        const rows = [
            ['性別', GENDER_TEXT[(personData.gender || '').toLowerCase()] || '未填'],
            ['出生', personData.birth || '未填'],
        ];
        if (personData.death) rows.push(['過世', personData.death === true ? '已過世（日期不詳）' : personData.death]);
        const age = calculateAgeDisplay(personData.birth, personData.death);
        if (age !== 'N/A') rows.push([personData.death ? '享年' : '年齡', `${age} 歲`]);
        const tags = [];
        if (personData.proband) tags.push('案主');
        if (personData.chronic === true) tags.push('慢性病');
        if (personData.Disability === true) tags.push('身心障礙');
        if (tags.length) rows.push(['標記', tags.join('、')]);
        if (personData.note && personData.note.trim()) rows.push(['備註', personData.note]);
        rows.push(['ID', personData.id]);
        const table = document.createElement('dl');
        table.className = 'card-rows';
        rows.forEach(([k, v]) => {
            const dt = document.createElement('dt'); dt.textContent = k;
            const dd = document.createElement('dd'); dd.textContent = v;
            table.append(dt, dd);
        });
        tooltip.appendChild(table);
    }

    function renderCardEditor(personData) {
        cardState.editing = true;
        clearTimeout(cardState.hideTimer);
        tooltip.classList.add('editing');
        tooltip.innerHTML = '';
        const form = document.createElement('form');
        form.className = 'card-form';
        const deathIsDate = personData.death && personData.death !== true;
        form.innerHTML = `
            <div class="card-head"><div class="card-name">編輯人物</div><span class="card-id"></span></div>
            <label>姓名<input name="name" type="text" autocomplete="off"></label>
            <label>性別<select name="gender"><option value="male">男</option><option value="female">女</option><option value="other">其他／不詳</option></select></label>
            <label>出生<input name="birth" type="text" placeholder="YYYY 或 YYYY-MM-DD" autocomplete="off"></label>
            <div class="card-inline">
                <label class="card-check"><input name="deceased" type="checkbox">已過世</label>
                <input name="death" type="text" placeholder="過世年份（可空白）" autocomplete="off">
            </div>
            <div class="card-checks">
                <label class="card-check"><input name="proband" type="checkbox">案主</label>
                <label class="card-check"><input name="chronic" type="checkbox">慢性病</label>
                <label class="card-check"><input name="Disability" type="checkbox">身心障礙</label>
            </div>
            <label>備註<input name="note" type="text" autocomplete="off"></label>
            <div class="card-error" hidden></div>
            <div class="card-actions">
                <button type="button" class="card-cancel">取消</button>
                <button type="submit" class="card-save">確認</button>
            </div>`;
        form.querySelector('.card-id').textContent = personData.id;
        form.elements.name.value = personData.name || '';
        form.elements.gender.value = ['male', 'female'].includes((personData.gender || '').toLowerCase()) ? personData.gender.toLowerCase() : 'other';
        form.elements.birth.value = personData.birth || '';
        form.elements.deceased.checked = !!personData.death;
        form.elements.death.value = deathIsDate ? personData.death : '';
        form.elements.death.disabled = !personData.death;
        form.elements.proband.checked = !!personData.proband;
        form.elements.chronic.checked = personData.chronic === true;
        form.elements.Disability.checked = personData.Disability === true;
        form.elements.note.value = personData.note || '';
        form.elements.deceased.addEventListener('change', () => {
            form.elements.death.disabled = !form.elements.deceased.checked;
            if (!form.elements.deceased.checked) form.elements.death.value = '';
        });
        form.querySelector('.card-cancel').addEventListener('click', () => {
            cardState.editing = false;
            renderCardView(cardState.person);
            positionCard();
            if (!tooltip.matches(':hover')) scheduleHide();
        });
        form.addEventListener('submit', e => {
            e.preventDefault();
            const err = form.querySelector('.card-error');
            const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
            const birth = form.elements.birth.value.trim();
            const death = form.elements.death.value.trim();
            const problems = [];
            if (birth && !datePattern.test(birth)) problems.push('出生日期請寫成 YYYY、YYYY-MM 或 YYYY-MM-DD');
            if (death && !datePattern.test(death)) problems.push('過世日期請寫成 YYYY、YYYY-MM 或 YYYY-MM-DD');
            if (problems.length) { err.hidden = false; err.textContent = problems.join('；'); return; }
            const clean = v => v.replace(/;/g, '，').trim(); // FTDL 的值裡不能有半形分號
            const changes = {
                name: clean(form.elements.name.value),
                gender: form.elements.gender.value,
                birth,
                death: form.elements.deceased.checked ? (death || 'true') : '',
                wellbeing: '', // 已停用的身心分數：編輯時順便從舊資料移除
                proband: form.elements.proband.checked ? 'true' : '',
                chronic: form.elements.chronic.checked ? 'true' : '',
                Disability: form.elements.Disability.checked ? 'true' : '',
                note: clean(form.elements.note.value)
            };
            savePersonEdit(personData.id, changes);
        });
        tooltip.appendChild(form);
        positionCard();
        form.elements.name.focus();
    }

    // 把編輯結果寫回編輯器裡的 FTDL，然後重畫目前的視圖
    const PERSON_KEY_ORDER = ['id', 'name', 'gender', 'birth', 'death', 'proband', 'chronic', 'Disability', 'fill', 'note'];
    function rewritePersonBlock(block, changes) {
        const open = block.indexOf('{'), close = block.lastIndexOf('}');
        const body = block.slice(open + 1, close);
        const props = [];
        const re = /([\w?]+)\s*:\s*([^;]*?)\s*;/g;
        let m;
        while ((m = re.exec(body)) !== null) props.push([m[1].replace('?', ''), m[2]]);
        Object.entries(changes).forEach(([key, value]) => {
            const idx = props.findIndex(([k]) => k === key);
            if (value === '' || value === null || value === undefined) { if (idx >= 0) props.splice(idx, 1); return; }
            if (idx >= 0) props[idx][1] = value;
            else {
                // 新增的欄位依慣用順序插入
                const order = PERSON_KEY_ORDER.indexOf(key);
                const after = props.reduce((pos, [k], i) => (PERSON_KEY_ORDER.indexOf(k) !== -1 && PERSON_KEY_ORDER.indexOf(k) < order ? i + 1 : pos), 0);
                props.splice(after, 0, [key, value]);
            }
        });
        if (/\n/.test(body)) {
            const indent = (body.match(/\n([ \t]+)\S/) || [])[1] || '  ';
            return `person {\n${props.map(([k, v]) => `${indent}${k}: ${v};`).join('\n')}\n}`;
        }
        return `person { ${props.map(([k, v]) => `${k}: ${v};`).join(' ')} }`;
    }

    function savePersonEdit(id, changes) {
        const editor = document.getElementById('ftdl-editor');
        if (!editor) return;
        const blockRe = /(^|[\s;}])(person\s*\{[\s\S]*?\})/g;
        let found = false;
        const updated = editor.value.replace(blockRe, (whole, lead, block) => {
            const idMatch = block.match(/\bid\s*:\s*([^;\s]+)\s*;/);
            const blockId = idMatch && idMatch[1];
            if (blockId === id) { found = true; return lead + rewritePersonBlock(block, changes); }
            // 案主通常只有一位：把別人設成案主時，取消其他人的案主
            if (changes.proband === 'true' && /\bproband\s*:\s*true\s*;/.test(block)) return lead + rewritePersonBlock(block, { proband: '' });
            return whole;
        });
        if (!found) {
            const err = tooltip.querySelector('.card-error');
            if (err) { err.hidden = false; err.textContent = `在編輯器裡找不到 id 為 ${id} 的人物，無法儲存。`; }
            return;
        }
        editor.value = updated;
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        try { sessionStorage.setItem('lastFTDLCode', updated); } catch (e) { /* 忽略 */ }
        hideTooltip();
        if (typeof window.ftdlRerenderCurrent === 'function') window.ftdlRerenderCurrent();
    }

    function parsePersonsFromFTDL(ftdlText) {
        const persons = [];
        const personRegex = /person\s*\{([\s\S]*?)\}/g;
        let match;

        while ((match = personRegex.exec(ftdlText)) !== null) {
            const personData = {};
            const propertiesText = match[1];
            const propertyRegex = /\s*([\w?]+)\s*:\s*([^;]+?)\s*;/g; // Note: \w includes _
            let propMatch;

            while ((propMatch = propertyRegex.exec(propertiesText)) !== null) {
                let key = propMatch[1].trim();
                key = key.replace('?', ''); // Remove optional marker if present
                let value = propMatch[2].trim();

                // Clean string values
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                
                // Handle comments in note
                 if (key === 'note') {
                     // Updated regex to handle both \\note\\ and "//note//" style for flexibility
                     const noteContentMatch = value.match(/^(\/\/|\\\\)(.*?)\1$/);
                     if (noteContentMatch) {
                        value = noteContentMatch[2].trim();
                     } else {
                         // If it's just a plain string, keep it, but warn if it looks like an unterminated comment
                         if (value.startsWith('//') || value.startsWith('\\\\')) {
                            console.warn(`Person note format might be incorrect for ID ${personData.id || 'N/A'}: ${value}. Expected format // note text // or \\\\ note text \\\\ or plain string.`);
                         }
                     }
                 }

                // Convert boolean-like strings to actual booleans for specific keys
                if (key === 'proband' || key === 'chronic' || key === 'Disability') {
                    personData[key] = value.toLowerCase() === 'true';
                } else if (key === 'death' && value.toLowerCase() === 'true') {
                    personData[key] = true; // Store 'true' as boolean for death
                }
                else {
                    personData[key] = value;
                }
            }
            if (personData.id) {
                persons.push(personData);
            } else {
                 console.warn("Skipping person block due to missing ID:", match[0]);
            }
        }
        return persons;
    }


    function parseFlexibleDateString(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;

        const parts = dateString.split('-');
        const year = parseInt(parts[0], 10);
        
        if (isNaN(year) || parts[0].length !== 4) return null; 

        let month = 0; 
        let day = 1;   

        if (parts.length >= 2) {
            const parsedMonth = parseInt(parts[1], 10);
            if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
                month = parsedMonth - 1; 
            } else {
                return null; 
            }
        }

        if (parts.length === 3) {
            const parsedDay = parseInt(parts[2], 10);
            if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) { 
                day = parsedDay;
            } else {
                return null; 
            }
        }
        
        const dateObj = new Date(year, month, day);
        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month || dateObj.getDate() !== day) {
            return null; 
        }
        return dateObj;
    }

    // 年齡的計算基準：metadata 有 date 時算到那一年（例如研究的調查年），否則算到今天
    let ageReferenceDate = null;
    function referenceDate() {
        return ageReferenceDate ? new Date(ageReferenceDate.getTime()) : new Date();
    }
    function setAgeReferenceFromFtdl(ftdlText) {
        ageReferenceDate = null;
        const meta = (ftdlText || '').match(/metadata\s*\{([\s\S]*?)\}/);
        const m = meta && meta[1].match(/\bdate\s*:\s*["']?(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
        if (m) {
            // 只寫年份時取年中，年齡以該年 7 月 1 日計算
            ageReferenceDate = new Date(parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) - 1 : 6, m[3] ? parseInt(m[3], 10) : 1);
        }
    }

    function calculateRawAge(birthDateString, deathDateOrBool = null) {
        if (!birthDateString) return null;

        const birthDate = parseFlexibleDateString(birthDateString);
        if (!birthDate) {
            console.warn(`Invalid birth date string for age calculation: ${birthDateString}`);
            return null;
        }

        let endDate;
        if (deathDateOrBool) {
            if (deathDateOrBool === true) { // If death is marked as true, person is deceased
                endDate = referenceDate(); // Calculate age as if today (or use a fixed date if they died but no date given)
                                      // For simplicity, if death is true but no date, age calc is tricky.
                                      // Let's assume if death is true, but not a date, their "current" age is as if they lived to now for display.
                                      // Or, perhaps it's better to show N/A for age if death is true without a date.
                                      // For now, let's assume age is calculated to "death date" if provided, otherwise to "today".
                                      // If death is true, we'll use current date to calculate 'potential' age if they were alive
                                      // This might not be ideal. If death is true, and no death date, age is ambiguous.
                                      // Let's refine: If death is true, and no death date, age is "N/A" or last known.
                                      // For this function, if deathDateOrBool is true, it means they are dead, but we don't know when.
                                      // So calculateRawAge should probably use 'today' as if they were alive,
                                      // and calculateAgeDisplay will decide how to show it.
                                      // This function should return the age as if they were alive today if death is true but not a date.
                endDate = referenceDate(); 
            } else if (typeof deathDateOrBool === 'string') { // It's a date string
                endDate = parseFlexibleDateString(deathDateOrBool);
                if (!endDate) {
                    console.warn(`Invalid death date string for age calculation: ${deathDateOrBool}. Using current date for age of living person.`);
                    endDate = referenceDate(); 
                }
            } else { // Not true, not a string - assume alive
                 endDate = referenceDate();
            }
        } else { // No death data, assume alive
            endDate = referenceDate(); 
        }

        if (endDate < birthDate) {
            return 0;
        }

        let age = endDate.getFullYear() - birthDate.getFullYear();
        const birthMonth = birthDate.getMonth();
        const endMonth = endDate.getMonth();
        const birthDay = birthDate.getDate();
        const endDay = endDate.getDate();

        if (endMonth < birthMonth || (endMonth === birthMonth && endDay < birthDay)) {
            age--;
        }
        
        return age < 0 ? 0 : age; 
    }

    function calculateAgeDisplay(birthDateString, deathDateOrBool = null) {
        // If person is marked as dead (true) but no specific death date,
        // their age at death is unknown. Displaying current potential age might be misleading.
        if (deathDateOrBool === true) {
            // If we have a birth date, we can say "Age at death: Unknown" or similar
            // For simplicity, we'll calculate age as if alive till today, but it's not age at death.
            // The tooltip clarifies "Death: Deceased (Marked as true)".
            // Let's calculate age as if they lived till today for display.
        }

        const age = calculateRawAge(birthDateString, deathDateOrBool);
        
        if (age === null) return "N/A";
        
        return `${age}`;
    }

    function renderPerson(personData) {
        const figure = document.createElement('div');
        figure.classList.add('person-figure');
        figure.dataset.personId = personData.id;

        const gender = personData.gender ? personData.gender.toLowerCase() : 'other';
        if (gender === 'male') figure.classList.add('male');
        else if (gender === 'female') figure.classList.add('female');
        else figure.classList.add('other');

        if (personData.proband === true) figure.classList.add('is-proband');

        // 研究擴充：fill 直接指定節點顏色
        const research = window.FTDLResearch;
        if (research) {
            const fill = research.resolveColor(personData.fill);
            if (fill) {
                figure.style.setProperty('--node-fill', fill);
                figure.classList.add('has-node-fill');
            }
        }

        const nameEl = document.createElement('div');
        nameEl.classList.add('person-name');
        nameEl.textContent = personData.name || 'Unknown';
        figure.appendChild(nameEl);

        const ageEl = document.createElement('div');
        ageEl.classList.add('person-age');
        ageEl.textContent = calculateAgeDisplay(personData.birth, personData.death);
        figure.appendChild(ageEl);

        const notePreviewEl = document.createElement('div');
        notePreviewEl.classList.add('person-note-preview');
        const note = personData.note || '';
        if (note.trim()) {
            const maxNoteLength = (gender === 'other') ? 0 : 4; // No note preview for 'other'
            if (maxNoteLength > 0) {
                 notePreviewEl.textContent = note.length <= maxNoteLength ? note : note.substring(0, maxNoteLength) + '...';
            } else {
                 notePreviewEl.textContent = '';
            }
        } else {
            notePreviewEl.textContent = '';
        }
        if (gender !== 'other') { // Only add note preview if not 'other'
            figure.appendChild(notePreviewEl);
        }


        // --- MODIFIED FOR CHRONIC & DISABILITY ---
        if (personData.chronic === true) {
            const chronicOverlay = document.createElement('div');
            chronicOverlay.classList.add('highlight-overlay', 'chronic-highlight');
            figure.appendChild(chronicOverlay);
            // figure.classList.add('has-chronic'); // CSS can target .person-figure .chronic-highlight
        }
        if (personData.Disability === true) { // Note: 'Disability' with capital D as per FTDL rule
            const disabilityOverlay = document.createElement('div');
            disabilityOverlay.classList.add('highlight-overlay', 'disability-highlight');
            figure.appendChild(disabilityOverlay);
            // figure.classList.add('has-disability');
        }
        // --- END MODIFICATION ---


        // --- MODIFIED FOR DEATH ---
        // personData.death can be a date string, or boolean true
        if (personData.death) { // This is true if death is a non-empty date string OR boolean true
            figure.classList.add('desaturated');
            const deceasedX = document.createElement('div');
            deceasedX.classList.add('deceased-x');
            figure.appendChild(deceasedX);
        }
        // --- END MODIFICATION ---


        figure.addEventListener('mouseenter', (event) => showTooltip(event, personData));
        figure.addEventListener('mouseleave', scheduleHide);
        figure.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent canvas pan when clicking figure
        figure.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false }); // Prevent canvas pan

        return figure;
    }

    function renderFamilyTree(ftdlText) {
        console.log("renderFamilyTree called with FTDL text.");

        if (!scalableWrapper) {
            initializeCanvasEnhancements();
            if(!scalableWrapper) { console.error("Scalable wrapper crucial for FTDL rendering not found after init."); return; }
        }

        scalableWrapper.innerHTML = ''; // Clear previous tree
        if (!cardState.editing) hideTooltip();
        if (!preserveViewOnce) resetView(); // Reset pan and zoom

        if (!ftdlText || !ftdlText.trim()) {
            console.log("FTDL text is empty or whitespace. Displaying message.");
            const p = document.createElement('p');
            p.textContent = '無可渲染的樹系代碼。請選擇一個樹系。';
            p.style.textAlign = 'center'; p.style.paddingTop = '10px';
            p.style.color = 'var(--text-color-secondary, #666)'; p.style.fontSize = '12px';
            p.id = 'initial-canvas-message';
            scalableWrapper.appendChild(p);
            switchToCanvasView();
            if (typeof window.triggerRelationshipRender === 'function') {
                 window.triggerRelationshipRender(); // Render empty relationships if any
            }
            return;
        }

        setAgeReferenceFromFtdl(ftdlText);
        const persons = parsePersonsFromFTDL(ftdlText);

        if (persons.length === 0) {
            console.log("No valid person entries found in the provided FTDL snippet.");
            const p = document.createElement('p');
            p.textContent = '在選定的樹系代碼中未找到有效的人物條目。';
            p.style.textAlign = 'center'; p.style.paddingTop = '10px';
            p.style.color = 'var(--text-color-secondary, #666)'; p.style.fontSize = '12px';
            p.id = 'initial-canvas-message';
            scalableWrapper.appendChild(p);
            switchToCanvasView();
            if (typeof window.triggerRelationshipRender === 'function') {
                 window.triggerRelationshipRender();
            }
            return;
        }

        persons.forEach(personData => {
            const personElement = renderPerson(personData);
            scalableWrapper.appendChild(personElement);
        });

        if (typeof window.triggerRelationshipRender === 'function') {
            console.log("Triggering relationship render...");
            window.triggerRelationshipRender();
        } else {
            console.warn("Relationship rendering function (window.triggerRelationshipRender) not found. Relationship lines will not be drawn.");
        }
        switchToCanvasView();
        if (preserveViewOnce) {
            preserveViewOnce = false;
            applyTransform();
        } else {
            requestAnimationFrame(centerOnProband);
        }
    }

    function clearFamilyTree() {
        console.log("clearFamilyTree called.");
         if (!scalableWrapper) {
            initializeCanvasEnhancements();
            if(!scalableWrapper) { console.error("Scalable wrapper not found, cannot clear."); return; }
         }

        scalableWrapper.innerHTML = '';
        if (!preserveViewOnce) resetView();
        hideTooltip();

        const p = document.createElement('p');
        p.id = 'initial-canvas-message';
        p.textContent = '請選擇一個樹系以顯示家系圖。';
        p.style.textAlign = 'center'; p.style.paddingTop = '10px';
        p.style.color = 'var(--text-color-secondary, #666)'; p.style.fontSize = '12px';
        scalableWrapper.appendChild(p);

        hideTooltip();

         if (typeof window.triggerRelationshipRender === 'function') {
             window.triggerRelationshipRender(); // Clear relationships too
         }
    }

    initializeCanvasEnhancements(); // Initialize zoom/pan etc.

    // Expose render and clear functions globally for other scripts to call
    window.renderFamilyTree = renderFamilyTree;
    window.clearFamilyTree = clearFamilyTree;

    console.log("person.js initialized. Rendering and clearing functions exposed globally.");

    // Initial message if no tree is loaded at start
    if (scalableWrapper && scalableWrapper.children.length === 0) {
         const existingMessage = scalableWrapper.querySelector('p#initial-canvas-message');
         if (!existingMessage) {
             const p = document.createElement('p');
             p.id = 'initial-canvas-message';
             p.textContent = '請選擇一個樹系以顯示家系圖。';
             p.style.textAlign = 'center'; p.style.paddingTop = '10px';
             p.style.color = 'var(--text-color-secondary, #666)'; p.style.fontSize = '12px';
             scalableWrapper.appendChild(p);
         }
    }
});
