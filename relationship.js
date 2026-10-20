// relationship.js
document.addEventListener('DOMContentLoaded', () => {
    const scalableWrapper = document.getElementById('family-tree-scalable-wrapper');
    let svgLayer = null;

    let PERSON_WIDTH, PERSON_HEIGHT, SIBLING_SPACING, COUPLE_SPACING, FAMILY_UNIT_SPACING, INTER_TREE_SPACING,
        VERTICAL_UNIT, GENERATION_GAP_LINES, MULTI_MARRIAGE_Y_OFFSET, PCC_SHIFT_FACTOR_PER_OLD_MARRIAGE;

    function loadCssVars() {
        const rootStyle = getComputedStyle(document.documentElement);
        PERSON_WIDTH = parseFloat(rootStyle.getPropertyValue('--person-figure-size')) || 70;
        PERSON_HEIGHT = PERSON_WIDTH;
        SIBLING_SPACING = parseFloat(rootStyle.getPropertyValue('--sibling-spacing')) || 35;
        COUPLE_SPACING = parseFloat(rootStyle.getPropertyValue('--couple-spacing')) || 30;
        FAMILY_UNIT_SPACING = parseFloat(rootStyle.getPropertyValue('--family-unit-spacing')) || 55;
        INTER_TREE_SPACING = parseFloat(rootStyle.getPropertyValue('--inter-tree-spacing')) || 80;
        VERTICAL_UNIT = parseFloat(rootStyle.getPropertyValue('--vertical-spacing-unit')) || 35;
        GENERATION_GAP_LINES = parseFloat(rootStyle.getPropertyValue('--generation-gap-lines')) || 35;
        MULTI_MARRIAGE_Y_OFFSET = parseFloat(rootStyle.getPropertyValue('--multi-marriage-Y-offset')) || 22;
        PCC_SHIFT_FACTOR_PER_OLD_MARRIAGE = parseFloat(rootStyle.getPropertyValue('--pcc-shift-factor')) || 0.2;
    }

    function ensureSvgLayer() {
        if (!scalableWrapper) return null;
        svgLayer = document.getElementById('relationship-svg-layer');
        if (!svgLayer) {
            svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgLayer.id = 'relationship-svg-layer';
            svgLayer.style.position = 'absolute';
            svgLayer.style.top = '0';
            svgLayer.style.left = '0';
            svgLayer.style.overflow = 'visible';
            svgLayer.style.pointerEvents = 'none';
            svgLayer.style.zIndex = '0';

            if (scalableWrapper.firstChild) {
                scalableWrapper.insertBefore(svgLayer, scalableWrapper.firstChild);
            } else {
                scalableWrapper.appendChild(svgLayer);
            }
        }
        svgLayer.innerHTML = '';
        return svgLayer;
    }

    function parseRelationshipFTDL(ftdlText) {
        const relationships = [];
        const relationshipRegex = /relationship\s*\{([\s\S]*?)\}/g;
        let match;
        let relCounter = 0;
        while ((match = relationshipRegex.exec(ftdlText)) !== null) {
            const relData = { partners: [], children: [] };
            const propertiesText = match[1];
            const propertyRegex = /\s*(\w+)\s*:\s*([^;]*?)\s*;/g;
            let propMatch;

            while ((propMatch = propertyRegex.exec(propertiesText)) !== null) {
                const key = propMatch[1].trim();
                let valueStr = propMatch[2].trim(); // The raw string value

                if (key === "partners" || key === "children") {
                    relData[key] = valueStr.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(s => s);
                } else if (key === 'start_date' || key === 'end_date' || key === 'type' || key === 'status') {
                    // For these specific keys, always store as string. If quoted, remove quotes.
                    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
                        relData[key] = valueStr.substring(1, valueStr.length - 1);
                    } else {
                        relData[key] = valueStr; // Store as string, e.g., "2010" or "partnership"
                    }
                } else { // General case for other properties
                    let parsedValue;
                    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
                        parsedValue = valueStr.substring(1, valueStr.length - 1);
                    } else if (valueStr.toLowerCase() === 'true') {
                        parsedValue = true;
                    } else if (valueStr.toLowerCase() === 'false') {
                        parsedValue = false;
                    } else if (!isNaN(valueStr) && valueStr.trim() !== '') {
                        // Check if it's explicitly a string field (already handled above)
                        // otherwise parse as float.
                        // This prevents converting "type": "some_string_that_looks_numeric" to number
                        parsedValue = parseFloat(valueStr);
                    } else {
                        parsedValue = valueStr; // Default to string if no other parse matches
                    }
                    relData[key] = parsedValue;
                }
            }

            if (relData.partners.length > 0) {
                const datePart = (relData.start_date || `noDate${relCounter}`).replace(/\W/g, '');
                const sortedPartnerIds = [...relData.partners].sort().join('_');
                relData.id = relData.id || `rel_${sortedPartnerIds}_${datePart}_${relCounter++}`;
                relationships.push(relData);
            }
        }
        return relationships;
    }

    // Helper function to parse flexible date strings (yyyy, yyyy-mm, yyyy-mm-dd)
    // Returns a Date object for comparison, or new Date(0) if unparseable/empty.
    function parseFlexibleDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return new Date(0); // Represents an invalid or non-existent date for sorting
        }
        dateStr = dateStr.trim();

        // Try yyyy-mm-dd
        let parts = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (parts) {
            const d = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
            if (!isNaN(d.getTime())) return d;
        }

        // Try yyyy-mm
        parts = dateStr.match(/^(\d{4})-(\d{1,2})$/);
        if (parts) {
            const d = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, 1);
            if (!isNaN(d.getTime())) return d;
        }

        // Try yyyy
        parts = dateStr.match(/^(\d{4})$/);
        if (parts) {
            const d = new Date(parseInt(parts[1]), 0, 1); // January 1st of that year
            if (!isNaN(d.getTime())) return d;
        }
        
        // Fallback for other unparseable or ambiguous formats.
        // Avoid direct new Date(dateStr) for "yyyy" as it can be inconsistent.
        return new Date(0);
    }


    function getRenderedPersons() {
        if (!scalableWrapper) return {};
        const personElements = scalableWrapper.querySelectorAll('.person-figure');
        const persons = {};
        personElements.forEach(el => {
            const id = el.dataset.personId;
            if (id) {
                persons[id] = {
                    id: id, el: el,
                    width: el.offsetWidth || PERSON_WIDTH,
                    height: el.offsetHeight || PERSON_HEIGHT,
                    x: 0, y: 0, cx: 0, cy: 0,
                    generation: -1,
                    marriages: [],
                    marriageOrder: {},
                    parentsRelationship: null,
                    layoutData: {
                        subtreeWidth: 0,
                        totalFamilyUnitsBlockWidth: 0,
                        familyUnits: [],
                        maxMarriageYOffsetInGen: 0,
                        maxX: undefined
                    }
                };
                 el.style.position = 'absolute';
                 el.style.zIndex = '1';
            }
        });
        return persons;
    }

    function processData(personsMap, relationships) {
         Object.values(personsMap).forEach(person => {
             person.marriages = [];
             person.marriageOrder = {};
             person.parentsRelationship = null;
             person.generation = -1;
             person.x = 0; person.y = 0; person.cx = 0; person.cy = 0;
             person.layoutData = { subtreeWidth: 0, totalFamilyUnitsBlockWidth: 0, familyUnits: [], maxMarriageYOffsetInGen: 0, maxX: undefined };
         });

        relationships.forEach(rel => {
            const validPartners = rel.partners.filter(pId => personsMap[pId]);
             if (validPartners.length > 0) {
                 rel.partners = validPartners;
                validPartners.forEach(pId => { personsMap[pId].marriages.push(rel); });
             } else {
                 return;
             }

            const validChildren = (rel.children || []).filter(cId => personsMap[cId]);
            rel.children = validChildren;
            validChildren.forEach(cId => {
                personsMap[cId].parentsRelationship = rel;
            });
        });

        // 雙方都有父母在圖中的婚姻（例如表兄妹結婚）改用例外畫法：
        // 夫妻各自留在原生家庭底下，婚姻線從兩人之間拉過去，子女排在兩人中間下方。
        // 雙方有共同祖先時是血親婚姻，婚姻線畫成雙線。
        const ancestorsOf = (id, seen = new Set()) => {
            const rel = personsMap[id] && personsMap[id].parentsRelationship;
            if (!rel) return seen;
            rel.partners.forEach(pid => { if (!seen.has(pid)) { seen.add(pid); ancestorsOf(pid, seen); } });
            return seen;
        };
        relationships.forEach(rel => {
            if (rel.partners.length !== 2 || !rel.partners.every(id => personsMap[id])) return;
            const [a, b] = rel.partners;
            if (!personsMap[a].parentsRelationship || !personsMap[b].parentsRelationship) return;
            rel.crossFamily = true;
            const ancestorsA = ancestorsOf(a);
            const ancestorsB = ancestorsOf(b);
            const common = new Set([...ancestorsB].filter(id => ancestorsA.has(id)));
            rel.consanguineous = common.size > 0;
            // 讓夫妻排在各自手足的內側、彼此相鄰：
            // a 那一支在每一代都排到最右邊，b 那一支排到最左邊；
            // 在共同祖先的子女中，a 那一支緊接著 b 那一支
            const markLine = (startId, ownAncestors, sideKey, meetKey) => {
                [startId, ...ownAncestors].forEach(id => {
                    if (common.has(id)) return;
                    const node = personsMap[id];
                    if (!node || !node.parentsRelationship) return;
                    node.siblingOrderKey = node.parentsRelationship.partners.some(pid => common.has(pid)) ? meetKey : sideKey;
                });
            };
            markLine(a, ancestorsA, 3, 1);
            markLine(b, ancestorsB, -1, 2);
        });

        Object.values(personsMap).forEach(person => {
            person.marriages.sort((a, b) => {
                const dateA = parseFlexibleDate(a.start_date);
                const dateB = parseFlexibleDate(b.start_date);

                const timeA = dateA.getTime();
                const timeB = dateB.getTime();

                if (timeA === 0 && timeB === 0) {
                    return a.id.localeCompare(b.id);
                }
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                return timeB - timeA; // Newest date first
            });
            person.marriages.forEach((m, index) => { person.marriageOrder[m.id] = index; });
            person.layoutData.maxMarriageYOffsetInGen = person.marriages.length > 1 ? (person.marriages.length - 1) * MULTI_MARRIAGE_Y_OFFSET : 0;
        });

        let generations = assignGenerations(personsMap);
        if (!generations || generations.length === 0) {
             const allPersons = Object.keys(personsMap);
             if (allPersons.length > 0) {
                generations = [allPersons];
                allPersons.forEach(pId => { personsMap[pId].generation = 0; });
             } else {
                 return null;
             }
        }
        const totalValidGenerations = generations.length;

        for (let g = totalValidGenerations - 1; g >= 0; g--) {
            if (!generations[g]) continue;
            generations[g].forEach(pId => {
                if (personsMap[pId]) calculateNodeWidths(personsMap[pId], personsMap);
            });
        }

        const generationYs = {};
        let currentGlobalY = VERTICAL_UNIT;
        for (let g = 0; g < totalValidGenerations; g++) {
            generationYs[g] = currentGlobalY;
            let maxParentalStructureDepthForNextGen = 0;
            if (generations[g]) {
                 generations[g].forEach(pId => {
                    const p = personsMap[pId];
                    if (p && p.marriages.length > 0) {
                        let structureDepthForP = VERTICAL_UNIT + p.layoutData.maxMarriageYOffsetInGen + VERTICAL_UNIT;
                        maxParentalStructureDepthForNextGen = Math.max(maxParentalStructureDepthForNextGen, structureDepthForP);
                    }
                });
            }
            currentGlobalY += PERSON_HEIGHT + maxParentalStructureDepthForNextGen + GENERATION_GAP_LINES;
        }

        const layout = { personPositions: {}, lineDefinitions: [], bounds: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }};
        const positionedPersons = new Set();
        // 嫁娶進來的配偶（自己沒有父母在圖中、但每段婚姻的另一半都有）不自成一棵樹，
        // 等另一半排好時再跟著排；否則例外畫法的婚姻底下的子女會先被配偶帶走
        const isMarriedIn = p => p.marriages.length > 0 && p.marriages.every(m => m.partners.some(pid => pid !== p.id && personsMap[pid] && personsMap[pid].parentsRelationship));
        const potentialRoots = Object.values(personsMap).filter(p => !p.parentsRelationship && !isMarriedIn(p));
        potentialRoots.sort((a, b) => a.generation - b.generation || a.id.localeCompare(b.id));
         let currentTreeTargetX = VERTICAL_UNIT;

        potentialRoots.forEach(root => {
             if (!positionedPersons.has(root.id)) {
                const treeMaxX = calculateFinalPositions(root, personsMap, currentTreeTargetX, generationYs, layout, positionedPersons);
                currentTreeTargetX = treeMaxX + INTER_TREE_SPACING;
             }
        });

        relationships.filter(rel => rel.crossFamily).forEach(rel => {
            const maxX = placeCrossFamilyMarriage(rel, personsMap, generationYs, layout, positionedPersons);
            if (maxX !== undefined) currentTreeTargetX = Math.max(currentTreeTargetX, maxX + INTER_TREE_SPACING);
        });

         Object.values(personsMap).forEach(p => {
             if (!positionedPersons.has(p.id)) {
                 const treeMaxX = calculateFinalPositions(p, personsMap, currentTreeTargetX, generationYs, layout, positionedPersons);
                 currentTreeTargetX = treeMaxX + INTER_TREE_SPACING;
             }
         });

        layout.bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        Object.values(layout.personPositions).forEach(pos => {
            const person = Object.values(personsMap).find(p=>p.el === pos.el);
            const personWidth = person ? person.width : PERSON_WIDTH;
            const personHeight = person ? person.height : PERSON_HEIGHT;
             layout.bounds.minX = Math.min(layout.bounds.minX, pos.x);
             layout.bounds.minY = Math.min(layout.bounds.minY, pos.y);
             layout.bounds.maxX = Math.max(layout.bounds.maxX, pos.x + personWidth);
             layout.bounds.maxY = Math.max(layout.bounds.maxY, pos.y + personHeight);
        });
        layout.lineDefinitions.forEach(line => {
            layout.bounds.minX = Math.min(layout.bounds.minX, line.x1, line.x2 !== undefined ? line.x2 : line.x1);
            layout.bounds.minY = Math.min(layout.bounds.minY, line.y1, line.y2 !== undefined ? line.y2 : line.y1);
            layout.bounds.maxX = Math.max(layout.bounds.maxX, line.x1, line.x2 !== undefined ? line.x2 : line.x1);
            layout.bounds.maxY = Math.max(layout.bounds.maxY, line.y1, line.y2 !== undefined ? line.y2 : line.y1);
        });

        const padding = 50;
        const defaultWidth = scalableWrapper ? scalableWrapper.clientWidth || 800 : 800;
        const defaultHeight = scalableWrapper ? scalableWrapper.clientHeight || 600 : 600;

        if (layout.bounds.minX === Infinity) {
            layout.bounds = { minX: 0, minY: 0, maxX: defaultWidth, maxY: defaultHeight };
        } else {
            layout.bounds.minX = Math.max(0, layout.bounds.minX - padding);
            layout.bounds.minY = Math.max(0, layout.bounds.minY - padding);
            layout.bounds.maxX += padding;
            layout.bounds.maxY += padding;
        }
         layout.bounds.maxX = Math.max(layout.bounds.maxX, (layout.bounds.minX || 0) + PERSON_WIDTH + padding*2);
         layout.bounds.maxY = Math.max(layout.bounds.maxY, (layout.bounds.minY || 0) + PERSON_HEIGHT + padding*2);
        return layout;
    }

    function assignGenerations(personsMap) {
        const generationMap = new Map();
        const generationChangeHistory = new Map();
        const problematicRelations = new Set();

        const findAncestors = () => {
            const allPersonIds = new Set(Object.keys(personsMap));
            const allChildren = new Set();
            Object.values(personsMap).forEach(person => {
                if (person.marriages) {
                    person.marriages.forEach(marriage => {
                        if (marriage.children) {
                            marriage.children.forEach(childId => allChildren.add(childId));
                        }
                    });
                }
            });
            const ancestors = [];
            allPersonIds.forEach(personId => {
                if (!allChildren.has(personId)) ancestors.push(personId);
            });
            return ancestors;
        };

        const detectComplexRelations = () => {
            Object.values(personsMap).forEach(person => {
                if (!person.marriages) return;
                person.marriages.forEach(marriage => {
                    const partners = marriage.partners || [];
                    // const children = marriage.children || []; // Not used in this simplified version
                    for (let i = 0; i < partners.length; i++) {
                        for (let j = i + 1; j < partners.length; j++) {
                            if (isParentChildRelationship(partners[i], partners[j], personsMap)) {
                                problematicRelations.add(`${partners[i]}-${partners[j]}`);
                            }
                        }
                    }
                    // Removed child-partner marriage check for brevity, can be added back if needed
                });
            });
        };

        const isParentChildRelationship = (person1Id, person2Id, personsMap) => {
            return hasChildRelationship(person1Id, person2Id, personsMap) || hasChildRelationship(person2Id, person1Id, personsMap);
        };

        const hasChildRelationship = (personId, childId, personsMap) => {
            const person = personsMap[personId];
            if (!person || !person.marriages) return false;
            return person.marriages.some(marriage => marriage.children && marriage.children.includes(childId));
        };

        // const arePartners = (person1Id, person2Id, personsMap) => { // Not used in this simplified version
        //     const person1 = personsMap[person1Id];
        //     if (!person1 || !person1.marriages) return false;
        //     return person1.marriages.some(marriage => (marriage.partners || []).includes(person2Id));
        // };

        const getChildren = (personId, personsMap) => {
            const children = new Set();
            const person = personsMap[personId];
            if (!person || !person.marriages) return children;
            person.marriages.forEach(marriage => {
                if (marriage.children) marriage.children.forEach(childId => children.add(childId));
            });
            return children;
        };

        const getChildrenGeneration = (personId, personsMap, generationMap) => {
            const children = getChildren(personId, personsMap);
            if (children.size === 0) return -1;
            let maxChildGen = -1;
            children.forEach(childId => {
                if (generationMap.has(childId)) maxChildGen = Math.max(maxChildGen, generationMap.get(childId));
            });
            return maxChildGen;
        };

        const ancestors = findAncestors();
        detectComplexRelations();

        if (ancestors.length === 0 && Object.keys(personsMap).length > 0) {
            Object.keys(personsMap).forEach(id => ancestors.push(id));
        }
        ancestors.forEach(id => {
            generationMap.set(id, 0);
            generationChangeHistory.set(id, 0);
        });

        const propagateGenerations = () => {
            let changed = true;
            let iterations = 0;
            const MAX_ITERATIONS = 100;
            while (changed && iterations < MAX_ITERATIONS) {
                changed = false;
                iterations++;
                Object.values(personsMap).forEach(person => {
                    const personId = person.id;
                    if (!generationMap.has(personId)) return;
                    const personGeneration = generationMap.get(personId);
                    if (person.marriages) {
                        person.marriages.forEach(marriage => {
                            const partners = marriage.partners || [];
                            const children = marriage.children || [];
                            partners.forEach(partnerId => {
                                // 例外畫法的婚姻：夫妻各自維持原生家庭的世代，不互相對齊
                                if (partnerId !== personId && !marriage.crossFamily) {
                                    const isProblematic = problematicRelations.has(`${personId}-${partnerId}`) || problematicRelations.has(`${partnerId}-${personId}`);
                                    if (isProblematic) {
                                        if (!generationChangeHistory.has(partnerId)) generationChangeHistory.set(partnerId, 0);
                                        if (generationChangeHistory.get(partnerId) > 3) return;
                                    }
                                    // 伴侶只往下對齊（取較晚的一代），避免嫁娶進來、沒有父母的伴侶把對方拉回上一代，
                                    // 否則結果會依人物在程式碼裡的順序而不同
                                    if (!generationMap.has(partnerId) || generationMap.get(partnerId) < personGeneration) {
                                        generationMap.set(partnerId, personGeneration);
                                        if (isProblematic) generationChangeHistory.set(partnerId, generationChangeHistory.get(partnerId) + 1);
                                        changed = true;
                                    }
                                }
                            });
                            // 同一對父母的子女在同一代：取「父母 + 1」與手足目前世代的最大值
                            const siblingGeneration = Math.max(personGeneration + 1, ...children.map(cId => generationMap.has(cId) ? generationMap.get(cId) : -1));
                            // 沒有父母的人（例如姻親的父母）往下對齊到子女的上一代
                            if (!person.parentsRelationship && personGeneration < siblingGeneration - 1 && children.length > 0) {
                                generationMap.set(personId, siblingGeneration - 1);
                                changed = true;
                            }
                            children.forEach(childId => {
                                const childGeneration = siblingGeneration;
                                const isProblematic = problematicRelations.has(`${personId}-${childId}`) || problematicRelations.has(`${childId}-${personId}`);
                                if (isProblematic) {
                                    if (!generationChangeHistory.has(childId)) generationChangeHistory.set(childId, 0);
                                    if (generationChangeHistory.get(childId) > 3) return;
                                }
                                if (!generationMap.has(childId) || generationMap.get(childId) < childGeneration) {
                                    generationMap.set(childId, childGeneration);
                                    if (isProblematic) generationChangeHistory.set(childId, generationChangeHistory.get(childId) + 1);
                                    changed = true;
                                }
                            });
                        });
                    }
                });
            }
            if (iterations >= MAX_ITERATIONS) {
                const problematicPersons = [];
                generationChangeHistory.forEach((changes, personId) => { if (changes > 3) problematicPersons.push(personId); });
                problematicPersons.forEach(personId => {
                    const childrenGen = getChildrenGeneration(personId, personsMap, generationMap);
                    if (childrenGen !== -1) {
                        generationMap.set(personId, childrenGen - 1);
                    }
                });
            }
        };
        propagateGenerations();

        Object.keys(personsMap).forEach(personId => {
            if (!generationMap.has(personId)) {
                generationMap.set(personId, 0);
            }
        });

        const generations = [];
        Object.keys(personsMap).forEach(personId => {
            const generation = generationMap.get(personId);
            personsMap[personId].generation = generation;
            if (!generations[generation]) generations[generation] = [];
            generations[generation].push(personId);
        });
        generations.forEach(genList => { if (genList) genList.sort((a, b) => a.localeCompare(b)); });
        return generations.filter(g => g && g.length > 0);
    }


    function calculateNodeWidths(person, personsMap) {
        if (!person) return;
        if (person.layoutData.totalFamilyUnitsBlockWidth > 0 || (person.layoutData.familyUnits && person.layoutData.familyUnits.length > 0)) return;

        person.layoutData.subtreeWidth = person.width;
        person.layoutData.totalFamilyUnitsBlockWidth = 0;
        person.layoutData.familyUnits = [];

        const sortedMarriages = [...person.marriages].filter(m => !m.crossFamily).sort((a,b) => person.marriageOrder[a.id] - person.marriageOrder[b.id]);

        sortedMarriages.forEach((marriage) => {
            let childrenTotalEstimatedWidth = 0;
            if (marriage.children && marriage.children.length > 0) {
                const children = marriage.children.map(cId => personsMap[cId]).filter(c => c && c.generation !== -1);
                if (children.length > 0) {
                     children.forEach(child => {
                        if (child.layoutData.totalFamilyUnitsBlockWidth === 0 && child.marriages.length > 0) calculateNodeWidths(child, personsMap);
                        childrenTotalEstimatedWidth += (child.layoutData.subtreeWidth || child.width);
                    });
                    if (children.length > 1) childrenTotalEstimatedWidth += (children.length - 1) * SIBLING_SPACING;
                }
            }

            let partnersInvolved = marriage.partners.map(partnerId => personsMap[partnerId]).filter(p => p);
            let partnersCombinedWidth = 0;
            const primaryPartner = person;
            const secondaryPartner = partnersInvolved.find(p => p.id !== primaryPartner.id);

            if (secondaryPartner) partnersCombinedWidth = primaryPartner.width + COUPLE_SPACING + secondaryPartner.width;
            else partnersCombinedWidth = primaryPartner.width;

            const familyUnitCurrentWidth = Math.max(partnersCombinedWidth, childrenTotalEstimatedWidth, PERSON_WIDTH);
            person.layoutData.familyUnits.push({
                marriageId: marriage.id, unitWidth: familyUnitCurrentWidth,
                partnerIds: marriage.partners, childrenIds: marriage.children || [],
                childrenTotalEstimatedWidth: childrenTotalEstimatedWidth
            });
        });

        person.layoutData.totalFamilyUnitsBlockWidth = person.layoutData.familyUnits.reduce((sum, fu, idx) => {
             return sum + fu.unitWidth + (idx < person.layoutData.familyUnits.length - 1 ? FAMILY_UNIT_SPACING : 0);
        }, 0);
        person.layoutData.subtreeWidth = Math.max(person.width, person.layoutData.totalFamilyUnitsBlockWidth);
         if (person.marriages.length === 0) person.layoutData.subtreeWidth = person.width;
    }

    function calculateFinalPositions(person, personsMap, targetX, generationYs, layout, positionedPersons) {
        if (positionedPersons.has(person.id)) {
            const finalMaxX = person.layoutData.maxX !== undefined ? person.layoutData.maxX : (person.x + person.width);
             return finalMaxX;
        }
        if (!person) return targetX;

        person.x = targetX + (person.layoutData.subtreeWidth - person.width) / 2;
        person.y = generationYs[person.generation];
        person.cx = person.x + person.width / 2;
        person.cy = person.y + person.height / 2;
        layout.personPositions[person.id] = { x: person.x, y: person.y, el: person.el };
        positionedPersons.add(person.id);
        let currentMaxX = person.x + person.width;
        const baseMarriageLineY = person.y + person.height + VERTICAL_UNIT;
        const sortedFamilyUnits = [...person.layoutData.familyUnits].sort((a,b) => person.marriageOrder[a.marriageId] - person.marriageOrder[b.marriageId]);
        const accumulatedWidthsBefore = [0];
        let currentAccumulatedWidth = 0;
        sortedFamilyUnits.forEach((fu, fuIdx) => {
             if (fuIdx > 0) {
                 const prevFu = sortedFamilyUnits[fuIdx-1];
                 currentAccumulatedWidth += prevFu.unitWidth + FAMILY_UNIT_SPACING;
                 accumulatedWidthsBefore[fuIdx] = currentAccumulatedWidth;
             }
        });

        sortedFamilyUnits.forEach((fu, fuIdx) => {
            const marriage = person.marriages.find(m => m.id === fu.marriageId);
            if (!marriage) return;
            fu.marriageY = baseMarriageLineY + fuIdx * MULTI_MARRIAGE_Y_OFFSET;
            let p1 = person;
            let p2_id = marriage.partners.find(partnerId => partnerId !== p1.id);
            let p2 = p2_id ? personsMap[p2_id] : null;

            if (p2) {
                if (!positionedPersons.has(p2.id)) {
                    p2.y = generationYs[p2.generation];
                    const displacement = accumulatedWidthsBefore[fuIdx];
                    p2.x = person.cx + person.width / 2 + COUPLE_SPACING + displacement;
                    p2.cx = p2.x + p2.width / 2;
                    p2.cy = p2.y + p2.height / 2;
                    layout.personPositions[p2.id] = { x: p2.x, y: p2.y, el: p2.el };
                    positionedPersons.add(p2.id);
                    const p2MaxX = calculateFinalPositions(p2, personsMap, p2.x, generationYs, layout, positionedPersons);
                    currentMaxX = Math.max(currentMaxX, p2MaxX);
                } else {
                     const pos = layout.personPositions[p2.id];
                     if (pos) {
                         p2.x = pos.x; p2.y = pos.y;
                         p2.cx = pos.x + p2.width / 2;
                         p2.cy = pos.y + p2.height / 2;
                         currentMaxX = Math.max(currentMaxX, p2.layoutData.maxX !== undefined ? p2.layoutData.maxX : (p2.x + p2.width));
                     } else {
                          p2.cx = p1.cx; p2.cy = p1.cy;
                     }
                }
                layout.lineDefinitions.push({ type: 'marriage_extension', x1: p1.cx, y1: p1.y + p1.height, x2: p1.cx, y2: fu.marriageY });
                 if (p2.cx !== undefined && !isNaN(p2.cx)) {
                    layout.lineDefinitions.push({ type: 'marriage_extension', x1: p2.cx, y1: p2.y + p2.height, x2: p2.cx, y2: fu.marriageY });
                    layout.lineDefinitions.push({
                        type: 'marriage',
                        x1: p1.cx, y1: fu.marriageY,
                        x2: p2.cx, y2: fu.marriageY,
                        status: marriage.status,
                        relationshipFtdlType: marriage.type || 'marriage',
                        startDate: marriage.start_date,
                        endDate: marriage.end_date,
                        quality: marriage.quality
                    });
                 }

                if (p2.cx !== undefined && !isNaN(p2.cx)) {
                     const standardMidX = (p1.cx + p2.cx) / 2;
                     const shiftDistance = Math.abs(p2.cx - p1.cx);
                     const shiftAmount = (shiftDistance / 2) * PCC_SHIFT_FACTOR_PER_OLD_MARRIAGE * fuIdx;
                     fu.parentMidX = p1.cx < p2.cx ? standardMidX + shiftAmount : standardMidX - shiftAmount;
                     const minSpanX = Math.min(p1.cx, p2.cx) - PERSON_WIDTH * 0.5;
                     const maxSpanX = Math.max(p1.cx, p2.cx) + PERSON_WIDTH * 0.5;
                     fu.parentMidX = Math.max(minSpanX, Math.min(maxSpanX, fu.parentMidX));
                } else { fu.parentMidX = p1.cx; }
            } else {
                layout.lineDefinitions.push({ type: 'marriage_extension', x1: p1.cx, y1: p1.y + p1.height, x2: p1.cx, y2: fu.marriageY });
                fu.parentMidX = p1.cx;
            }

            if (fu.childrenIds && fu.childrenIds.length > 0) {
                const children = fu.childrenIds.map(cId => personsMap[cId]).filter(c => c && c.generation !== -1)
                    .sort((x, y) => (x.siblingOrderKey || 0) - (y.siblingOrderKey || 0));
                if (children.length > 0) {
                    const pccY1 = fu.marriageY; const pccY2 = fu.marriageY + VERTICAL_UNIT;
                    if (fu.parentMidX !== undefined && !isNaN(fu.parentMidX)) {
                         layout.lineDefinitions.push({ type: 'parent_child_connector', x1: fu.parentMidX, y1: pccY1, x2: fu.parentMidX, y2: pccY2 });
                    }
                    let firstChildCX = -1, lastChildCX = -1;
                    const childrenTotalActualEstimatedWidth = children.reduce((sum, c) => sum + (c.layoutData.subtreeWidth || c.width), 0) + (children.length > 1 ? (children.length - 1) * SIBLING_SPACING : 0);
                    let currentChildTargetX = fu.parentMidX - childrenTotalActualEstimatedWidth / 2;
                    let maxXInChildrenBlock = -Infinity;
                    children.forEach((child) => {
                        const childMaxX = calculateFinalPositions(child, personsMap, currentChildTargetX, generationYs, layout, positionedPersons);
                        maxXInChildrenBlock = Math.max(maxXInChildrenBlock, childMaxX);
                        currentChildTargetX = childMaxX + SIBLING_SPACING;
                         const positionedChild = personsMap[child.id];
                         if (positionedChild && positionedChild.cx !== undefined && !isNaN(positionedChild.cx)) {
                             if (firstChildCX === -1) firstChildCX = positionedChild.cx;
                             lastChildCX = positionedChild.cx;
                             layout.lineDefinitions.push({ type: 'child_extension', x1: positionedChild.cx, y1: positionedChild.y, x2: positionedChild.cx, y2: pccY2 });
                         }
                    });
                    currentMaxX = Math.max(currentMaxX, maxXInChildrenBlock);
                    // 橫線要同時涵蓋父母的中點與所有子女：子女若已經因為婚姻被排在別處
                    // （例如表兄妹結婚），父母往下的線才接得上，不會斷開
                    if (firstChildCX !== -1 && lastChildCX !== -1) {
                        const childCXs = children.map(c => personsMap[c.id].cx).filter(cx => cx !== undefined && !isNaN(cx));
                        const spanXs = fu.parentMidX !== undefined && !isNaN(fu.parentMidX) ? [...childCXs, fu.parentMidX] : childCXs;
                        const spanMin = Math.min(...spanXs);
                        const spanMax = Math.max(...spanXs);
                        if (spanMax - spanMin > 0.5) {
                            layout.lineDefinitions.push({ type: 'sibling_connector', x1: spanMin, y1: pccY2, x2: spanMax, y2: pccY2 });
                        }
                    }
                }
            }
             currentMaxX = Math.max(currentMaxX, Math.max(p1.cx, (p2 && p2.cx !== undefined ? p2.cx : -Infinity)));
        });
        person.layoutData.maxX = currentMaxX;
        return currentMaxX;
    }

    // 把中線 x 右邊的人與線整體往右推 delta；橫跨中線的線會被拉長
    function shiftRightOf(x, delta, personsMap, layout, positionedPersons) {
        Object.values(personsMap).forEach(p => {
            if (!positionedPersons.has(p.id) || p.cx < x) return;
            p.x += delta; p.cx += delta;
            if (p.layoutData.maxX !== undefined) p.layoutData.maxX += delta;
            if (layout.personPositions[p.id]) layout.personPositions[p.id].x = p.x;
        });
        layout.lineDefinitions.forEach(line => {
            if (line.x1 >= x) line.x1 += delta;
            if (line.x2 !== undefined && line.x2 >= x) line.x2 += delta;
        });
    }

    // 例外畫法：夫妻已經各自在原生家庭底下排好位置，這裡只畫婚姻線並排他們的子女
    function placeCrossFamilyMarriage(rel, personsMap, generationYs, layout, positionedPersons) {
        const [p1, p2] = rel.partners.map(id => personsMap[id]);
        if (!positionedPersons.has(p1.id) || !positionedPersons.has(p2.id)) return undefined;
        const left = p1.cx <= p2.cx ? p1 : p2;
        const right = left === p1 ? p2 : p1;
        // 比兩人中較低的那位再往下錯開一層，避免和兩人之間其他夫妻的婚姻線重疊
        const marriageY = Math.max(left.y + left.height, right.y + right.height) + VERTICAL_UNIT + MULTI_MARRIAGE_Y_OFFSET;
        // 婚姻線在需要推開位置之後才畫，長度才正確
        const drawCouple = () => {
            [left, right].forEach(p => layout.lineDefinitions.push({ type: 'marriage_extension', x1: p.cx, y1: p.y + p.height, x2: p.cx, y2: marriageY }));
            layout.lineDefinitions.push({
                type: 'marriage', x1: left.cx, y1: marriageY, x2: right.cx, y2: marriageY,
                status: rel.status, relationshipFtdlType: rel.type || 'marriage',
                startDate: rel.start_date, endDate: rel.end_date, quality: rel.quality,
                consanguineous: rel.consanguineous
            });
        };
        const children = (rel.children || []).map(id => personsMap[id]).filter(c => c && !positionedPersons.has(c.id));
        if (children.length === 0) { drawCouple(); return right.cx; }

        let midX = (left.cx + right.cx) / 2;
        const pccY2 = marriageY + VERTICAL_UNIT;
        const blockWidth = children.reduce((sum, c) => sum + (c.layoutData.subtreeWidth || c.width), 0) + (children.length - 1) * SIBLING_SPACING;
        const childGen = Math.min(...children.map(c => c.generation));
        // 子女那一代以下：中點左邊最右的人、右邊最左的人
        let leftLimit = -Infinity, rightLimit = Infinity;
        Object.values(personsMap).forEach(p => {
            if (!positionedPersons.has(p.id) || p.generation < childGen) return;
            if (p.cx < midX) leftLimit = Math.max(leftLimit, p.x + p.width + SIBLING_SPACING);
            else rightLimit = Math.min(rightLimit, p.x - SIBLING_SPACING);
        });
        let startX = Math.max(midX - blockWidth / 2, leftLimit);
        // 放不下時，從中點把右半邊整體往右推，留出子女的位置
        const overflow = startX + blockWidth - rightLimit;
        if (overflow > 0) {
            shiftRightOf(midX, overflow, personsMap, layout, positionedPersons);
            midX = (left.cx + right.cx) / 2;
            startX = Math.max(midX - blockWidth / 2, leftLimit);
        }
        drawCouple();

        layout.lineDefinitions.push({ type: 'parent_child_connector', x1: midX, y1: marriageY, x2: midX, y2: pccY2 });
        let currentX = startX;
        let maxX = right.cx;
        children.forEach(child => {
            const childMaxX = calculateFinalPositions(child, personsMap, currentX, generationYs, layout, positionedPersons);
            maxX = Math.max(maxX, childMaxX);
            currentX = childMaxX + SIBLING_SPACING;
            layout.lineDefinitions.push({ type: 'child_extension', x1: child.cx, y1: child.y, x2: child.cx, y2: pccY2 });
        });
        const spanXs = [midX, ...children.map(c => c.cx)];
        if (Math.max(...spanXs) - Math.min(...spanXs) > 0.5) {
            layout.lineDefinitions.push({ type: 'sibling_connector', x1: Math.min(...spanXs), y1: pccY2, x2: Math.max(...spanXs), y2: pccY2 });
        }
        return maxX;
    }

    function drawLayout(layout) {
        const svg = ensureSvgLayer();
        if (!svg) return;

        for (const id in layout.personPositions) {
            const pos = layout.personPositions[id];
            if (pos.el) {
                pos.el.style.left = `${pos.x}px`;
                pos.el.style.top = `${pos.y}px`;
            }
        }

        const svgWidth = layout.bounds.maxX;
        const svgHeight = layout.bounds.maxY;
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.style.width = svgWidth + 'px';
        svg.style.height = svgHeight + 'px';

        layout.lineDefinitions.forEach(line => {
            if (isNaN(line.x1) || isNaN(line.y1) || (line.x2 !== undefined && isNaN(line.x2)) || (line.y2 !== undefined && isNaN(line.y2))) {
                return;
            }
            const klasses = ['relationship-line'];
            if (line.type === 'marriage') {
                if (line.relationshipFtdlType === 'partnership') klasses.push('partnership-line');
                else klasses.push('marriage-line');
            } else if (line.type === 'marriage_extension') klasses.push('marriage-extension-line');
            else if (line.type === 'parent_child_connector') klasses.push('pcc-line');
            else if (line.type === 'child_extension') klasses.push('child-extension-line');
            else if (line.type === 'sibling_connector') klasses.push('sibling-connector-line');

            // 血親婚姻：家系圖慣例畫成雙橫線
            const offsets = line.type === 'marriage' && line.consanguineous ? [-3, 3] : [0];
            offsets.forEach(dy => {
                const lineEl = drawLine(svg, line.x1, line.y1 + dy, line.x2 || line.x1, (line.y2 || line.y1) + dy, klasses);
                if (line.type === 'marriage' && window.FTDLResearch) {
                    const q = window.FTDLResearch.parseUnit(line.quality);
                    if (q !== null) lineEl.style.strokeWidth = offsets.length > 1 ? `${1 + q * 2}px` : `${1 + q * 6}px`;
                }
            });

            if (line.type === 'marriage') {
                if (line.status) drawMarriageStatusMarker(svg, line);
                if (line.startDate || line.endDate) drawRelationshipDateText(svg, line);
            }
        });

         if (scalableWrapper) {
             scalableWrapper.style.width = svgWidth + 'px';
             scalableWrapper.style.height = svgHeight + 'px';
         }
    }

    function drawLine(svg, x1, y1, x2, y2, klasses = ['relationship-line']) {
        const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineEl.setAttribute('x1', x1); lineEl.setAttribute('y1', y1);
        lineEl.setAttribute('x2', x2); lineEl.setAttribute('y2', y2);
        klasses.forEach(k => lineEl.classList.add(k));
        svg.appendChild(lineEl);
        return lineEl;
    }

    function drawMarriageStatusMarker(svg, lineData) {
        const midX = (lineData.x1 + lineData.x2) / 2;
        const midY = (lineData.y1 + lineData.y2) / 2;
        const markerSize = 10;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        if (lineData.status === 'divorced') {
            // 家系圖慣例：雙斜線
            g.classList.add('divorce-marker');
            [-3, 3].forEach(dx => {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${midX + dx - markerSize/2} ${midY + markerSize/2} L ${midX + dx + markerSize/2} ${midY - markerSize/2}`);
                g.appendChild(path);
            });
            svg.appendChild(g);
        } else if (lineData.status === 'separated') {
            g.classList.add('separation-marker');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${midX - markerSize/2} ${midY + markerSize/2} L ${midX + markerSize/2} ${midY - markerSize/2}`);
            g.appendChild(path);
            svg.appendChild(g);
        }
    }

    function formatDateForDisplay(dateStr) { // Helper for drawRelationshipDateText
        if (!dateStr) return '';
        return String(dateStr).trim(); // Use the string as provided by FTDL (e.g., "2010", "2010-05")
    }

    function drawRelationshipDateText(svg, lineData) {
        if (!lineData.startDate && !lineData.endDate) return;

        let textContent = '';
        const startDateText = formatDateForDisplay(lineData.startDate);
        const endDateText = formatDateForDisplay(lineData.endDate);

        if (startDateText && endDateText) {
            // Both dates: start_date - end_date
            textContent = `${startDateText} - ${endDateText}`;
        } else if (startDateText) {
            // Only start_date
            textContent = startDateText;
        } else if (endDateText) {
            // Only end_date (with dash before)
            textContent = `- ${endDateText}`;
        }

        if (!textContent) return;

        const midX = (lineData.x1 + lineData.x2) / 2;
        const lineY = lineData.y1; // For horizontal lines, y1 === y2

        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', midX);
        textEl.setAttribute('y', lineY);
        textEl.setAttribute('dy', '-4px'); // Shift text visually 4px upwards
        textEl.classList.add('relationship-date');
        textEl.textContent = textContent;

        svg.appendChild(textEl);
    }


    function mainRenderLogic() {
        const ftdlEditor = document.getElementById('ftdl-editor');
        const ftdlText = ftdlEditor ? ftdlEditor.value : '';
        // 有 bond／tie 時改用較寬的間距，留空間給弧線與標籤（theme.css 的 .ftdl-spacious）
        document.documentElement.classList.toggle('ftdl-spacious', /(^|[\s;}])(bond|tie)\s*\{/.test(ftdlText));
        loadCssVars();
        const personsData = getRenderedPersons();
        const relationshipsData = parseRelationshipFTDL(ftdlText);

        if (Object.keys(personsData).length === 0) {
             if(svgLayer) svgLayer.innerHTML = '';
             const figures = scalableWrapper.querySelectorAll('.person-figure');
             figures.forEach(fig => {fig.style.position = ''; fig.style.left = ''; fig.style.top = ''; fig.style.zIndex = '';});
             if (scalableWrapper) { scalableWrapper.style.width = ''; scalableWrapper.style.height = ''; }
            return;
        }

        const layoutData = processData(personsData, relationshipsData);

        if (layoutData) {
             drawLayout(layoutData);
             if (window.FTDLResearch) {
                 window.FTDLResearch.afterLayout(svgLayer, layoutData, personsData, relationshipsData, ftdlText, scalableWrapper);
             }
        } else {
              if(svgLayer) svgLayer.innerHTML = '';
             const figures = scalableWrapper.querySelectorAll('.person-figure');
             figures.forEach(fig => {fig.style.position = ''; fig.style.left = ''; fig.style.top = ''; fig.style.zIndex = '';});
             if (scalableWrapper) { scalableWrapper.style.width = ''; scalableWrapper.style.height = ''; }
        }
    }

    let renderTimeout;
    function debouncedRender() {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(mainRenderLogic, 300);
    }

    if (scalableWrapper) {
        const observer = new MutationObserver((mutationsList) => {
            let relevantChange = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const addedPersons = Array.from(mutation.addedNodes).some(n => n.nodeType === Node.ELEMENT_NODE && n.classList.contains('person-figure'));
                    const removedPersons = Array.from(mutation.removedNodes).some(n => n.nodeType === Node.ELEMENT_NODE && n.classList.contains('person-figure'));
                    if (addedPersons || removedPersons) {
                         relevantChange = true; break;
                    }
                }
            }
            if (relevantChange) {
                requestAnimationFrame(() => debouncedRender());
            } else {
                 if (scalableWrapper.querySelectorAll('.person-figure').length === 0 && svgLayer && svgLayer.innerHTML !== '') {
                      debouncedRender();
                 }
            }
        });
        observer.observe(scalableWrapper, { childList: true, subtree: false });
    }

     const ftdlEditor = document.getElementById('ftdl-editor');
     if (ftdlEditor) ftdlEditor.addEventListener('input', debouncedRender);
     const executeButton = document.getElementById('execute-ftdl-btn');
     if (executeButton) executeButton.addEventListener('click', mainRenderLogic);
    window.triggerRelationshipRender = mainRenderLogic;

    setTimeout(() => {
        if (scalableWrapper && scalableWrapper.querySelector('.person-figure')) {
            mainRenderLogic();
        } else {
             if(svgLayer) svgLayer.innerHTML = '';
        }
    }, 300);
});