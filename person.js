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
    }

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

    function showTooltip(event, personData) {
        if (isPanning) return; // Don't show tooltip while panning
        if (!tooltip) return;
        tooltip.style.display = 'block';
        updateTooltipContent(personData);
        updateTooltipPosition(event);
        // updateTooltipPositionOnMouseMove will be added on mouseenter/touchstart for the figure
    }

    function hideTooltip() {
        if (!tooltip) return;
        tooltip.style.display = 'none';
        // Event listener for mousemove is removed when mouse leaves the figure
    }
    
    function updateTooltipPositionOnMouseMove(event) { // This is the event handler itself
        updateTooltipPosition(event);
    }

    function updateTooltipPosition(event) {
        if (!tooltip || tooltip.style.display === 'none') return;
        let x = event.clientX + 10;
        let y = event.clientY + 10;

        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (x + tooltipRect.width > viewportWidth - 10) {
            x = event.clientX - tooltipRect.width - 10;
        }
        if (y + tooltipRect.height > viewportHeight - 10) {
            y = event.clientY - tooltipRect.height - 10;
        }
        if (x < 5) x = 5;
        if (y < 5) y = 5;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    function updateTooltipContent(personData) {
        if (!tooltip) return;
        const genderText = { male: '男', female: '女', other: '其他' }[(personData.gender || '').toLowerCase()] || '未填';
        const lines = [
            `${personData.name || '未命名'}（${personData.id || 'N/A'}）`,
            `性別：${genderText}`,
            `出生：${personData.birth || '未填'}`
        ];
        if (personData.death) {
            lines.push(`死亡：${personData.death === true ? '已過世（日期不詳）' : personData.death}`);
        }
        lines.push(`年齡：${calculateAgeDisplay(personData.birth, personData.death)}`);
        if (personData.wellbeing !== undefined && personData.wellbeing !== '') lines.push(`身心：${personData.wellbeing}`);
        if (personData.proband) lines.push('先證者');
        if (personData.chronic === true) lines.push('慢性病');
        if (personData.Disability === true) lines.push('身心障礙');
        if (personData.note && personData.note.trim()) lines.push(`備註：${personData.note}`);
        tooltip.textContent = lines.join('\n');
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

        // 研究擴充：fill 指定顏色，否則依 wellbeing（0–1）套用身心色階
        const research = window.FTDLResearch;
        if (research) {
            const wb = research.parseUnit(personData.wellbeing);
            if (wb !== null) figure.dataset.wellbeing = String(wb);
            const fill = research.resolveColor(personData.fill) || (wb !== null ? research.wellbeingColor(wb) : null);
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


        figure.addEventListener('mouseenter', (event) => {
            showTooltip(event, personData);
            document.addEventListener('mousemove', updateTooltipPositionOnMouseMove);
        });
        figure.addEventListener('mouseleave', () => {
            hideTooltip();
            document.removeEventListener('mousemove', updateTooltipPositionOnMouseMove);
        });
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
        resetView(); // Reset pan and zoom

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
    }

    function clearFamilyTree() {
        console.log("clearFamilyTree called.");
         if (!scalableWrapper) {
            initializeCanvasEnhancements();
            if(!scalableWrapper) { console.error("Scalable wrapper not found, cannot clear."); return; }
         }

        scalableWrapper.innerHTML = '';
        resetView();

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
