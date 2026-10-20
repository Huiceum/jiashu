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
    // 1. 能一次畫完全部代數、沒有維度衝突時，提供「完整家系」視圖（預設顯示）。
    //    維度衝突：同一段伴侶關係的兩個人都有父母在圖中（兩邊的原生家庭搶同一個位置），
    //    或同一個人被寫成兩對父母的孩子。
    // 2. 每一對「有孫輩」的伴侶都是一個樹核，各自形成三代分支：
    //    樹核本人 → 子女 → 孫輩，加上子女與孫輩的伴侶（不往上畫伴侶的父母，他們通常是別的樹核）。
    // 3. 只有兩代、且沒有被任何三代分支涵蓋的家庭，自成一個分支；剩下的人歸入獨立群組。
    // 4. 同一個人可以同時出現在多個分支裡，不會因為已經出現過就被隱藏。
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
                rel.children.forEach(id => {
                    if (personMap[id].generation < gen + 1) { personMap[id].generation = gen + 1; changed = true; }
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

        const childrenOf = rel => rel.children;
        const relsOf = id => personMap[id].rels;
        const names = ids => ids.map(getPersonNameOrId).join(' & ');
        const trees = [];

        // --- 1. 完整家系 ---
        const conflicts = [];
        rels.forEach(rel => {
            const withParents = rel.partners.filter(id => personMap[id].parentRels.length > 0);
            if (withParents.length > 1) conflicts.push(`${names(withParents)} 兩邊都有父母`);
        });
        Object.values(personMap).forEach(p => {
            if (p.parentRels.length > 1) conflicts.push(`${getPersonNameOrId(p.id)} 有兩對父母`);
        });
        const allIds = new Set(Object.keys(personMap));
        const gens = new Set(Object.values(personMap).map(p => p.generation));
        if (conflicts.length === 0) {
            trees.push({ kind: 'full', members: allIds, name: `完整家系（${gens.size} 代）`, sortGen: -1 });
        } else {
            console.log('完整家系有維度衝突，改用分支樹：', conflicts);
        }

        // --- 2. 三代分支：有孫輩的伴侶是樹核 ---
        const coveredFamilyRels = new Set(); // 已經以「完整的一家人」出現在某個三代分支的伴侶關係
        rels.forEach(coreRel => {
            const grandchildRels = childrenOf(coreRel).flatMap(id => relsOf(id)).filter(r => r.children.length > 0);
            if (grandchildRels.length === 0) return;
            const members = new Set(coreRel.partners);
            coveredFamilyRels.add(coreRel.index);
            childrenOf(coreRel).forEach(childId => {
                members.add(childId);
                relsOf(childId).forEach(childRel => {
                    coveredFamilyRels.add(childRel.index);
                    childRel.partners.forEach(id => members.add(id));
                    childRel.children.forEach(grandId => {
                        members.add(grandId);
                        relsOf(grandId).forEach(r => r.partners.forEach(id => members.add(id)));
                    });
                });
            });
            const coreGen = Math.min(...coreRel.partners.map(id => personMap[id].generation));
            trees.push({ kind: 'branch', members, name: `${names(coreRel.partners)}（三代分支）`, sortGen: coreGen });
        });

        // --- 3. 沒被三代分支涵蓋的兩代家庭 ---
        rels.forEach(rel => {
            if (rel.children.length === 0 || coveredFamilyRels.has(rel.index)) return;
            const members = new Set([...rel.partners, ...rel.children]);
            rel.children.forEach(id => relsOf(id).forEach(r => r.partners.forEach(pid => members.add(pid))));
            const gen = Math.min(...rel.partners.map(id => personMap[id].generation));
            trees.push({ kind: 'branch', members, name: `${names(rel.partners)}（兩代）`, sortGen: gen });
        });

        // --- 4. 不在任何分支裡的人：依關係連通成獨立群組 ---
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

        // 內容完全相同的視圖只留一個（例如只有三代時，完整家系就等於唯一的分支）
        const seen = new Set();
        const order = { full: 0, branch: 1, group: 2 };
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
    if (selectedListItem) { selectedListItem.classList.add('selected'); selectedListItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
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
            // 預設畫第一個視圖：能一次畫完時是「完整家系」，否則是最上層的分支
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