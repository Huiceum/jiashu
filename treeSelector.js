// treeSelector.js

document.addEventListener('DOMContentLoaded', () => {
    const executeBtn = document.getElementById('execute-ftdl-btn');
    const ftdlEditor = document.getElementById('ftdl-editor');
    const familyTreeContainer = document.getElementById('family-tree-container'); // Canvas container
    const viewContainer = document.getElementById('view-container'); // Parent container for view switching

    // --- Global Rendering Function References ---
    const globalRenderFunction = window.renderFamilyTree || function(code) {
        console.warn("Global rendering function (window.renderFamilyTree) not found. Rendering cannot proceed.");
        const wrapper = document.getElementById('family-tree-scalable-wrapper') || familyTreeContainer;
        if (wrapper) {
            wrapper.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">渲染錯誤：缺少渲染函數 (window.renderFamilyTree)</p>';
        }
    };
const globalClearFunction = window.clearFamilyTree || function() {
    console.warn("Global clearing function (window.clearFamilyTree) not found.");
    const wrapper = document.getElementById('family-tree-scalable-wrapper');

    // >> 在這裡加入這行，用於清空 metadata 顯示並恢復顏色模式 <<
    if (typeof window.clearMetadata === 'function') {
         window.clearMetadata();
    }


    if (wrapper) {
        wrapper.innerHTML = '<p style="text-align: center; padding-top: 50px; color: var(--text-color-secondary);">請執行代碼或選擇一個樹系進行渲染</p>';
    } else if(familyTreeContainer) {
        familyTreeContainer.innerHTML = '<p style="text-align: center; padding-top: 50px; color: var(--text-color-secondary);">請執行代碼或選擇一個樹系進行渲染</p>';
    }
    // ... 函數的其餘部分保持不變 ...
};

    // --- Data Storage ---
    let parsedPersons = {};
    let parsedRelationships = [];
    let globalParsedMetadata = ""; // ADDED: Store the raw FTDL of the global metadata block
    let identifiedTrees = [];
    let currentOptions = [];
    let originalFullCode = "";

    // --- UI Element References ---
    let selectorPanel = null;
    let selectorList = null;
    let statusMessageContainer = null;
    let toggleButton = null;
    let closeButton = null;
    let panelCreated = false;

    // --- Touch/Click State ---
    let touchstartX = 0;
    let touchstartY = 0;
    const clickThreshold = 10;

    function getPersonNameOrId(personId) {
        const person = parsedPersons[personId];
        return person?.data?.name || person?.data?.id || personId || '未知';
    }

    function createSelectorPanelAndButton() {
        if (panelCreated || !familyTreeContainer) {
            if (!familyTreeContainer) console.error("Cannot create selector panel: Parent container #family-tree-container not found.");
            return;
        }
        selectorPanel = document.createElement('div');
        selectorPanel.id = 'tree-selector-panel';
        const header = document.createElement('div');
        header.className = 'tree-selector-header';
        header.innerHTML = `<h4>選擇樹系視圖</h4><button id="close-tree-selector-btn">×</button>`;
        const listContainer = document.createElement('div');
        listContainer.id = 'tree-selector-list-container';
        selectorList = document.createElement('ul');
        selectorList.id = 'tree-selector-list';
        listContainer.appendChild(selectorList);
        statusMessageContainer = document.createElement('div');
        statusMessageContainer.id = 'tree-selector-status-msg';
        statusMessageContainer.className = 'tree-selector-status';
        listContainer.appendChild(statusMessageContainer);
        selectorPanel.appendChild(header);
        selectorPanel.appendChild(listContainer);
        familyTreeContainer.appendChild(selectorPanel);
        toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-tree-selector-btn';
        toggleButton.textContent = '⋮';
        toggleButton.title = '顯示樹系選擇面板';
        familyTreeContainer.appendChild(toggleButton);
        closeButton = selectorPanel.querySelector('#close-tree-selector-btn');
        if (closeButton) closeButton.addEventListener('click', hideSelectorPanel);
        if (toggleButton) toggleButton.addEventListener('click', showSelectorPanel);
        if (selectorList) {
            selectorList.addEventListener('touchstart', (event) => {
                if (event.touches.length === 1) { touchstartX = event.touches[0].clientX; touchstartY = event.touches[0].clientY; }
            });
            selectorList.addEventListener('touchend', (event) => {
                if (event.changedTouches.length === 1) {
                    const touchendX = event.changedTouches[0].clientX; const touchendY = event.changedTouches[0].clientY;
                    const deltaX = Math.abs(touchendX - touchstartX); const deltaY = Math.abs(touchendY - touchstartY);
                    if (deltaX < clickThreshold && deltaY < clickThreshold) {
                        const listItem = event.target.closest('li');
                        if (listItem && selectorList.contains(listItem)) {
                            const optionIndex = parseInt(listItem.dataset.optionIndex, 10);
                            if (!isNaN(optionIndex)) { setTimeout(() => { handleOptionSelection(optionIndex, listItem); }, 50); }
                        }
                    }
                }
            });
            let isHandlingTouch = false;
            selectorList.addEventListener('click', (event) => {
                if (isHandlingTouch) { isHandlingTouch = false; return; }
                const listItem = event.target.closest('li');
                if (listItem && selectorList.contains(listItem)) {
                    const optionIndex = parseInt(listItem.dataset.optionIndex, 10);
                    if (!isNaN(optionIndex)) { handleOptionSelection(optionIndex, listItem); }
                }
            });
            const originalHandleOptionSelection = handleOptionSelection;
            handleOptionSelection = function(optionIndex, selectedListItem) {
                isHandlingTouch = true; originalHandleOptionSelection(optionIndex, selectedListItem);
                setTimeout(() => { isHandlingTouch = false; }, 100);
            };
        }
        if (familyTreeContainer) {
            familyTreeContainer.addEventListener('click', (event) => {
                if (selectorPanel && selectorPanel.classList.contains('visible') &&
                    !selectorPanel.contains(event.target) && (!toggleButton || !toggleButton.contains(event.target))) {
                    hideSelectorPanel();
                }
            });
        }
        if (selectorPanel) {
            selectorPanel.addEventListener('click', (event) => { event.stopPropagation(); }, { passive: false });
            selectorPanel.addEventListener('touchstart', (event) => { event.stopPropagation(); }, { passive: false });
            selectorPanel.addEventListener('touchend', (event) => { event.stopPropagation(); }, { passive: false });
        }
        if (toggleButton) {
            toggleButton.addEventListener('click', (event) => { event.stopPropagation(); }, { passive: false });
            toggleButton.addEventListener('touchstart', (event) => { event.stopPropagation(); }, { passive: false });
            toggleButton.addEventListener('touchend', (event) => { event.stopPropagation(); }, { passive: false });
        }
        panelCreated = true;
    }

    function showSelectorPanel() {
        if (!panelCreated) createSelectorPanelAndButton();
        if (selectorPanel) selectorPanel.classList.add('visible');
        if (toggleButton) toggleButton.style.display = 'none';
    }

    function hideSelectorPanel() {
        if (!panelCreated || !selectorPanel) return;
        selectorPanel.classList.remove('visible');
        setTimeout(() => {
            if (toggleButton && !selectorPanel.classList.contains('visible')) {
                toggleButton.style.display = currentOptions.length > 0 ? 'block' : 'none';
            }
        }, 300);
    }

    function displayStatusMessage(message) {
        if (!panelCreated || !statusMessageContainer || !selectorList) return;
        statusMessageContainer.textContent = message;
        statusMessageContainer.style.display = message ? 'block' : 'none';
        selectorList.style.display = message ? 'none' : 'block';
        if (toggleButton && message) toggleButton.style.display = 'none';
    }

    // --- Parse FTDL Code ---
    function parsePersonsAndRelationships(ftdlText) {
        parsedPersons = {};
        parsedRelationships = [];
        globalParsedMetadata = ""; // ADDED: Reset globalParsedMetadata
        // MODIFIED: Added 'metadata' to the regex
        const blockRegex = /(person|relationship|metadata)\s*\{([\s\S]*?)\}/g;
        let match;

        while ((match = blockRegex.exec(ftdlText)) !== null) {
            const blockType = match[1];
            const blockContent = match[2];
            const rawBlock = match[0];

            if (blockType === 'person') {
                parsePersonBlock(blockContent, rawBlock);
            } else if (blockType === 'relationship') {
                parseRelationshipBlock(blockContent, rawBlock);
            } else if (blockType === 'metadata') { // ADDED: Handle metadata block
                globalParsedMetadata = rawBlock; // Store the entire raw metadata block
                console.log("Found global metadata block:", globalParsedMetadata);
            }
        }
        console.log(`Parsing complete: ${Object.keys(parsedPersons).length} Persons, ${parsedRelationships.length} Relationships. Global metadata found: ${!!globalParsedMetadata}`);

        parsedRelationships.forEach((rel, index) => {
            const partners = rel.data.partners || [];
            const children = rel.data.children || [];
            [...partners, ...children].forEach(id => {
                if (!parsedPersons[id]) {
                    console.warn(`Warning: Relationship ${index + 1} references ID '${id}' which was not found in Person definitions.`);
                }
            });
            if (partners.length === 0) {
                console.warn(`Warning: Relationship ${index + 1} has no partners defined.`);
            }
        });
    }

    function parsePersonBlock(content, rawFtdl) {
        const personData = { rawFtdl: rawFtdl };
        const propertyParserRegex = /\s*([\w?]+)\s*:\s*([^;]*?)\s*;/g;
        let match;
        let hasId = false;

        while ((match = propertyParserRegex.exec(content)) !== null) {
            let key = match[1].trim().replace('?', '');
            let value = match[2].trim();
            if (key === 'proband') {
                personData[key] = value.toLowerCase() === 'true';
            } else if (key === 'id') {
                personData[key] = value;
                if (value) hasId = true;
            } else {
                personData[key] = value;
            }
        }

        if (hasId && personData.id) {
            if (parsedPersons[personData.id]) {
                console.warn(`Duplicate Person ID found: ${personData.id}.`);
            }
            parsedPersons[personData.id] = { data: personData, rawFtdl: rawFtdl };
        } else {
            console.warn("Parsed Person block is missing 'id' or ID is empty. Skipping:", rawFtdl);
        }
    }

    function parseRelationshipBlock(content, rawFtdl) {
        const relData = { rawFtdl: rawFtdl };
        const propertyParserRegex = /\s*([\w?]+)\s*:\s*([^;]*?)\s*;/g;
        const arrayRegex = /\[(.*?)\]/;
        let match;
        let hasPartners = false;

        while ((match = propertyParserRegex.exec(content)) !== null) {
            let key = match[1].trim().replace('?', '');
            let value = match[2].trim();
            if (key === 'partners' || key === 'children') {
                const arrayMatch = value.match(arrayRegex);
                if (arrayMatch && typeof arrayMatch[1] === 'string') {
                    relData[key] = arrayMatch[1].split(',').map(item => item.trim()).filter(item => item);
                    if (key === 'partners' && relData[key].length > 0) {
                        hasPartners = true;
                    }
                } else {
                    relData[key] = [];
                }
            } else {
                relData[key] = value;
            }
        }

        if (hasPartners) {
            parsedRelationships.push({ data: relData, rawFtdl: rawFtdl });
        } else {
            console.warn("Parsed Relationship block is missing 'partners' or partners list is empty. Skipping:", rawFtdl);
        }
    }
    
    // ADDED: Helper function to create or modify metadata block with a dynamic subtitle
    function getMetadataWithDynamicSubtitle(baseMetadataString, dynamicSubtitleValue) {
        // Escape double quotes in the subtitle value for FTDL string compatibility
        const safeSubtitleValue = dynamicSubtitleValue.replace(/"/g, '\\"');
        const subtitleEntryLine = `    subtitle: "${safeSubtitleValue}";`; // Includes indentation
        let newMetadataString = "";

        if (baseMetadataString && baseMetadataString.trim() !== "") {
            let currentMeta = baseMetadataString.trim();
            // Regex to find existing subtitle: captures indent, "subtitle:", value, and trailing "; "
            // It handles escaped quotes within the existing subtitle value.
            const subtitleRegex = /^(\s*subtitle\s*:\s*")(?:[^"\\]|\\.)*(";\s*)$/im;
            
            const lines = currentMeta.split('\n');
            let subtitleFoundAndReplaced = false;

            // Attempt to replace existing subtitle line
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().toLowerCase().startsWith('subtitle:')) {
                    // Preserve original indentation if possible, otherwise use default
                    const leadingWhitespaceMatch = lines[i].match(/^(\s*)/);
                    const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : '    ';
                    lines[i] = leadingWhitespace + `subtitle: "${safeSubtitleValue}";`;
                    subtitleFoundAndReplaced = true;
                    break;
                }
            }

            if (subtitleFoundAndReplaced) {
                newMetadataString = lines.join('\n');
            } else {
                // Subtitle not found, inject it before the last '}'
                const lastBraceIndex = currentMeta.lastIndexOf('}');
                if (lastBraceIndex !== -1) {
                    let beforeBrace = currentMeta.substring(0, lastBraceIndex);
                    // Ensure a newline if there's content and it doesn't end with '{' or newline
                    if (beforeBrace.trim().length > 0 && 
                        !beforeBrace.trim().endsWith('{') && 
                        !beforeBrace.trimEnd().endsWith('\n')) {
                        beforeBrace = beforeBrace.trimEnd() + '\n';
                    } else if (beforeBrace.trim().endsWith('{')) { // Handles "metadata {"
                         beforeBrace = beforeBrace.trimEnd() + '\n';
                    }
                    newMetadataString = beforeBrace + subtitleEntryLine + '\n' + currentMeta.substring(lastBraceIndex);
                } else {
                    // Malformed metadata (no closing brace), try to wrap it and add subtitle
                    console.warn("Original metadata block seems malformed (no closing '}' or structure). Creating new metadata block with subtitle.");
                    newMetadataString = `metadata {\n${subtitleEntryLine}\n}`; // Fallback to creating a new block
                }
            }
        } else {
            // No existing global metadata, create a new one
            newMetadataString = `metadata {\n${subtitleEntryLine}\n}`;
        }
        return newMetadataString;
    }


    // --- Identify and Filter Trees ---
    // 規則：
    // 1. 能一次畫完全部代數、沒有維度衝突時，只提供「完整家系」視圖。
    //    維度衝突：同一段伴侶關係的兩個人都有父母在圖中（兩邊的原生家庭搶同一個位置），
    //    或同一個人被寫成兩對父母的孩子。
    // 2. 有衝突時，每一個「有孫輩的人」都是樹核，從他往下畫直系視圖：
    //    樹核本人、他的所有婚姻、所有世代的後代，以及後代的婚姻對象；
    //    不畫婚姻對象的父母、手足等其他親屬，也不裁切代數。
    // 3. 某個樹核的視圖如果已經完整包含在另一個視圖裡，就不另外列出。
    // 4. 不在任何視圖裡的人，依關係連通成獨立群組。
    // 5. 同一個人可以同時出現在多個視圖裡，不會因為已經出現過就被隱藏。
    function buildRelationshipSnippet(rel, memberIds) {
        const keptPartners = (rel.data.partners || []).filter(pId => memberIds.has(pId));
        const keptChildren = (rel.data.children || []).filter(cId => memberIds.has(cId));
        if (keptPartners.length === 0 && keptChildren.length === 0) return '';
        const originalLines = rel.rawFtdl.split('\n'); const modifiedLines = [];
        let partnersLineFound = false; let childrenLineFound = false;
        const newPartnersContent = keptPartners.length > 0 ? `    partners: [${keptPartners.join(', ')}];` : null;
        const newChildrenContent = keptChildren.length > 0 ? `    children: [${keptChildren.join(', ')}];` : null;
        for (let i = 0; i < originalLines.length; i++) {
            const line = originalLines[i]; const trimmedLine = line.trim();
            if (trimmedLine.startsWith('relationship {')) { modifiedLines.push(line); continue; }
            if (trimmedLine === '}') {
                if (!partnersLineFound && newPartnersContent !== null) modifiedLines.push(newPartnersContent);
                if (!childrenLineFound && newChildrenContent !== null) modifiedLines.push(newChildrenContent);
                modifiedLines.push(line); continue;
            }
            if (trimmedLine.startsWith('partners:')) {
                partnersLineFound = true;
                if (newPartnersContent !== null) { const indentation = line.match(/^\s*/)?.[0] || '    '; modifiedLines.push(indentation + newPartnersContent.trimStart()); }
                continue;
            } else if (trimmedLine.startsWith('children:')) {
                childrenLineFound = true;
                if (newChildrenContent !== null) { const indentation = line.match(/^\s*/)?.[0] || '    '; modifiedLines.push(indentation + newChildrenContent.trimStart()); }
                continue;
            } modifiedLines.push(line);
        }
        return modifiedLines.join('\n').trim() + "\n\n";
    }

    function buildTreeFtdl(memberIds, subtitle) {
        let snippet = '';
        Object.keys(parsedPersons).forEach(id => {
            if (memberIds.has(id)) snippet += parsedPersons[id].rawFtdl + "\n\n";
        });
        parsedRelationships.forEach(rel => { snippet += buildRelationshipSnippet(rel, memberIds); });
        const finalMetadataBlock = getMetadataWithDynamicSubtitle(globalParsedMetadata, subtitle);
        return ((finalMetadataBlock ? finalMetadataBlock + "\n\n" : "") + snippet.trim()).trim();
    }

    function identifyAndFilterTrees() {
        identifiedTrees = [];
        if (Object.keys(parsedPersons).length === 0) return;

        const personMap = {};
        Object.keys(parsedPersons).forEach(id => {
            personMap[id] = { id, parentRels: [], rels: [], generation: 0 };
        });
        const rels = parsedRelationships.map((rel, index) => ({
            index,
            partners: (rel.data.partners || []).filter(id => personMap[id]),
            children: (rel.data.children || []).filter(id => personMap[id])
        })).filter(rel => rel.partners.length > 0);
        rels.forEach(rel => {
            rel.partners.forEach(id => personMap[id].rels.push(rel));
            rel.children.forEach(id => personMap[id].parentRels.push(rel));
        });

        // 世代：沒有父母的人從 0 開始；子女 = 父母最大世代 + 1；伴侶對齊到同一代
        for (let iter = 0, changed = true; changed && iter < 100; iter++) {
            changed = false;
            rels.forEach(rel => {
                const gen = Math.max(...rel.partners.map(id => personMap[id].generation));
                rel.partners.forEach(id => {
                    if (personMap[id].generation < gen) { personMap[id].generation = gen; changed = true; }
                });
                // 同一對父母的子女在同一代（例如只有一個手足嫁進較晚的世代時，其他手足也跟著往下）
                const siblingGen = Math.max(gen + 1, ...rel.children.map(id => personMap[id].generation));
                rel.children.forEach(id => {
                    if (personMap[id].generation < siblingGen) { personMap[id].generation = siblingGen; changed = true; }
                });
                // 沒有父母的人（例如姻親的父母）往下對齊：至少是子女的上一代
                if (rel.children.length > 0) {
                    const childGen = Math.min(...rel.children.map(id => personMap[id].generation));
                    rel.partners.forEach(id => {
                        if (personMap[id].parentRels.length === 0 && personMap[id].generation < childGen - 1) { personMap[id].generation = childGen - 1; changed = true; }
                    });
                }
            });
        }

        const relsOf = id => personMap[id].rels;
        const names = ids => ids.map(getPersonNameOrId).join(' & ');
        const trees = [];

        // 維度衝突：範圍內同一段伴侶關係的兩個人都有父母在範圍內，或同一個人有兩對父母在範圍內
        // 血親婚姻（雙方有共同祖先，例如表兄妹結婚）由排版程式用例外畫法處理，不算維度衝突
        function ancestorsOf(id, seen = new Set()) {
            personMap[id].parentRels.forEach(r => r.partners.forEach(pid => { if (!seen.has(pid)) { seen.add(pid); ancestorsOf(pid, seen); } }));
            return seen;
        }
        function isBloodMarriage(rel) {
            if (rel.partners.length !== 2) return false;
            const ancestorsA = ancestorsOf(rel.partners[0]);
            return [...ancestorsOf(rel.partners[1])].some(id => ancestorsA.has(id));
        }
        function findConflicts(members) {
            const conflicts = [];
            const parentRelsIn = id => personMap[id].parentRels.filter(r => r.partners.some(pid => members.has(pid)));
            rels.forEach(rel => {
                if (isBloodMarriage(rel)) return;
                const inside = rel.partners.filter(id => members.has(id));
                const withParents = inside.filter(id => parentRelsIn(id).length > 0);
                if (withParents.length > 1) conflicts.push(`${names(withParents)} 兩邊都有父母`);
            });
            members.forEach(id => {
                if (parentRelsIn(id).length > 1) conflicts.push(`${getPersonNameOrId(id)} 有兩對父母`);
            });
            return conflicts;
        }
        const countGenerations = members => new Set(Array.from(members).map(id => personMap[id].generation)).size;
        const probandIds = Object.keys(personMap).filter(id => parsedPersons[id].data.proband === true);

        // 直系視圖：本人、他的所有婚姻對象，以及往下所有世代的後代與後代的婚姻對象
        function lineageOf(personId) {
            const members = new Set([personId]);
            const queue = [personId];
            while (queue.length) {
                const id = queue.shift();
                relsOf(id).forEach(r => {
                    r.partners.forEach(pid => members.add(pid)); // 婚姻對象本人，不往上畫他的父母
                    r.children.forEach(cid => { if (!members.has(cid)) { members.add(cid); queue.push(cid); } });
                });
            }
            return members;
        }
        const hasGrandchildren = id => relsOf(id).some(r => r.children.some(cid => relsOf(cid).some(cr => cr.children.length > 0)));

        // --- 1. 完整家系 ---
        const allIds = new Set(Object.keys(personMap));
        const conflicts = findConflicts(allIds);
        if (conflicts.length === 0) {
            trees.push({ kind: 'full', members: allIds, name: `完整家系（${countGenerations(allIds)} 代）`, sortGen: -1 });
        } else {
            console.log('完整家系有維度衝突，改用樹核的直系視圖：', conflicts);
            // --- 2. 每個有孫輩的人都是樹核 ---
            Object.keys(personMap).filter(hasGrandchildren).forEach(coreId => {
                const members = lineageOf(coreId);
                const genCount = countGenerations(members);
                const coreNames = [coreId, ...relsOf(coreId).flatMap(r => r.partners).filter(id => id !== coreId)];
                trees.push({
                    kind: 'lineage', members,
                    name: `${names([...new Set(coreNames)])} 直系（${genCount} 代）`,
                    sortGen: (probandIds.some(id => members.has(id)) ? -1000 : 0) - genCount * 10 + personMap[coreId].generation
                });
            });
        }

        // --- 3. 已經完整包含在另一個視圖裡的樹核視圖不另外列出 ---
        const isSubset = (a, b) => a.size <= b.size && Array.from(a).every(id => b.has(id));
        const kept = [];
        trees.slice().sort((a, b) => b.members.size - a.members.size).forEach(tree => {
            if (!kept.some(other => isSubset(tree.members, other.members))) kept.push(tree);
        });
        trees.length = 0;
        trees.push(...kept);

        // --- 4. 不在任何視圖裡的人：依關係連通成獨立群組 ---
        const inSomeTree = new Set();
        trees.forEach(t => { if (t.kind !== 'full') t.members.forEach(id => inSomeTree.add(id)); });
        Object.keys(personMap).forEach(startId => {
            if (inSomeTree.has(startId)) return;
            const members = new Set([startId]); inSomeTree.add(startId);
            const queue = [startId];
            while (queue.length) {
                const id = queue.shift();
                const neighbours = [
                    ...relsOf(id).flatMap(r => [...r.partners, ...r.children]),
                    ...personMap[id].parentRels.flatMap(r => r.partners)
                ];
                neighbours.forEach(n => { if (!inSomeTree.has(n)) { inSomeTree.add(n); members.add(n); queue.push(n); } });
            }
            const ids = Array.from(members);
            trees.push({
                kind: 'group', members,
                name: names(ids.slice(0, 2)) + (ids.length > 1 ? ' 群組' : '（獨立）'),
                sortGen: Math.min(...ids.map(id => personMap[id].generation))
            });
        });

        // 內容完全相同的視圖只留一個
        const seen = new Set();
        const order = { full: 0, lineage: 1, group: 2 };
        trees.sort((a, b) => order[a.kind] - order[b.kind] || a.sortGen - b.sortGen || a.name.localeCompare(b.name));
        trees.forEach(tree => {
            const key = Array.from(tree.members).sort().join('|');
            if (seen.has(key)) return;
            seen.add(key);
            identifiedTrees.push({
                kind: tree.kind,
                roots: Array.from(tree.members),
                name: tree.name,
                ftdlCode: buildTreeFtdl(tree.members, tree.name.replace(/（.*）$/, ''))
            });
        });
        console.log(`Identification complete. Found ${identifiedTrees.length} trees/groups.`);
    }

    function populateSelectorList() {
        if (!panelCreated) { createSelectorPanelAndButton(); if (!panelCreated) return; }
        if (!selectorList) return;
        currentOptions = [];
        identifiedTrees.forEach(tree => currentOptions.push({ ...tree }));
        selectorList.innerHTML = ''; statusMessageContainer.textContent = ''; statusMessageContainer.style.display = 'none';
        if (currentOptions.length === 0) {
            displayStatusMessage("未找到可供選擇的樹系。請檢查 FTDL 代碼。");
            if (toggleButton) toggleButton.style.display = 'none'; return;
        } else selectorList.style.display = 'block';
        currentOptions.forEach((option, index) => {
            const li = document.createElement('li'); li.textContent = option.name;
            li.dataset.optionIndex = index; selectorList.appendChild(li);
        });
        console.log("Selector list populated.");
    }

var handleOptionSelection = function(optionIndex, selectedListItem) { // var for hoisting
    if (optionIndex < 0 || optionIndex >= currentOptions.length) return;
    const selectedOption = currentOptions[optionIndex];
    console.log(`Selected: ${selectedOption.name}`);
    console.log(`Rendering FTDL for ${selectedOption.name}:\n${selectedOption.ftdlCode}`); // Log FTDL to verify subtitle

    globalClearFunction();

    // >> 在這裡加入這行，用於處理和顯示選定樹系代碼中的 metadata <<
    if (typeof window.processMetadata === 'function') {
         window.processMetadata(selectedOption.ftdlCode);
    }

    try {
         globalRenderFunction(selectedOption.ftdlCode);
    }
    catch (error) {
        console.error("Error rendering selected tree:", error);
        const wrapper = document.getElementById('family-tree-scalable-wrapper') || familyTreeContainer;
        if (wrapper) wrapper.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">渲染 ${selectedOption.name} 時發生錯誤: ${error.message}</p>`;
    }
    if (selectorList) selectorList.querySelectorAll('li.selected').forEach(li => li.classList.remove('selected'));
    if (selectedListItem) {
        selectedListItem.classList.add('selected');
        // 只捲動清單本身；用 scrollIntoView 會在面板收起時把整個畫布容器往右捲，
        // 造成右上角按鈕和家系圖整個往左偏
        const listContainer = selectedListItem.closest('#tree-selector-list-container');
        if (listContainer) {
            const itemTop = selectedListItem.offsetTop - listContainer.offsetTop;
            if (itemTop < listContainer.scrollTop) listContainer.scrollTop = itemTop;
            else if (itemTop + selectedListItem.offsetHeight > listContainer.scrollTop + listContainer.clientHeight) {
                listContainer.scrollTop = itemTop + selectedListItem.offsetHeight - listContainer.clientHeight;
            }
        }
    }
    if (familyTreeContainer) { familyTreeContainer.scrollLeft = 0; familyTreeContainer.scrollTop = 0; }
    switchToCanvasView();
    // ... 函數的其餘部分保持不變 ...
};

    function switchToCanvasView() {
        const canvasView = document.getElementById('family-tree-container');
        const editorView = document.getElementById('ftdl-editor-view');
        const canvasTabBtn = document.querySelector('.desktop-view-switcher .tab-btn[data-view="canvas"]');
        const mobileViewToggleBtn = document.getElementById('mobile-view-toggle-btn');
        const currentMobileViewLabel = document.getElementById('current-mobile-view-label');
        const mobileViewOptionsContainer = document.getElementById('mobile-view-options');

        if (canvasView && editorView && viewContainer) {
            viewContainer.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            canvasView.classList.add('active'); canvasView.style.display = 'flex'; editorView.style.display = 'none';
            if (canvasTabBtn) {
                document.querySelectorAll('.desktop-view-switcher .tab-btn').forEach(b => b.classList.remove('active'));
                canvasTabBtn.classList.add('active');
            }
            if (mobileViewToggleBtn && currentMobileViewLabel && mobileViewOptionsContainer) {
                currentMobileViewLabel.textContent = '畫布';
                mobileViewOptionsContainer.querySelectorAll('.mobile-view-option').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-view') === 'canvas');
                });
                mobileViewOptionsContainer.classList.remove('open');
                const dropdownArrow = mobileViewToggleBtn.querySelector('.dropdown-arrow');
                if (dropdownArrow) dropdownArrow.style.transform = 'rotate(0deg)';
            }
        }
    }

