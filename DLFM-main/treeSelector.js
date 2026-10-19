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
    function identifyAndFilterTrees() {
        identifiedTrees = [];
        if (Object.keys(parsedPersons).length === 0) return;

        const personMap = {};
        Object.keys(parsedPersons).forEach(id => {
            personMap[id] = {
                id: id, data: parsedPersons[id].data, rawFtdl: parsedPersons[id].rawFtdl,
                children: new Set(), parents: new Set(), partners: new Set(),
                relationships: [], generation: null, treeId: null, visited: false
            };
        });
        parsedRelationships.forEach((rel, relIndex) => {
            const partners = rel.data.partners || []; const children = rel.data.children || [];
            partners.forEach(p1Id => {
                if (!personMap[p1Id]) return; personMap[p1Id].relationships.push(relIndex);
                partners.forEach(p2Id => { if (p1Id !== p2Id && personMap[p2Id]) personMap[p1Id].partners.add(p2Id); });
                children.forEach(childId => {
                    if (!personMap[childId]) return;
                    personMap[p1Id].children.add(childId); personMap[childId].parents.add(p1Id);
                });
            });
            children.forEach(childId => {
                if (personMap[childId] && !personMap[childId].relationships.includes(relIndex)) {
                    personMap[childId].relationships.push(relIndex);
                }
            });
        });

        const potentialRoots = Object.values(personMap).filter(p => p.parents.size === 0);
        const processedPersons = new Set();

        potentialRoots.forEach(rootPerson => {
            if (processedPersons.has(rootPerson.id)) return;
            const currentTreeMembers = new Map();
            const queue = [{ personNode: rootPerson, gen: 1 }];
            const visitedInThisTree = new Set([rootPerson.id]);
            let maxGeneration = 1; rootPerson.generation = 1; currentTreeMembers.set(rootPerson.id, rootPerson);
            let head = 0;
            while(head < queue.length) {
                const { personNode, gen } = queue[head++]; maxGeneration = Math.max(maxGeneration, gen);
                personNode.children.forEach(childId => {
                    const childNode = personMap[childId];
                    if (childNode && !visitedInThisTree.has(childId)) {
                        visitedInThisTree.add(childId); childNode.generation = gen + 1;
                        currentTreeMembers.set(childId, childNode); queue.push({ personNode: childNode, gen: gen + 1 });
                    }
                });
                personNode.partners.forEach(partnerId => {
                    const partnerNode = personMap[partnerId];
                    if (partnerNode && !visitedInThisTree.has(partnerId)) {
                        visitedInThisTree.add(partnerId);
                        if (partnerNode.generation === null) partnerNode.generation = gen;
                        currentTreeMembers.set(partnerId, partnerNode); queue.push({ personNode: partnerNode, gen: partnerNode.generation });
                    }
                });
            }

            if (maxGeneration >= 3 || currentTreeMembers.size > 1) {
                const includedPersonIds = new Set();
                currentTreeMembers.forEach((personNode, personId) => {
                    const generation = personNode.generation;
                    if (maxGeneration <= 3 || (generation !== null && generation <= 3)) includedPersonIds.add(personId);
                    else if (generation === 4) {
                        let isDirectDescendant = false;
                        personNode.parents.forEach(parentId => {
                            const parentNode = currentTreeMembers.get(parentId);
                            if (parentNode && parentNode.generation === 3 && includedPersonIds.has(parentId)) isDirectDescendant = true;
                        });
                        if (isDirectDescendant) includedPersonIds.add(personId);
                    }
                });
                const partnersToAdd = new Set();
                includedPersonIds.forEach(id => {
                    const personNode = currentTreeMembers.get(id);
                    if (personNode) {
                        personNode.partners.forEach(partnerId => {
                            const partnerNode = currentTreeMembers.get(partnerId);
                            if (partnerNode && !includedPersonIds.has(partnerId)) {
                                if (maxGeneration <= 3 || (partnerNode.generation !== null && partnerNode.generation <= 3)) partnersToAdd.add(partnerId);
                            }
                        });
                    }
                });
                partnersToAdd.forEach(id => includedPersonIds.add(id));

                let personRelFtdlSnippet = ""; const personFtdlAdded = new Set();
                includedPersonIds.forEach(id => {
                    const person = personMap[id];
                    if (person && !personFtdlAdded.has(id)) {
                        personRelFtdlSnippet += person.rawFtdl + "\n\n"; personFtdlAdded.add(id); processedPersons.add(id);
                    }
                });
                const relationshipIndicesInTree = new Set();
                includedPersonIds.forEach(id => {
                    const person = personMap[id]; if (person) person.relationships.forEach(relIndex => relationshipIndicesInTree.add(relIndex));
                });
                relationshipIndicesInTree.forEach(relIndex => {
                    const rel = parsedRelationships[relIndex];
                    const keptPartners = (rel.data.partners || []).filter(pId => includedPersonIds.has(pId));
                    const keptChildren = (rel.data.children || []).filter(cId => includedPersonIds.has(cId));
                    if (keptPartners.length > 0 || keptChildren.length > 0) {
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
                        } personRelFtdlSnippet += modifiedLines.join('\n').trim() + "\n\n";
                    }
                });

                const gen1PeopleIds = Array.from(includedPersonIds).map(id => personMap[id]).filter(p => p && p.generation === 1).map(p => p.id);
                let treeName = `樹系 ${identifiedTrees.length + 1}`; // Default name
                if (gen1PeopleIds.length > 0) {
                    treeName = gen1PeopleIds.slice(0, 2).map(id => getPersonNameOrId(id)).join(' & ')  ;
                } else {
                    let minGen = Infinity; let earliestPeople = [];
                    Array.from(includedPersonIds).map(id => personMap[id]).filter(p => p).forEach(person => {
                        if (person.generation !== null) {
                            if (person.generation < minGen) { minGen = person.generation; earliestPeople = [person.id]; }
                            else if (person.generation === minGen) earliestPeople.push(person.id);
                        }
                    });
                    if (earliestPeople.length > 0) treeName = earliestPeople.slice(0, 2).map(id => getPersonNameOrId(id)).join(' & ') + ' 群組';
                    else if (Array.from(includedPersonIds).length > 0) treeName = Array.from(includedPersonIds).slice(0,2).map(id => getPersonNameOrId(id)).join(' & ') + ' (無世代資訊)';
                }

                // MODIFIED: Use treeName for dynamic subtitle, passing globalParsedMetadata
                const finalMetadataBlock = getMetadataWithDynamicSubtitle(globalParsedMetadata, treeName);
                const finalFtdlForOption = (finalMetadataBlock ? finalMetadataBlock + "\n\n" : "") + personRelFtdlSnippet.trim();

                identifiedTrees.push({
                    roots: gen1PeopleIds.length > 0 ? gen1PeopleIds : Array.from(includedPersonIds),
                    name: treeName,
                    ftdlCode: finalFtdlForOption.trim()
                });
            }
        });

        Object.keys(personMap).forEach(personId => {
            if (!processedPersons.has(personId)) {
                const groupMembers = new Set();
                const q = [personId]; processedPersons.add(personId); groupMembers.add(personId);
                let h = 0;
                while(h < q.length) {
                    const currentId = q[h++]; const currentNode = personMap[currentId];
                    [...currentNode.partners, ...currentNode.children, ...currentNode.parents].forEach(relativeId => {
                        if (personMap[relativeId] && !processedPersons.has(relativeId)) {
                            processedPersons.add(relativeId); groupMembers.add(relativeId); q.push(relativeId);
                        }
                    });
                }
                if (groupMembers.size > 0) {
                    let groupPersonRelFtdl = ""; const groupRelIndices = new Set(); const personFtdlAdded = new Set();
                    groupMembers.forEach(id => {
                        const person = personMap[id];
                        if(person && !personFtdlAdded.has(id)) { groupPersonRelFtdl += person.rawFtdl + "\n\n"; personFtdlAdded.add(id); }
                        if (person) person.relationships.forEach(idx => groupRelIndices.add(idx));
                    });
                    groupRelIndices.forEach(relIndex => {
                        const rel = parsedRelationships[relIndex];
                        const keptPartners = (rel.data.partners || []).filter(pId => groupMembers.has(pId));
                        const keptChildren = (rel.data.children || []).filter(cId => groupMembers.has(cId));
                        if (keptPartners.length > 0 || keptChildren.length > 0) {
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
                            } groupPersonRelFtdl += modifiedLines.join('\n').trim() + "\n\n";
                        }
                    });
                    
                    const groupName = Array.from(groupMembers).slice(0, 2).map(id => getPersonNameOrId(id)).join(' & ') + (groupMembers.size > 1 ? " 群組" : " (獨立)");
                    
                    // MODIFIED: Use groupName for dynamic subtitle, passing globalParsedMetadata
                    const finalMetadataBlock = getMetadataWithDynamicSubtitle(globalParsedMetadata, groupName);
                    const finalFtdlForOption = (finalMetadataBlock ? finalMetadataBlock + "\n\n" : "") + groupPersonRelFtdl.trim();

                    identifiedTrees.push({
                        roots: Array.from(groupMembers),
                        name: groupName,
                        ftdlCode: finalFtdlForOption.trim()
                    });
                }
            }
        });
        identifiedTrees.sort((a, b) => a.name.localeCompare(b.name));
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
            showSelectorPanel();
            setTimeout(() => {
                if (currentOptions.length === 1 && selectorList) {
                    const firstItem = selectorList.querySelector('li[data-option-index="0"]');
                    if (firstItem) handleOptionSelection(0, firstItem); else handleOptionSelection(0, null);
                } else if (selectorList) globalClearFunction();
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