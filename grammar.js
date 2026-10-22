document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('ftdl-editor');
    const lineNumbersDiv = document.getElementById('line-numbers');
    const executeBtn = document.getElementById('execute-ftdl-btn');
    const editorView = document.getElementById('ftdl-editor-view');
    const suggestionBox = document.getElementById('suggestion-box');

    const errorMessagesContainer = document.createElement('div');
    errorMessagesContainer.id = 'error-messages-container';
    const controlsHeader = editorView.querySelector('.editor-controls-header');
    if (controlsHeader) {
        editorView.insertBefore(errorMessagesContainer, controlsHeader);
    } else {
        editorView.prepend(errorMessagesContainer);
    }

    const INDENTATION = "    ";

    // --- FTDL 規則定義 ---
    const FTDL_RULES = {
        blocks: {
            metadata: {
                max: 1,
                properties: {
                    title: { optional: true, max: 1, type: 'string' },
                    author: { optional: true, max: 1, type: 'string' },
                    date: { optional: true, max: 1, type: 'date' },
                    // 新增 metadata.color 屬性
                    color: { optional: true, max: 1, type: 'boolean' },
                    // 研究擴充
                    family_type: { optional: true, max: 1, type: 'string' },
                    background: { optional: true, max: 1, type: 'color' },
                    legend: { optional: true, max: 1, type: 'boolean' }
                }
            },
            person: {
                properties: {
                    id: { optional: false, max: 1, type: 'id' },
                    name: { optional: true, max: 1, type: 'string' },
                    gender: { optional: true, max: 1, type: 'enum', values: ['male', 'female', 'other'] },
                    birth: { optional: true, max: 1, type: 'date' },
                    // 更新 person.death 規則（驗證邏輯會特別處理 true）
                    death: { optional: true, max: 1, type: 'date' },
                    proband: { optional: true, max: 1, type: 'boolean' },
                    // 新增 person.chronic 屬性
                    chronic: { optional: true, max: 1, type: 'boolean' },
                     // 新增 person.Disability 屬性
                    Disability: { optional: true, max: 1, type: 'boolean' },
                    // 身心分數（wellbeing）功能已移除；仍接受這個屬性但不會有任何效果，避免舊資料報錯
                    wellbeing: { optional: true, max: 1, type: 'unit' },
                    fill: { optional: true, max: 1, type: 'color' },
                    note: { optional: true, type: 'string_multiline' }
                }
            },
            relationship: {
                properties: {
                    partners: { optional: false, type: 'id_array' },
                    type: { optional: true, max: 1, type: 'enum', values: ['marriage', 'partnership'] },
                    status: { optional: true, max: 1, type: 'enum', values: ['married', 'cohabiting', 'divorced', 'separated', 'widowed', 'annulled'] },
                    start_date: { optional: true, max: 1, type: 'date' },
                    end_date: { optional: true, max: 1, type: 'date' },
                    // 研究擴充：婚姻品質（0–1，決定夫妻線粗細）
                    quality: { optional: true, max: 1, type: 'unit' },
                    children: { optional: true, type: 'id_array' }
                }
            },
            // 研究擴充：有方向的關係線（例如父母覺得親近、子女覺得親近）
            bond: {
                properties: {
                    from: { optional: false, max: 1, type: 'ref' },
                    to: { optional: false, max: 1, type: 'ref' },
                    closeness: { optional: true, max: 1, type: 'unit' },
                    style: { optional: true, max: 1, type: 'enum', values: ['solid', 'dashed', 'dotted', 'zigzag', 'cutoff', 'double'] },
                    color: { optional: true, max: 1, type: 'color' },
                    arrow: { optional: true, max: 1, type: 'boolean' },
                    label: { optional: true, max: 1, type: 'string' }
                }
            },
            // 研究擴充：關係強弱標記（單向弧線箭頭，旁邊標示關係性質）
            tie: {
                properties: {
                    from: { optional: false, max: 1, type: 'ref' },
                    to: { optional: false, max: 1, type: 'ref' },
                    line: { optional: true, max: 1, type: 'enum', values: ['thick', 'thin', 'dashed'] },
                    label: { optional: true, max: 1, type: 'string' },
                    color: { optional: true, max: 1, type: 'color' }
                }
            }
        },
        topLevelSuggestions: [
            "metadata {\n" + INDENTATION + "\n}",
            "person {\n" + INDENTATION + "id: unique_id;\n}", // Default person suggestion
            "relationship {\n" + INDENTATION + "partners: [id1, id2];\n}", // Default relationship
            "bond {\n" + INDENTATION + "from: id1;\n" + INDENTATION + "to: id2;\n}",
            "tie {\n" + INDENTATION + "from: id1;\n" + INDENTATION + "to: id2;\n" + INDENTATION + "line: thick;\n" + INDENTATION + "label: 強烈;\n}"
        ],
        propertySuggestions: {
            metadata: [
                "title: 圖譜標題;",
                "author: 作者名;",
                "date: YYYY[-MM[-DD]];",
                // 更新 metadata 建議
                "color?: true|false;",
                "family_type?: 家庭類型;",
                "background?: sand|mist|apricot|amber|clay|stone|#RRGGBB;",
                "legend?: true|false;"
            ],
            person: [
                "id: unique_id;",
                "name?: 顯示名稱;",
                "gender: male|female|other;",
                "birth?: YYYY[-MM[-DD]];",
                // 更新 person.death 建議
                "death?: YYYY[-MM[-DD]]|true;",
                "proband?: true;",
                // 更新 person 建議
                "chronic?: true|false;",
                "Disability?: true|false;",
                "fill?: sand|mist|apricot|amber|clay|stone|#RRGGBB;",
                "note: 標示;"
            ],
            relationship: ["partners: [id1, id2];", "type?: marriage|partnership;", "status?: married|cohabiting|divorced|separated|widowed|annulled;", "start_date?: YYYY[-MM[-DD]];", "end_date?: YYYY[-MM[-DD]];", "quality?: 0–1;", "children?: [child_id1, ...];"],
            bond: ["from: id;", "to: id;", "closeness?: 0–1;", "style?: solid|dashed|dotted|zigzag|cutoff|double;", "color?: sand|mist|apricot|amber|clay|stone|#RRGGBB;", "arrow?: true|false;", "label?: 文字;"],
            tie: ["from: id;", "to: id;", "line?: thick|thin|dashed;", "label?: 強烈|依賴|破裂|…;", "color?: sand|mist|apricot|amber|clay|stone|#RRGGBB;"]
        }
    };
    // --- FTDL 規則定義結束 ---


    let errors = [];
    let currentSuggestionIndex = -1;
    let activeSuggestions = [];
    let lastCursorPos = 0;

    function calculateEditorStyles() {
        const computedStyle = window.getComputedStyle(editor);
        return {
            lineHeight: parseFloat(computedStyle.lineHeight) || (parseFloat(computedStyle.fontSize) * 1.5),
            paddingTop: parseFloat(computedStyle.paddingTop),
            fontSize: parseFloat(computedStyle.fontSize),
            fontFamily: computedStyle.fontFamily
        };
    }
    let editorStyles = calculateEditorStyles();
    window.addEventListener('resize', () => editorStyles = calculateEditorStyles());

    function updateLineNumbers() {
        const lineCount = Math.max(1, editor.value.split('\n').length);
        const lineNumbersHTML = [];
        const errorLineNumbers = new Set(errors.map(err => err.lineNumber));

        for (let i = 1; i <= lineCount; i++) {
            let classes = '';
            if (errorLineNumbers.has(i)) {
                classes = 'class="error-line-marker"';
            }
            lineNumbersHTML.push(`<div ${classes}>${i}</div>`);
        }
        lineNumbersDiv.innerHTML = lineNumbersHTML.join('');
        lineNumbersDiv.scrollTop = editor.scrollTop;
    }

    function displayErrors() {
        errorMessagesContainer.innerHTML = '';
        if (errors.length > 0) {
            const uniqueErrors = {};
            errors.forEach(err => {
                const key = `${err.lineNumber}-${err.message}`;
                if (!uniqueErrors[key]) {
                    const errMsg = document.createElement('div');
                    errMsg.className = 'error-message';
                    errMsg.textContent = `行 ${err.lineNumber}: ${err.message}`;
                    errorMessagesContainer.appendChild(errMsg);
                    uniqueErrors[key] = true;
                }
            });
            errorMessagesContainer.style.display = 'block';
        } else {
            errorMessagesContainer.style.display = 'none';
        }
        executeBtn.disabled = errors.length > 0;
    }

    function validateFTDL() {
        const content = editor.value;
        const lines = content.split('\n');
        errors = [];
        let metadataCount = 0;
        const personIds = new Set();
        const bondRefs = [];

        let inBlock = null;
        let blockStartLine = 0;
        let blockProperties = {}; // 用於追蹤每個區塊已定義的屬性及其計數
        let braceLevel = 0;

        lines.forEach((lineContent, index) => {
            const lineNumber = index + 1;
            let originalLineForErrorReporting = lineContent.trim(); // 用於錯誤報告的原始行

            // 移除註釋
            let lineWithoutComments = lineContent.trim();
            if (lineWithoutComments.includes('\\\\')) {
                const commentRegex = /\\\\.*?\\\\/g; // 非貪婪匹配註釋
                let validCommentFoundOnLine = false;
                const tempLineForCommentCheck = lineWithoutComments;
                // 先移除所有合法註釋
                lineWithoutComments = lineWithoutComments.replace(commentRegex, () => {
                    validCommentFoundOnLine = true;
                    return ''; // 移除註釋內容
                }).trim();

                // 如果移除合法註釋後，行內仍有 '\'，說明可能有未成對的或格式錯誤的註釋
                if (lineWithoutComments.includes('\\') && tempLineForCommentCheck.includes('\\\\')) {
                     if (!tempLineForCommentCheck.match(/^[a-zA-Z0-9_]+:\s*".*\\.*"\s*;?$/)) { // 排除路徑字符串
                        errors.push({ lineNumber, message: "備註格式可能錯誤，或使用了未成對的 \\\\" });
                     }
                } else if (tempLineForCommentCheck.includes('\\\\') && !validCommentFoundOnLine) {
                    errors.push({ lineNumber, message: "備註格式錯誤，應為 \\\\備註內容\\\\ (未找到匹配的結束符)" });
                }
            }

            let currentProcessingLine = lineWithoutComments;

            if (currentProcessingLine === "" && !inBlock) {
                return;
            }
            if (currentProcessingLine === "" && inBlock && braceLevel > 0 && Object.keys(blockProperties).length === 0 && !lineContent.includes("}")) {
                return;
            }


            if (!inBlock) {
                let blockTypeMatched = null;
                let blockKeyword = "";

                if (currentProcessingLine.startsWith('metadata {')) {
                    blockTypeMatched = 'metadata';
                    blockKeyword = 'metadata {';
                } else if (currentProcessingLine.startsWith('person {')) {
                    blockTypeMatched = 'person';
                    blockKeyword = 'person {';
                } else if (currentProcessingLine.startsWith('relationship {')) {
                    blockTypeMatched = 'relationship';
                    blockKeyword = 'relationship {';
                } else if (currentProcessingLine.startsWith('bond {')) {
                    blockTypeMatched = 'bond';
                    blockKeyword = 'bond {';
                } else if (currentProcessingLine.startsWith('tie {')) {
                    blockTypeMatched = 'tie';
                    blockKeyword = 'tie {';
                }

                if (blockTypeMatched) {
                    if (braceLevel !== 0 && inBlock) {
                        errors.push({ lineNumber, message: `試圖在 '${inBlock}' 區塊內部開始新的 '${blockTypeMatched}' 區塊，請先關閉前一個區塊。` });
                        return;
                    }
                    inBlock = blockTypeMatched;
                    blockStartLine = lineNumber;
                    braceLevel = 1;
                    if (blockTypeMatched === 'metadata') {
                        metadataCount++;
                        if (metadataCount > FTDL_RULES.blocks.metadata.max) {
                            errors.push({ lineNumber, message: `metadata 區塊最多只能定義 ${FTDL_RULES.blocks.metadata.max} 次` });
                        }
                    }
                    blockProperties = {};

                    currentProcessingLine = currentProcessingLine.substring(blockKeyword.length).trim();
                    if (currentProcessingLine === "") {
                        return;
                    }
                }
            }


            if (inBlock) {
                if (currentProcessingLine === '{') {
                    braceLevel++;
                    currentProcessingLine = "";
                }

                const segmentsRaw = currentProcessingLine.split(';');
                const propertySegments = [];
                for (let i = 0; i < segmentsRaw.length; i++) {
                    const s = segmentsRaw[i].trim();
                    if (s !== "") {
                        propertySegments.push(s);
                    } else if (i < segmentsRaw.length - 1 && segmentsRaw[i+1].trim() !== "" && segmentsRaw[i+1].trim() !== "}") {
                        // propertySegments.push("");
                    } else if (s === "" && i === segmentsRaw.length -1 && currentProcessingLine.endsWith(';')) {
                         //
                    }
                }


                for (let i = 0; i < propertySegments.length; i++) {
                    let segmentToProcess = propertySegments[i];
                    let isLastSegmentOfLine = (i === propertySegments.length - 1);
                    let propertyParsedThisSegment = false;

                    if (segmentToProcess.includes('{') && segmentToProcess.trim() !== '{') {
                        errors.push({ lineNumber, message: `不應在屬性定義 '${segmentToProcess}' 中發現 '{'` });
                        continue;
                    }
                    if (segmentToProcess.trim() === '{') {
                        braceLevel++;
                        continue;
                    }

                    const propMatchWithBrace = segmentToProcess.match(/^([a-zA-Z_][a-zA-Z0-9_]*\??)\s*:\s*(.+?)}\s*$/);
                    const propMatchNormal = segmentToProcess.match(/^([a-zA-Z_][a-zA-Z0-9_]*\??)\s*:\s*(.+?)\s*$/);

                    let effectivePropMatch = null;
                    let valueFollowedByBrace = false;

                    if (propMatchWithBrace) {
                        effectivePropMatch = propMatchWithBrace;
                        valueFollowedByBrace = true;
                    } else if (propMatchNormal) {
                        effectivePropMatch = propMatchNormal;
                    }

                    if (effectivePropMatch) {
                        const keyWithOptionalMark = effectivePropMatch[1];
                        const key = keyWithOptionalMark.replace('?', '');
                        let value = effectivePropMatch[2].trim();

                        if (propMatchNormal && value.endsWith('}') && !valueFollowedByBrace && isLastSegmentOfLine) {
                            const lastChar = value.slice(-1);
                            if (lastChar === '}') {
                                value = value.slice(0, -1).trim();
                                valueFollowedByBrace = true;
                            }
                        }


                        if (!FTDL_RULES.blocks[inBlock]?.properties[key]) {
                            errors.push({ lineNumber, message: `'${inBlock}' 區塊中未知的屬性 '${key}' (來自 '${segmentToProcess}')` });
                        } else {
                            const propRule = FTDL_RULES.blocks[inBlock].properties[key];
                            blockProperties[key] = (blockProperties[key] || 0) + 1;
                            if (propRule.max && blockProperties[key] > propRule.max) {
                                errors.push({ lineNumber, message: `'${inBlock}' 區塊中的屬性 '${key}' 最多只能出現 ${propRule.max} 次 (來自 '${segmentToProcess}')` });
                            }

                            // --- 屬性類型和值驗證 (更新 death 的驗證邏輯) ---
                            if (propRule.type === 'date') {
                                // Special handling for person death property
                                if (inBlock === 'person' && key === 'death') {
                                    // Allow date format YYYY[-MM[-DD]] OR boolean true
                                    if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value) && value.toLowerCase() !== 'true') {
                                         errors.push({ lineNumber, message: `屬性 '${key}' 的值 '${value}' 無效，對於 death 應為 YYYY[-MM[-DD]] 格式或 'true' (來自 '${segmentToProcess}')` });
                                    }
                                } else {
                                    // Standard date validation for other date properties (birth, start_date, end_date)
                                    if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) {
                                         errors.push({ lineNumber, message: `屬性 '${key}' 的日期格式應為 YYYY, YYYY-MM, 或 YYYY-MM-DD (值: ${value} 来自 '${segmentToProcess}')` });
                                     }
                                }
                            } else if (propRule.type === 'enum' && !propRule.values.includes(value)) {
                                errors.push({ lineNumber, message: `屬性 '${key}' 的值 '${value}' 無效，應為 ${propRule.values.join(' | ')} (來自 '${segmentToProcess}')` });
                            } else if (propRule.type === 'boolean' && !['true', 'false'].includes(value.toLowerCase())) {
                                // 這裡會處理 metadata.color, person.proband, person.chronic, person.Disability
                                errors.push({ lineNumber, message: `屬性 '${key}' 的值應為 true 或 false (值: ${value} 来自 '${segmentToProcess}')` });
                            } else if (propRule.type === 'id' && inBlock === 'person' && key === 'id') {
                                if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                                    errors.push({ lineNumber, message: `Person ID '${value}' 包含無效字符 (來自 '${segmentToProcess}')` });
                                } else if (personIds.has(value)) {
                                    errors.push({ lineNumber, message: `Person ID '${value}' 不唯一 (來自 '${segmentToProcess}')` });
                                } else {
                                    personIds.add(value);
                                }
                            } else if (propRule.type === 'unit') {
                                if (!/^(0(\.\d+)?|1(\.0+)?|\.\d+)$/.test(value)) {
                                    errors.push({ lineNumber, message: `屬性 '${key}' 的值應為 0 到 1 之間的數字 (值: ${value} 來自 '${segmentToProcess}')` });
                                }
                            } else if (propRule.type === 'ref') {
                                if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                                    errors.push({ lineNumber, message: `屬性 '${key}' 應為一個 person ID (值: ${value} 來自 '${segmentToProcess}')` });
                                } else {
                                    bondRefs.push({ lineNumber, key, value, block: inBlock });
                                }
                            } else if (propRule.type === 'color') {
                                if (!/^(sand|mist|apricot|amber|clay|stone|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})$/i.test(value)) {
                                    errors.push({ lineNumber, message: `屬性 '${key}' 的顏色應為 sand、mist、apricot、amber、clay、stone 或 #RRGGBB (值: ${value} 來自 '${segmentToProcess}')` });
                                }
                            } else if (propRule.type === 'id_array') {
                                if (!/^\[\s*([a-zA-Z0-9_]+(\s*,\s*[a-zA-Z0-9_]+)*)?\s*\]$/.test(value) && value !== '[]') {
                                     errors.push({ lineNumber, message: `屬性 '${key}' 的值 '${value}' 應為 ID 陣列, 例如 [id1, id2] 或 [] (來自 '${segmentToProcess}')` });
                                }
                            }
                             // --- 屬性類型和值驗證結束 ---
                            propertyParsedThisSegment = true;
                        }
                    }

                    if (segmentToProcess === '}' || valueFollowedByBrace) {
                        if (segmentToProcess === '}' && propertyParsedThisSegment) {
                            //
                        } else if (valueFollowedByBrace && !propertyParsedThisSegment && effectivePropMatch) {
                            //
                        } else if (segmentToProcess !== '}' && valueFollowedByBrace && propertyParsedThisSegment) {
                            //
                        } else if (segmentToProcess !== '}' && !valueFollowedByBrace) {
                            if (segmentToProcess.includes('}') && !propertyParsedThisSegment) {
                                errors.push({ lineNumber, message: `在 '}' 之前有無法解析的內容: '${segmentToProcess.substring(0, segmentToProcess.indexOf('}'))}'` });
                            }
                        }


                        braceLevel--;
                        if (braceLevel === 0) {
                            const rules = FTDL_RULES.blocks[inBlock].properties;
                            for (const propName in rules) {
                                if (!rules[propName].optional && !blockProperties[propName]) {
                                    errors.push({ lineNumber: blockStartLine, message: `${inBlock} 區塊缺少必要屬性 '${propName}'` });
                                }
                            }
                            inBlock = null;
                            blockProperties = {};

                            if (segmentToProcess !== '}' && !valueFollowedByBrace) {
                                const braceIndexInSegment = segmentToProcess.lastIndexOf('}');
                                if (braceIndexInSegment !== -1 && braceIndexInSegment < segmentToSegment.length - 1) {
                                    const trailingContent = segmentToProcess.substring(braceIndexInSegment + 1).trim();
                                    if (trailingContent !== "") {
                                        errors.push({ lineNumber, message: `在區塊結束符 '}' 之後不應有其他內容: '${trailingContent}' (來自 '${originalLineForErrorReporting}')` });
                                    }
                                }
                            }
                             if (!isLastSegmentOfLine && propertySegments.slice(i+1).some(s => s.trim() !== "" && s.trim() !== '}')) {
                                errors.push({ lineNumber, message: `區塊已在 '${segmentToProcess}' 處關閉，但分號後仍有內容: '${propertySegments.slice(i+1).join(';')}'` });
                            }

                            break;
                        } else if (braceLevel < 0) {
                            errors.push({ lineNumber, message: "多餘的 '}'" });
                            braceLevel = 0;
                            inBlock = null;
                            break;
                        }
                    } else if (!propertyParsedThisSegment && segmentToProcess.trim() !== "") {
                        errors.push({ lineNumber, message: `無效的語法或未知的屬性定義於 '${inBlock}' 區塊中: '${segmentToProcess}' (來自 '${originalLineForErrorReporting}')` });
                    }
                }

            } else {
                 if (currentProcessingLine === '}') {
                    errors.push({ lineNumber, message: "在區塊外的 '}'" });
                    braceLevel--;
                    if (braceLevel <0) braceLevel = 0;
                } else if (currentProcessingLine.includes('{') || currentProcessingLine.includes('}')) {
                    errors.push({lineNumber, message: `區塊定義或括號使用錯誤: '${originalLineForErrorReporting}'`});
                }
                 else if (currentProcessingLine !== "") {
                    errors.push({ lineNumber, message: `未知的頂層語句: '${originalLineForErrorReporting}'` });
                }
            }
        });

        if (inBlock) {
            errors.push({ lineNumber: blockStartLine, message: `區塊 '${inBlock}' 未關閉 (缺少 '}')` });
        }
        bondRefs.forEach(ref => {
            if (!personIds.has(ref.value)) {
                errors.push({ lineNumber: ref.lineNumber, message: `${ref.block} 的 ${ref.key} 指向不存在的 person ID '${ref.value}'` });
            }
        });
        if (braceLevel > 0 && !inBlock) {
            // errors.push({ lineNumber: lines.length, message: `文件末尾有未關閉的括號，括號層級: ${braceLevel}` });
        } else if (braceLevel < 0) {
            // errors.push({ lineNumber: lines.length, message: `文件末尾有多餘的閉合括號，括號層級: ${braceLevel}` });
        }

        displayErrors();
        updateLineNumbers();
    }


    function getCursorContext() {
        const text = editor.value;
        const cursorPos = editor.selectionStart;
        let currentLineNum = text.substring(0, cursorPos).split('\n').length;
        let currentLineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
        let currentLineEnd = text.indexOf('\n', cursorPos);
        if (currentLineEnd === -1) currentLineEnd = text.length;

        const currentLineText = text.substring(currentLineStart, currentLineEnd);
        const textBeforeCursorOnLine = text.substring(currentLineStart, cursorPos);

        let inBlockType = null;
        let blockBraceLevel = 0; // This level is calculated from start of *document* up to cursor
        const linesUpToCursorLine = text.substring(0, currentLineStart).split('\n');

        for (const line of linesUpToCursorLine) {
            for (const char of line) {
                if (char === '{') blockBraceLevel++;
                else if (char === '}') blockBraceLevel--;
            }
        }
        // Add braces from current line up to cursor
        for (const char of text.substring(currentLineStart, cursorPos)) {
            if (char === '{') blockBraceLevel++;
            else if (char === '}') blockBraceLevel--;
        }
        
        // Determine inBlockType based on braceLevel and last block opening
        if (blockBraceLevel > 0) {
            let tempTextBeforeCursor = text.substring(0, cursorPos);
            let lastMetadata = tempTextBeforeCursor.lastIndexOf("metadata {");
            let lastPerson = tempTextBeforeCursor.lastIndexOf("person {");
            let lastRelationship = tempTextBeforeCursor.lastIndexOf("relationship {");
            let lastBond = tempTextBeforeCursor.lastIndexOf("bond {");
            let lastTie = tempTextBeforeCursor.lastIndexOf("tie {");
            
            let currentBlockStartPos = -1;
            let potentialBlockType = null;

            if (lastMetadata !== -1) { potentialBlockType = 'metadata'; currentBlockStartPos = lastMetadata; }
            if (lastPerson !== -1 && lastPerson > currentBlockStartPos) { potentialBlockType = 'person'; currentBlockStartPos = lastPerson; }
            if (lastRelationship !== -1 && lastRelationship > currentBlockStartPos) { potentialBlockType = 'relationship'; currentBlockStartPos = lastRelationship; }
            if (lastBond !== -1 && lastBond > currentBlockStartPos) { potentialBlockType = 'bond'; currentBlockStartPos = lastBond; }
            if (lastTie !== -1 && lastTie > currentBlockStartPos) { potentialBlockType = 'tie'; currentBlockStartPos = lastTie; }

            if (potentialBlockType) {
                // Check if there's a '}' between this block start and cursor that would close it
                let openBraceCountForThisBlock = 0;
                 let searchEnd = cursorPos;
                 let searchStart = currentBlockStartPos;
                 
                 // Find the actual block opening brace position
                 const blockOpenBraceIndex = tempTextBeforeCursor.indexOf('{', searchStart);
                 if(blockOpenBraceIndex !== -1 && blockOpenBraceIndex < cursorPos) {
                      searchStart = blockOpenBraceIndex;
                 } else {
                      // If '{' not found after keyword, maybe it's on the next line?
                      // This simple context check might fail in complex multi-line block headers.
                      // For this structure (block_name { ... }), finding the last block_name { is usually sufficient.
                      // Let's assume simple block opening for now.
                 }


                for (let i = searchStart; i < cursorPos; i++) {
                    if (tempTextBeforeCursor[i] === '{') openBraceCountForThisBlock++;
                    if (tempTextBeforeCursor[i] === '}') openBraceCountForThisBlock--;
                }

                if (openBraceCountForThisBlock > 0) { // If still "open" considering from its start
                     // Verify that the characters between the block start keyword and the cursor
                     // don't contain a closing brace that would finish the block prematurely
                    let contentAfterBlockKeyword = tempTextBeforeCursor.substring(currentBlockStartPos + potentialBlockType.length + 1, cursorPos);
                    if (!contentAfterBlockKeyword.includes('}')) {
                         inBlockType = potentialBlockType;
                    } else {
                         inBlockType = null; // A '}' was found, block might be closed
                    }
                } else {
                    inBlockType = null; // Block was closed before cursor
                }
            } else {
                 inBlockType = null; // No block start found or it's invalid
            }
        } else {
            inBlockType = null; // Cursor is at base level or outside any valid block
        }


        return {
            text, cursorPos, currentLineNum, currentLineText, currentLineStart,
            textBeforeCursorOnLine, currentLineEmpty: currentLineText.trim() === '',
            inBlockType, blockBraceLevel // blockBraceLevel is overall level, inBlockType is specific
        };
    }


    function getCharacterWidth() {
        const span = document.createElement('span');
        span.style.fontFamily = editorStyles.fontFamily;
        span.style.fontSize = editorStyles.fontSize + 'px';
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.textContent = 'M'; // Use a common character, 'M' is often wide
        document.body.appendChild(span);
        const width = span.offsetWidth;
        document.body.removeChild(span);
        return width || 8; // Fallback if offsetWidth is 0
    }

    function showSuggestionsPopup(suggestions, context) {
        activeSuggestions = suggestions;
        if (suggestions.length === 0) {
            suggestionBox.style.display = 'none';
            return;
        }

        suggestionBox.innerHTML = '';
        suggestions.forEach((sugg) => {
            const div = document.createElement('div');
            div.textContent = sugg.split('\n')[0]; // Show only first line for multiline suggestions
            div.dataset.fullSuggestion = sugg; // Store full suggestion
            div.onclick = () => applySuggestion(sugg, context);
            suggestionBox.appendChild(div);
        });

        // Position calculation
        const charWidth = getCharacterWidth();
        const editorViewRect = editorView.getBoundingClientRect(); // For viewport collision

        // Calculate top relative to the editor's scroll position
        const scrollTop = editor.scrollTop;
        const relativeTop = (context.currentLineNum -1) * editorStyles.lineHeight + editorStyles.paddingTop - scrollTop;
        let top = relativeTop + editorStyles.lineHeight + editor.offsetTop; // Below current line

        // Calculate left relative to the editor's scroll position
        const scrollLeft = editor.scrollLeft;
        const charsBeforeCursorOnLine = context.textBeforeCursorOnLine.length;
        let left = charsBeforeCursorOnLine * charWidth + editor.offsetLeft - scrollLeft + parseFloat(window.getComputedStyle(editor).paddingLeft);

        suggestionBox.style.display = 'block';
        const boxRect = suggestionBox.getBoundingClientRect(); // Get box dimensions *after* display and content

        // Collision detection with editorView boundaries
        if (left + boxRect.width > editorViewRect.right) { // If overflows right relative to editorView right edge
             left = editorViewRect.right - boxRect.width - 5; // Adjust left
        }
        if (top + boxRect.height > editorViewRect.bottom) { // If overflows bottom relative to editorView bottom edge
            top = relativeTop - boxRect.height + editor.offsetTop; // Position above current line
        }
        
        // Ensure it doesn't go above or to the left of the editor itself
        suggestionBox.style.top = `${Math.max(editor.offsetTop, top)}px`;
        suggestionBox.style.left = `${Math.max(editor.offsetLeft, left)}px`;
        currentSuggestionIndex = -1; // Reset selection
    }
    
    function applySuggestion(suggestionText, context) {
        const text = editor.value;
        const { cursorPos, textBeforeCursorOnLine, currentLineStart, inBlockType } = context;
        
        // Determine how much of the current line before the cursor needs to be replaced.
        let prefixToReplace = "";
        const trimmedTextBeforeCursorOnLine = textBeforeCursorOnLine.trimStart();
        const typedPart = trimmedTextBeforeCursorOnLine.split(':')[0].trim();

        if (context.inBlockType && FTDL_RULES.propertySuggestions[context.inBlockType]?.some(s => s.toLowerCase().startsWith(typedPart.toLowerCase()))) {
             // User has typed "prop" or "prop:" or "prop: val". Find the start of the typed property name.
             const lineFromStart = text.substring(currentLineStart, cursorPos);
             const propNameMatch = lineFromStart.match(/([a-zA-Z_][a-zA-Z0-9_]*\??)\s*:\s*.*$/); // Match property name before colon
             if (propNameMatch && propNameMatch[1]) {
                 const propNameStartIndex = lineFromStart.indexOf(propNameMatch[1].trim());
                 if (propNameStartIndex !== -1) {
                    prefixToReplace = lineFromStart.substring(propNameStartIndex);
                 } else {
                     // Fallback if propNameStartIndex not found (shouldn't happen with match)
                     prefixToReplace = textBeforeCursorOnLine.substring(textBeforeCursorOnLine.indexOf(trimmedTextBeforeCursorOnLine));
                 }
             } else if (typedPart !== "") {
                  // If no colon yet, just replace the typed word
                  const wordMatch = lineFromStart.match(/(\S+)$/); // Match last word
                  if (wordMatch && wordMatch[1]) {
                      const wordStartIndex = lineFromStart.lastIndexOf(wordMatch[1]);
                       prefixToReplace = lineFromStart.substring(wordStartIndex);
                  } else {
                      // Fallback
                      prefixToReplace = textBeforeCursorOnLine.substring(textBeforeCursorOnLine.indexOf(trimmedTextBeforeCursorOnLine));
                  }
             } else {
                 // If line is empty or just indent, replace the indent
                 prefixToReplace = textBeforeCursorOnLine;
             }

        } else if (FTDL_RULES.topLevelSuggestions.includes(suggestionText) && textBeforeCursorOnLine.trim() !== "") {
            // Suggesting a block on a non-empty line, replace the whole line content before cursor
             prefixToReplace = textBeforeCursorOnLine;
        }
         else {
             // Default: if line is empty or simple case, replace nothing or just indent
             prefixToReplace = textBeforeCursorOnLine; // This replaces indentation too if line is empty
        }
        
        const insertionPoint = cursorPos - prefixToReplace.length;
        const textBeforeInsertionPoint = text.substring(0, insertionPoint);
        const textAfterInsertionPoint = text.substring(cursorPos);

        let finalSuggestionToInsert = suggestionText;
        let newCursorPosOffset = 0; // Relative to start of inserted text

        const isPropertySuggestion = FTDL_RULES.propertySuggestions[inBlockType]?.includes(suggestionText);
        const isTopLevelSuggestion = FTDL_RULES.topLevelSuggestions.includes(suggestionText);

         // Ensure proper indentation for property suggestions on empty/indented lines
        if (isPropertySuggestion && inBlockType) {
            const lineFromStartToInsertion = text.substring(currentLineStart, insertionPoint);
            if (lineFromStartToInsertion.trim() === "") {
                 // If the line is effectively empty before insertion point, ensure proper indentation
                 // Check if there is *already* sufficient indentation
                 if (lineFromStartToInsertion.length < INDENTATION.length) {
                     finalSuggestionToInsert = INDENTATION.substring(lineFromStartToInsertion.length) + suggestionText;
                 } else {
                     // Already indented correctly
                 }
            }
             // Calculate initial cursor offset (usually after colon or on placeholder)
             if (finalSuggestionToInsert.includes(": ") && !finalSuggestionToInsert.trim().endsWith(";")) {
                newCursorPosOffset = finalSuggestionToInsert.indexOf(": ") + 2;
            } else {
                // Default position: before semicolon if exists, else end of suggestion
                newCursorPosOffset = finalSuggestionToInsert.length - (finalSuggestionToInsert.endsWith(";") ? 1 : 0);
            }

        } else if (isTopLevelSuggestion) {
            // For top-level block suggestions like "person {\n ... }", place cursor inside block
            const blockOpenBraceIndex = suggestionText.indexOf('{');
            if (blockOpenBraceIndex !== -1) {
                 const newlineAfterBraceIndex = suggestionText.indexOf('\n', blockOpenBraceIndex);
                 if (newlineAfterBraceIndex !== -1) {
                      // Place cursor on the empty indented line after the opening brace
                     newCursorPosOffset = newlineAfterBraceIndex + 1 + INDENTATION.length; // +1 for newline character
                 } else {
                     // If no newline, place cursor right after the brace and a space
                     newCursorPosOffset = blockOpenBraceIndex + 2; // +2 for "{ "
                 }
            } else {
                 // Should not happen for current top-level suggestions, but fallback to end
                 newCursorPosOffset = finalSuggestionToInsert.length;
            }
        } else {
             // Default: end of suggestion
             newCursorPosOffset = finalSuggestionToInsert.length;
        }


        editor.value = textBeforeInsertionPoint + finalSuggestionToInsert + textAfterInsertionPoint;
        editor.focus();
        
        const finalCursorPos = textBeforeInsertionPoint.length + newCursorPosOffset;
        let selectionStart = finalCursorPos;
        let selectionEnd = finalCursorPos;

        // Placeholder selection logic: find common placeholders *after* the calculated cursor position
        const remainingSuggestion = finalSuggestionToInsert.substring(newCursorPosOffset);
        const placeholderMatch = remainingSuggestion.match(/^(unique_id|\[.*?\]|YYYY(?:\[-MM(?:\[-DD\])?\])?|true\|false)/);
        
        if (placeholderMatch) {
            const placeholderText = placeholderMatch[0];
            selectionEnd = selectionStart + placeholderText.length;
        }

        editor.setSelectionRange(selectionStart, selectionEnd);

        suggestionBox.style.display = 'none';
        activeSuggestions = [];
        validateFTDL();
        updateLineNumbers();
    }


    function handleEditorKeyDown(e) {
        if (e.key === 'Tab') {
            if (suggestionBox.style.display === 'block' && activeSuggestions.length > 0 && currentSuggestionIndex !== -1) {
                 e.preventDefault(); // Prevent default tab for indentation
                 applySuggestion(activeSuggestions[currentSuggestionIndex], getCursorContext());
                 return; // Handled by suggestion
            }

            // If suggestion box is NOT active or no suggestion is selected, handle indentation
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const text = editor.value;

            if (start !== end) { // Multi-line tabbing
                let lineStartIdx = text.lastIndexOf('\n', start -1) + 1;
                let lineEndIdx = text.indexOf('\n', end);
                if(lineEndIdx === -1) lineEndIdx = text.length;
                if (end > 0 && end === lineEndIdx && text[end-1] === '\n') { // Handle selection ending exactly at newline
                    lineEndIdx = text.indexOf('\n', end - 1);
                    if(lineEndIdx === -1 || lineEndIdx < lineStartIdx) lineEndIdx = text.length;
                }


                const selectedLinesText = text.substring(lineStartIdx, lineEndIdx);
                const lines = selectedLinesText.split('\n');
                let newSelectedLinesText = [];
                let totalChange = 0; // Total character change for updating selection end

                lines.forEach((line, index) => {
                     // Don't indent/unindent empty lines unless it's the only line selected
                    if (lines.length > 1 && line.trim() === "") {
                        newSelectedLinesText.push(line);
                        return;
                    }

                    if (e.shiftKey) { // Unindent
                        if (line.startsWith(INDENTATION)) {
                            newSelectedLinesText.push(line.substring(INDENTATION.length));
                            totalChange -= INDENTATION.length;
                            // Adjust selection start only if it was within the removed indent of the *first* line
                            if (index === 0 && start <= lineStartIdx + INDENTATION.length) {
                                start -= INDENTATION.length;
                            }
                        } else {
                             // Attempt partial unindent if starts with less than full indentation space/tabs
                             const leadingSpaceMatch = line.match(/^(\s+)/);
                             if(leadingSpaceMatch) {
                                const leadingSpaces = leadingSpaceMatch[1];
                                const removeLength = Math.min(leadingSpaces.length, INDENTATION.length);
                                if(removeLength > 0) {
                                    newSelectedLinesText.push(line.substring(removeLength));
                                    totalChange -= removeLength;
                                     if (index === 0 && start <= lineStartIdx + removeLength) {
                                        start -= removeLength;
                                     }
                                } else {
                                     newSelectedLinesText.push(line); // No spaces to remove
                                }
                             } else {
                                 newSelectedLinesText.push(line); // No leading spaces/tabs
                             }
                        }
                    } else { // Indent
                        newSelectedLinesText.push(INDENTATION + line);
                        totalChange += INDENTATION.length;
                         // Adjust selection start only for the *first* line
                        if (index === 0) {
                            start += INDENTATION.length;
                        }
                    }
                });

                const newText = newSelectedLinesText.join('\n');
                editor.value = text.substring(0, lineStartIdx) + newText + text.substring(lineEndIdx);

                // Adjust selection start and end based on total change and original positions
                 // Ensure start doesn't go before the line start
                editor.selectionStart = Math.max(lineStartIdx, start);
                editor.selectionEnd = end + totalChange;


            } else { // Single-line tabbing or indenting at cursor
                const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                if (e.shiftKey) { // Unindent
                    const charsBeforeCursorOnLine = text.substring(lineStart, start);
                    const leadingSpaceMatch = charsBeforeCursorOnLine.match(/^(\s*)/);

                    if (leadingSpaceMatch && leadingSpaceMatch[1].length > 0) {
                         const leadingSpaces = leadingSpaceMatch[1];
                         const removeLength = Math.min(leadingSpaces.length, INDENTATION.length);

                         if (removeLength > 0) {
                             editor.value = text.substring(0, lineStart) + text.substring(lineStart + removeLength);
                             editor.selectionStart = editor.selectionEnd = Math.max(lineStart, start - removeLength);
                         }
                    }
                } else { // Indent
                    editor.value = text.substring(0, start) + INDENTATION + text.substring(end);
                    editor.selectionStart = editor.selectionEnd = start + INDENTATION.length;
                }
            }
            validateFTDL();
            updateLineNumbers();
            return;
        }

        // Handle suggestion navigation with Arrow keys and Enter/Escape
        if (suggestionBox.style.display === 'block' && activeSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentSuggestionIndex = (currentSuggestionIndex + 1) % activeSuggestions.length;
                updateSuggestionSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentSuggestionIndex = (currentSuggestionIndex - 1 + activeSuggestions.length) % activeSuggestions.length;
                updateSuggestionSelection();
            } else if (e.key === 'Enter') {
                if (currentSuggestionIndex !== -1) {
                    e.preventDefault(); // Prevent default Enter (newline)
                    applySuggestion(activeSuggestions[currentSuggestionIndex], getCursorContext());
                } else {
                    // If Enter and no suggestion selected, default behavior (newline)
                    suggestionBox.style.display = 'none';
                    activeSuggestions = [];
                    // Allow default Enter behavior by not preventing default
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                suggestionBox.style.display = 'none';
                activeSuggestions = [];
            }
        }
    }

    function updateSuggestionSelection() {
        Array.from(suggestionBox.children).forEach((child, index) => {
            child.classList.toggle('selected', index === currentSuggestionIndex);
            if (index === currentSuggestionIndex) {
                child.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        });
    }

    editor.addEventListener('mouseup', () => { // Update lastCursorPos on mouse click as well
        lastCursorPos = editor.selectionStart;
        // After mouseup, re-evaluate suggestions
        setTimeout(() => handleEditorKeyUp({key: "MouseUpEvent"}), 10);
    });

    function handleEditorKeyUp(e) {
        // Keys that are strictly for suggestion navigation or hiding and shouldn't re-trigger suggestion logic later in this function
        const suggestionControlKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];

         // If a suggestion control key was pressed AND the suggestion box was active,
         // the keydown handler already took care of navigation/application/hiding.
         // We don't need to re-evaluate suggestions based on *this* keyup.
         if (suggestionControlKeys.includes(e.key) && suggestionBox.style.display === 'block') {
             // Unless it was just Shift/Control/Alt etc. which don't navigate suggestions
              if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                 lastCursorPos = editor.selectionStart; // Still update cursor position
                 return; // Do not re-evaluate suggestions
              }
         }
        
        // If Tab was pressed, keydown handled it (indentation or suggestion application)
        if (e.key === 'Tab') {
             lastCursorPos = editor.selectionStart; // Still update cursor position
             return; // Do not re-evaluate suggestions here
        }


        lastCursorPos = editor.selectionStart;
        const context = getCursorContext();
        let suggestions = [];
        
        const textBeforeCursorOnLineLower = context.textBeforeCursorOnLine.toLowerCase();
        const trimmedTextBeforeCursorOnLine = context.textBeforeCursorOnLine.trimStart(); // Keep capitalization for matching suggestions

        // Determine if cursor is likely within a value after a colon
        const lastColonIndex = context.textBeforeCursorOnLine.lastIndexOf(':');
        const lastSemiColonIndex = context.textBeforeCursorOnLine.lastIndexOf(';');
        const probablyInValue = lastColonIndex !== -1 && (lastSemiColonIndex === -1 || lastColonIndex > lastSemiColonIndex);


        if (context.blockBraceLevel === 0 && context.currentLineText.trim() === "") { // Empty line at top level
            suggestions = FTDL_RULES.topLevelSuggestions;
        } else if (context.inBlockType && FTDL_RULES.propertySuggestions[context.inBlockType]) {
            // Inside a block, suggest properties
            if (!context.currentLineText.trim().startsWith('}') && !context.currentLineText.trim().endsWith(';')) {
                 // Only suggest properties if we are not currently typing a value after a colon,
                 // or if we are at the very beginning of the line/after indentation.
                 const textAfterIndent = context.textBeforeCursorOnLine.substring(context.textBeforeCursorOnLine.search(/\S|$/)); // Text after leading whitespace

                if (!probablyInValue || textAfterIndent === "" ) {
                    suggestions = FTDL_RULES.propertySuggestions[context.inBlockType]
                        .filter(prop => prop.toLowerCase().startsWith(trimmedTextBeforeCursorOnLine.toLowerCase())); // Match start of suggestion
                    // If nothing typed, show all suggestions for the block
                    if (trimmedTextBeforeCursorOnLine === "") {
                         suggestions = FTDL_RULES.propertySuggestions[context.inBlockType];
                    }
                } else {
                    // We are inside a value, don't suggest new properties
                     suggestions = [];
                }
            }
        }
        // Note: If the cursor is right after a semicolon, no suggestions are shown by this logic, which is correct.


        if (suggestions.length > 0) {
            showSuggestionsPopup(suggestions, context);
        } else {
            // No suggestions, hide the box
            suggestionBox.style.display = 'none';
            activeSuggestions = [];
        }
    }

    editor.addEventListener('input', () => {
        validateFTDL();
         // Trigger keyup logic to re-evaluate suggestions after any input (paste, IME, etc.)
        handleEditorKeyUp({ key: "InputEvent" });
    });
    editor.addEventListener('scroll', () => {
        if (lineNumbersDiv) lineNumbersDiv.scrollTop = editor.scrollTop;
        // Hide suggestions when scrolling
        suggestionBox.style.display = 'none';
        activeSuggestions = [];
    });
    editor.addEventListener('focus', () => { editorStyles = calculateEditorStyles(); updateLineNumbers(); });
    
     // Hide suggestion box if click is outside editor or suggestion box
    document.addEventListener('click', (event) => {
        if (suggestionBox.style.display === 'block') {
            if (!editor.contains(event.target) && !suggestionBox.contains(event.target)) {
                suggestionBox.style.display = 'none'; activeSuggestions = [];
            }
        }
    });


    editor.addEventListener('keyup', handleEditorKeyUp);
    editor.addEventListener('keydown', handleEditorKeyDown);

    validateFTDL(); // Initial validation

    // 供 ai.js 使用：驗證目前編輯器內容並回傳錯誤清單
    window.ftdlValidate = () => {
        validateFTDL();
        displayErrors();
        return errors.map(e => ({ ...e }));
    };
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => { updateLineNumbers(); editorStyles = calculateEditorStyles(); });
        ro.observe(editor);
    } else {
        window.addEventListener('resize', () => { updateLineNumbers(); editorStyles = calculateEditorStyles(); });
    }
});