function executeAndSelectTree() {
    if (ftdlEditor) { originalFullCode = ftdlEditor.value; sessionStorage.setItem('lastFTDLCode', originalFullCode); }
    else originalFullCode = "";
    globalClearFunction();
    parsePersonsAndRelationships(originalFullCode);

    // >> 在這裡加入這行，用於處理和顯示原始完整代碼中的 metadata <<
    if (typeof window.processMetadata === 'function') {
         window.processMetadata(originalFullCode);
    }

    identifyAndFilterTrees();
    if (!panelCreated) createSelectorPanelAndButton();
    populateSelectorList();
    switchToCanvasView();
        if (currentOptions.length > 0) {
            // 預設畫第一個視圖：能一次畫完時是「完整家系」，否則是含案主、代數最多的直系視圖
            if (currentOptions.length > 1) showSelectorPanel(); else hideSelectorPanel();
            setTimeout(() => {
                const firstItem = selectorList ? selectorList.querySelector('li[data-option-index="0"]') : null;
                handleOptionSelection(0, firstItem);
            }, 50);
        } else { hideSelectorPanel(); globalClearFunction(); }
    }

    if (executeBtn && ftdlEditor && familyTreeContainer && viewContainer) {
        executeBtn.addEventListener('click', executeAndSelectTree);
        ftdlEditor.addEventListener('keydown', (event) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifierKey = isMac ? event.metaKey : event.ctrlKey;
            const editorView = document.getElementById('ftdl-editor-view');
            if (modifierKey && event.key === 'Enter' && editorView && editorView.classList.contains('active')) {
                event.preventDefault(); executeBtn.click();
            }
        });
    } else console.error("Missing required elements for treeSelector.js init.");
    console.log("treeSelector.js initialized.");
});