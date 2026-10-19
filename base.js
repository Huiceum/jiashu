document.addEventListener('DOMContentLoaded', () => {
    // --- Helper: Set Primary Color RGB for focus shadows ---
    function setPrimaryColorRGB() {
        try {
            const primaryColorHex = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
            if (primaryColorHex) {
                let hex = primaryColorHex.startsWith('#') ? primaryColorHex.slice(1) : primaryColorHex;
                if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
                if (hex.length === 6) {
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    document.documentElement.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
                }
            }
        } catch (error) {
            console.error("Error setting primary color RGB:", error);
        }
    }
    setPrimaryColorRGB(); // Initial call

    // --- Theme Toggle (Dark/Light Mode) ---
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const sunIcon = themeToggleBtn ? themeToggleBtn.querySelector('.sun-icon') : null;
    const moonIcon = themeToggleBtn ? themeToggleBtn.querySelector('.moon-icon') : null;
    
    let currentTheme = localStorage.getItem('theme');
    if (!currentTheme) {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if(sunIcon) sunIcon.style.display = 'none';
            if(moonIcon) moonIcon.style.display = 'inline-block';
        } else {
            document.body.classList.remove('dark-mode');
            if(sunIcon) sunIcon.style.display = 'inline-block';
            if(moonIcon) moonIcon.style.display = 'none';
        }
        localStorage.setItem('theme', theme);
        setPrimaryColorRGB(); 
    }

    if (themeToggleBtn) {
        applyTheme(currentTheme); 

        themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }
    
    try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (themeToggleBtn && !localStorage.getItem('theme')) { 
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    } catch (error) {
        console.warn("Error setting up prefers-color-scheme listener:", error);
    }

    // --- 側邊欄控制 ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    if (sidebar && sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // --- 視圖切換控制 (Both Desktop Tabs and Mobile Dropdown) ---
    const familyTreeContainer = document.getElementById('family-tree-container');
    const ftdlEditorView = document.getElementById('ftdl-editor-view');

    function setActiveView(viewName) {
        if (familyTreeContainer) familyTreeContainer.classList.remove('active');
        if (ftdlEditorView) ftdlEditorView.classList.remove('active');

        if (viewName === 'canvas') {
            if (familyTreeContainer) {
                familyTreeContainer.style.display = 'flex';
                familyTreeContainer.classList.add('active');
            }
            if (ftdlEditorView) {
                ftdlEditorView.style.display = 'none';
            }
        } else if (viewName === 'editor') {
            if (ftdlEditorView) {
                ftdlEditorView.style.display = 'flex';
                ftdlEditorView.classList.add('active');
            }
            if (familyTreeContainer) {
                familyTreeContainer.style.display = 'none';
            }
        } else {
            if (familyTreeContainer) familyTreeContainer.style.display = 'none';
            if (ftdlEditorView) ftdlEditorView.style.display = 'none';
        }

        const desktopTabButtons = document.querySelectorAll('.desktop-view-switcher .tab-btn');
        desktopTabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
        });

        const currentMobileViewLabel = document.getElementById('current-mobile-view-label');
        const mobileViewOptions = document.querySelectorAll('#mobile-view-options .mobile-view-option');
        if (currentMobileViewLabel) {
            const selectedOption = Array.from(mobileViewOptions).find(opt => opt.getAttribute('data-view') === viewName);
            if (selectedOption) currentMobileViewLabel.textContent = selectedOption.textContent;
        }
        mobileViewOptions.forEach(opt => {
            opt.classList.toggle('active', opt.getAttribute('data-view') === viewName);
        });
    }

    const desktopTabButtons = document.querySelectorAll('.desktop-view-switcher .tab-btn');
    desktopTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewToActivate = button.getAttribute('data-view');
            setActiveView(viewToActivate);
        });
    });

    const mobileViewToggleBtn = document.getElementById('mobile-view-toggle-btn');
    const mobileViewOptionsContainer = document.getElementById('mobile-view-options');
    const mobileViewOptionsElements = document.querySelectorAll('#mobile-view-options .mobile-view-option');
    const dropdownArrow = mobileViewToggleBtn ? mobileViewToggleBtn.querySelector('.dropdown-arrow') : null;

    if (mobileViewToggleBtn && mobileViewOptionsContainer) {
        mobileViewToggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            mobileViewOptionsContainer.classList.toggle('open');
            if (dropdownArrow) dropdownArrow.style.transform = mobileViewOptionsContainer.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        mobileViewOptionsElements.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const viewToActivate = option.getAttribute('data-view');
                setActiveView(viewToActivate);
                mobileViewOptionsContainer.classList.remove('open');
                if (dropdownArrow) dropdownArrow.style.transform = 'rotate(0deg)';
            });
        });

        document.addEventListener('click', (event) => {
            if (mobileViewOptionsContainer.classList.contains('open') && !mobileViewToggleBtn.contains(event.target) && !mobileViewOptionsContainer.contains(event.target)) {
                mobileViewOptionsContainer.classList.remove('open');
                if (dropdownArrow) dropdownArrow.style.transform = 'rotate(0deg)';
            }
        });
    }
    
    let initialView = 'canvas';
    const activeDesktopTab = document.querySelector('.desktop-view-switcher .tab-btn.active');
    if (activeDesktopTab) {
        initialView = activeDesktopTab.getAttribute('data-view') || 'canvas';
    }
    if (familyTreeContainer && ftdlEditorView) {
        setActiveView(initialView);
    } else {
        console.error("Error initializing views: familyTreeContainer or ftdlEditorView not found on DOMContentLoaded.");
    }

    // --- FTDL Editor Controls (儲存功能保留, 執行功能已移除) ---
    // const executeFtdlBtn = document.getElementById('execute-ftdl-btn'); // 已移除
    const saveFtdlBtn = document.getElementById('save-ftdl-btn');
    const ftdlEditor = document.getElementById('ftdl-editor');
    const FTDL_STORAGE_KEY = 'ftdlEditorContent';

    if (ftdlEditor) {
        const savedFtdl = localStorage.getItem(FTDL_STORAGE_KEY);
        if (savedFtdl) {
            ftdlEditor.value = savedFtdl;
            console.log('FTDL content loaded from localStorage.');
        }
    }

    /* 
    // --- 執行按鈕相關邏輯已完全移除 ---
    if (executeFtdlBtn) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const executeShortcutHint = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
        executeFtdlBtn.setAttribute('title', `執行 (${executeShortcutHint})`);

        executeFtdlBtn.addEventListener('click', () => {
            console.log('Execute FTDL button clicked - THIS SHOULD NOT APPEAR FROM base.js');
            const ftdlCode = ftdlEditor ? ftdlEditor.value : '';
            alert(`執行按鈕被點擊 (來自 base.js - 應移除)。\n快捷鍵提示: ${executeShortcutHint}\nFTDL 內容:\n${ftdlCode.substring(0,100) + '...'}`);
        });
    }
    */

    if (saveFtdlBtn && ftdlEditor) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const saveShortcutHint = isMac ? 'Cmd+S' : 'Ctrl+S';
        saveFtdlBtn.setAttribute('title', `儲存 (${saveShortcutHint})`);

        saveFtdlBtn.addEventListener('click', () => {
            const ftdlCode = ftdlEditor.value;
            localStorage.setItem(FTDL_STORAGE_KEY, ftdlCode);
            console.log('FTDL content saved to localStorage.');
            saveFtdlBtn.textContent = '已儲存!';
            setTimeout(() => {
                saveFtdlBtn.textContent = '儲存';
            }, 1500);
        });
    }

    if (ftdlEditor) {
        ftdlEditor.addEventListener('keydown', (event) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifierKey = isMac ? event.metaKey : event.ctrlKey;

            // Cmd/Ctrl + Enter 執行邏輯已移除
            /*
            if (modifierKey && event.key === 'Enter') {
                event.preventDefault(); 
                console.log('Modifier + Enter pressed in editor for Execute - THIS SHOULD NOT APPEAR FROM base.js');
                // if (executeFtdlBtn) { // executeFtdlBtn 不應在此被引用
                //     executeFtdlBtn.click(); 
                // } else {
                //     alert(`快捷鍵 ${isMac ? 'Cmd+Enter' : 'Ctrl+Enter'} 觸發執行 (來自 base.js - 應移除)！\nFTDL 內容:\n${ftdlEditor.value.substring(0,100) + '...'}`);
                // }
            }
            */

            if (modifierKey && event.key.toLowerCase() === 's') {
                event.preventDefault(); 
                console.log('Modifier + S pressed in editor for Save');
                if (saveFtdlBtn) {
                    saveFtdlBtn.click();
                } else {
                    const ftdlCode = ftdlEditor.value;
                    localStorage.setItem(FTDL_STORAGE_KEY, ftdlCode);
                    alert(`快捷鍵 ${isMac ? 'Cmd+S' : 'Ctrl+S'} 觸發儲存！內容已存入 localStorage。`);
                }
            }
        });
    }

    // --- 對話框文本區高度自適應 ---
    const userTextInput = document.getElementById('user-text-input');
    if (userTextInput) {
        const initialMinHeight = userTextInput.style.minHeight || getComputedStyle(userTextInput).minHeight;
        function adjustTextareaHeight() {
            userTextInput.style.height = 'auto';
            const scrollHeight = userTextInput.scrollHeight;
            const computedStyle = getComputedStyle(userTextInput);
            const maxHeightStyle = computedStyle.getPropertyValue('--dialogue-textarea-max-height-fixed') || computedStyle.maxHeight;
            const maxHeight = parseInt(maxHeightStyle, 10);

            if (maxHeight > 0 && scrollHeight > maxHeight) {
                userTextInput.style.height = `${maxHeight}px`;
                userTextInput.style.overflowY = 'auto';
            } else {
                userTextInput.style.height = `${scrollHeight}px`;
                userTextInput.style.overflowY = 'hidden';
            }
            if (userTextInput.value === '') {
                userTextInput.style.height = initialMinHeight;
                userTextInput.style.overflowY = 'hidden';
            }
        }
        userTextInput.addEventListener('input', adjustTextareaHeight);
        adjustTextareaHeight();
    }
});