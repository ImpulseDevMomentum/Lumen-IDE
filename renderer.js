const editor = ace.edit("editor")
editor.setTheme("ace/theme/monokai")
editor.setFontSize(14)

ace.require("ace/ext/language_tools");

editor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
    showPrintMargin: false,
    fontSize: "14px"
});

define('ace/mode/lumen', function(require, exports, module) {
    const oop = require("ace/lib/oop");
    const TextMode = require("ace/mode/text").Mode;
    const LumenHighlightRules = require("ace/mode/lumen_highlight_rules").LumenHighlightRules;

    const Mode = function() {
        this.HighlightRules = LumenHighlightRules;
    };
    oop.inherits(Mode, TextMode);
    exports.Mode = Mode;
});

define('ace/mode/lumen_highlight_rules', function(require, exports, module) {
    const oop = require("ace/lib/oop");
    const TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

    const LumenHighlightRules = function() {
        this.$rules = {
            "start": [
                {
                    token: "keyword",
                    regex: "\\b(SET|ELSE|PRINT|IF|THEN|OTHER|STOP|FOR|TO|STEP|NEXT|WHILE|DO|INPUT|INPUT_INT|AND|OR|NOT|FUNC|BACK|BREAK|FLOAT|INT|STR|TRUE|FALSE|RANDOM_INT|RANDOM_FLOAT|RANDOM_CHOICE|FORMAT|CLEAR|IS_FUNCTION|IS_LIST|IS_NUMBER|IS_STRING|APPEND|POP|EXTEND|LEN|RUN|INT|FLOAT|STR|RANDOM_INT|RANDOM_FLOAT|RANDOM_CHOICE|FORMAT)\\b"
                },
                {
                    token: "constant.language",
                    regex: "\\b(NULL|TRUE|FALSE|MATH_PI|MATH_E|MATH_TAU)\\b"
                },
                {
                    token: "string",
                    regex: '"',
                    next: "string"
                },
                {
                    token: "constant.numeric",
                    regex: "\\b\\d+(\\.\\d+)?\\b"
                },
                {
                    token: "comment",
                    regex: "#.*$"
                },
                {
                    token: "keyword.operator",
                    regex: "\\+\\=|\\-\\=|\\+|\\-|\\*|\\/|\\=|\\<|\\>|\\<=|\\>=|\\<>|\\&|\\^"
                },
                {
                    token: "support.function",
                    regex: "\\b(PRINT|INPUT|INPUT_INT|INT|FLOAT|STR|RANDOM_INT|RANDOM_FLOAT|RANDOM_CHOICE|FORMAT)\\s*\\("
                },
                {
                    token: "string.formatting",
                    regex: ":\\d*\\.?\\d*f"
                }
            ],
            "string": [
                {
                    token: "string.escaped",
                    regex: "{{[^}]+}}|{{}}",
                    onMatch: function(val) {
                        return "string.escaped";
                    }
                },
                {
                    token: "variable",
                    regex: "{[^{}]+}|{}",
                    onMatch: function(val) {
                        if (val.startsWith("{{")) {
                            return "string.escaped";
                        }
                        return "variable";
                    }
                },
                {
                    token: "string",
                    regex: '"',
                    next: "start"
                },
                {
                    defaultToken: "string"
                }
            ]
        };
    };
    oop.inherits(LumenHighlightRules, TextHighlightRules);
    exports.LumenHighlightRules = LumenHighlightRules;
});

editor.session.setMode("ace/mode/lumen");

let themes = {};

async function loadThemes() {
    try {
        themes = await window.electron.ipcRenderer.invoke('load-themes');
        if (themes.error) {
            console.error('Error loading themes:', themes.error);
            return;
        }
        
        const themeSelect = document.getElementById('themeSelect');
        themeSelect.innerHTML = '';
        
        Object.keys(themes).forEach(themeName => {
            const option = document.createElement('option');
            option.value = themeName;
            option.textContent = themeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            themeSelect.appendChild(option);
        });
        
        const settings = await window.electron.ipcRenderer.invoke('load-settings');
        const themeName = settings?.theme || 'dark';
        if (themes[themeName]) {
            applyTheme(themeName);
            themeSelect.value = themeName;
        }
    } catch (error) {
        console.error('Error initializing themes:', error);
    }
}

function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    editor.setTheme(theme.editorTheme);
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.foreground;
    
    const consoleEl = document.getElementById('console');
    const consoleContainer = document.querySelector('.console-container');
    
    consoleEl.style.backgroundColor = theme.consoleBackground;
    consoleEl.style.color = theme.consoleForeground;
    consoleContainer.style.backgroundColor = theme.consoleBackground;
    
    document.querySelector('.menu-bar').style.backgroundColor = theme.menuBackground || theme.background;
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.style.backgroundColor = theme.menuBackground || theme.background;
    });
}

loadThemes();

let currentFilePath = null;
const console = document.getElementById('console');

let isResizing = false;
let startY;
let startHeight;

document.querySelector('.resize-handle').addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = document.querySelector('.console-container').offsetHeight;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
    });
});

function handleMouseMove(e) {
    if (!isResizing) return;
    
    const consoleContainer = document.querySelector('.console-container');
    const diff = startY - e.clientY;
    const newHeight = Math.max(100, Math.min(startHeight + diff, window.innerHeight * 0.8));
    consoleContainer.style.height = `${newHeight}px`;
}

document.getElementById('themeSelect').addEventListener('change', (e) => {
    const themeName = e.target.value;
    applyTheme(themeName);
    saveSettings({ theme: themeName });
});

document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
    const fontSize = parseInt(e.target.value);
    editor.setFontSize(fontSize);
    saveSettings({ font_size: fontSize });
});

document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
    const fontFamily = e.target.value;
    editor.setOption("fontFamily", fontFamily);
    document.getElementById('editor').style.fontFamily = fontFamily;
    
    saveSettings({ font_family: fontFamily });
});

document.getElementById('tabSizeSelect').addEventListener('change', (e) => {
    const tabSize = parseInt(e.target.value);
    editor.setOption("tabSize", tabSize);
    saveSettings({ tab_size: tabSize });
});

document.getElementById('wordWrapSelect').addEventListener('change', (e) => {
    const wordWrap = e.target.value;
    if (wordWrap === 'off') {
        editor.setOption("wrap", false);
    } else {
        editor.setOption("wrap", true);
        editor.setOption("wrapLimit", parseInt(wordWrap));
    }
    saveSettings({ word_wrap: wordWrap });
});

document.getElementById('lineHeightSelect').addEventListener('change', (e) => {
    const lineHeight = parseFloat(e.target.value);
    editor.container.style.lineHeight = lineHeight;
    saveSettings({ line_height: lineHeight });
});

document.getElementById('cursorStyleSelect').addEventListener('change', (e) => {
    const cursorStyle = e.target.value;
    editor.setOption("cursorStyle", cursorStyle);
    saveSettings({ cursor_style: cursorStyle });
});

document.getElementById('highlightActiveSelect').addEventListener('change', (e) => {
    const highlight = e.target.value === 'true';
    editor.setHighlightActiveLine(highlight);
    saveSettings({ highlight_active_line: highlight });
});

async function saveSettings(newSettings) {
    try {
        const response = await window.electron.ipcRenderer.invoke('save-settings', newSettings);
        if (response.error) {
            console.error('Failed to save settings:', response.error);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

async function loadSettings() {
    try {
        const settings = await window.electron.ipcRenderer.invoke('load-settings');
        if (settings) {
            if (settings.auto_complete !== undefined) {
                const autoComplete = settings.auto_complete === true || settings.auto_complete === 'true';
                document.getElementById('autoCompleteSelect').value = String(autoComplete);
                setupAutoComplete(autoComplete);
            }

            if (settings.auto_pairs !== undefined) {
                const autoPairs = settings.auto_pairs === true || settings.auto_pairs === 'true';
                document.getElementById('autoPairsSelect').value = String(autoPairs);
                setupAutoPairs(autoPairs);
            }

            if (settings.suggestions !== undefined) {
                const suggestions = settings.suggestions === true || settings.suggestions === 'true';
                document.getElementById('suggestionsSelect').value = String(suggestions);
                setupSuggestions(suggestions);
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

loadSettings();

async function openFile() {
    const result = await window.electron.ipcRenderer.invoke('open-file');
    if (result) {
        currentFilePath = result.path;
        editor.setValue(result.content, -1);
        editor.session.getUndoManager().reset();
    }
}

async function saveFile() {
    const content = editor.getValue();
    const path = await window.electron.ipcRenderer.invoke('save-file', {
        path: currentFilePath,
        content
    });
    if (path) {
        currentFilePath = path;
    }
}

function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    const allDropdowns = document.querySelectorAll('.dropdown');
    
    allDropdowns.forEach(d => {
        if (d.id !== id) {
            d.style.display = 'none';
        }
    });
    
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

document.querySelectorAll('.dropdown-item select').forEach(select => {
    select.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    select.addEventListener('change', (e) => {
        e.stopPropagation();
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-item') && !e.target.closest('select')) {
        document.querySelectorAll('.dropdown').forEach(d => {
            d.style.display = 'none';
        });
    }
});

const ansiToHtml = (text) => {
    text = text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    const ansiColorMap = {
        '\u001b[31m': '<span class="ansi-red">',      // Czerwony (red)
        '\u001b[33m': '<span class="ansi-yellow">',    // Żółty (yellow)
        '\u001b[0m': '</span>',                        // Reset (reset)
    };

    let html = text;
    for (const [ansi, htmlTag] of Object.entries(ansiColorMap)) {
        html = html.replace(new RegExp(ansi.replace('[', '\\['), 'g'), htmlTag);
    }
    return html;
};

async function runCode() {
    try {
        if (!currentFilePath) {
            await saveFile();
            if (!currentFilePath) {
                return;
            }
        }

        console.innerHTML = '';
        
        const result = await window.electron.ipcRenderer.invoke('run-code', currentFilePath);
        if (result.error) {
            const errorHtml = ansiToHtml(`Error: ${result.error}\n`);
            console.innerHTML += errorHtml;
        }
    } catch (error) {
        const errorHtml = ansiToHtml(`Error: ${error.message}\n`);
        console.innerHTML += errorHtml;
    }
}

async function stopCode() {
    try {
        const result = await window.electron.ipcRenderer.invoke('stop-code');
        if (result.error) {
            console.innerHTML += ansiToHtml(`Error: ${result.error}\n`);
        }
    } catch (error) {
        console.innerHTML += ansiToHtml(`Error: ${error.message}\n`);
    }
}

window.electron.ipcRenderer.on('console-output', (text) => {
    try {
        const html = ansiToHtml(text);
        console.innerHTML += html;
        console.scrollTop = console.scrollHeight;

        if (text.includes('input> ') || text.includes('input_int> ')) {
            const consoleInput = document.querySelector('.console-input');
            consoleInput.style.display = 'block';
            const inputField = consoleInput.querySelector('.console-input-field');
            inputField.focus();
        }
    } catch (error) {
        console.innerHTML += `Error processing output: ${error.message}\n`;
    }
});

window.electron.ipcRenderer.on('console-error', (text) => {
    try {
        const html = ansiToHtml(`Error: ${text}`);
        console.innerHTML += html;
        console.scrollTop = console.scrollHeight;
    } catch (error) {
        console.innerHTML += `Error processing error output: ${error.message}\n`;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newFile();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        saveFileAs();
    }
    if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        toggleConsole();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
    if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        openFile();
    }
    if (e.key === 'F5') {
        e.preventDefault();
        runCode();
    }
    if (e.key === 'F6') {
        e.preventDefault();
        stopCode();
    }
});

const completions = {
    keywords: [
        "SET", "IF", "THEN", "ELSE", "FOR", "TO", "STEP", "WHILE", "FUNC", 
        "PRINT", "INPUT", "INPUT_INT", "BREAK", "CONTINUE", "AND", "OR", "NOT",
        "FLOAT", "INT", "STR", "TRUE", "FALSE", "NULL",
        "MATH_PI", "MATH_E", "MATH_TAU", "CLEAR", "IS_FUNCTION", "IS_LIST", 
        "IS_NUMBER", "IS_STRING", "APPEND", "POP", "EXTEND", "LEN", "RUN", "INT", 
        "FLOAT", "STR", "RANDOM_INT", "RANDOM_FLOAT", "RANDOM_CHOICE", "FORMAT"
    ],
    snippets: {
        "PRINT": "PRINT(${1})",
        "IF": "IF ${1} THEN\n    ${2}\nSTOP",
        "FOR": "FOR ${1} = ${2} TO ${3} THEN\n    ${4}\nSTOP",
        "WHILE": "WHILE ${1} THEN\n    ${2}\nSTOP",
        "FUNC": "FUNC ${1}(${2})\n    ${3}\nSTOP",
        "INPUT": "INPUT(${1})",
        "INPUT_INT": "INPUT_INT(${1})",
        "RANDOM_INT": "RANDOM_INT(${1}, ${2})",
        "RANDOM_FLOAT": "RANDOM_FLOAT(${1}, ${2})",
        "RANDOM_CHOICE": "RANDOM_CHOICE(${1})",
        "FORMAT": "FORMAT(${1})",
        "LEN": "LEN(${1})",
        "APPEND": "APPEND(${1}, ${2})",
        "POP": "POP(${1}, ${2})",
        "EXTEND": "EXTEND(${1}, ${2})",
        "TO_INT": "TO_INT(${1})",
        "TO_FLOAT": "TO_FLOAT(${1})",
        "TO_STR": "TO_STR(${1})",
        "IS_NUMBER": "IS_NUMBER(${1})",
        "IS_STRING": "IS_STRING(${1})",
        "IS_LIST": "IS_LIST(${1})",
        "IS_FUNCTION": "IS_FUNCTION(${1})",
        "CLEAR": "CLEAR()"
    },
    variables: new Set()
}

function setupAutoPairs(enabled) {
    if (enabled) {
        editor.commands.addCommand({
            name: 'insertParenthesis',
            bindKey: '(',
            exec: function(editor) {
                editor.insert('()');
                editor.navigateLeft();
            }
        });

        editor.commands.addCommand({
            name: 'insertBracket',
            bindKey: '[',
            exec: function(editor) {
                editor.insert('[]');
                editor.navigateLeft();
            }
        });

        editor.commands.addCommand({
            name: 'insertBrace',
            bindKey: '{',
            exec: function(editor) {
                editor.insert('{}');
                editor.navigateLeft();
            }
        });

        editor.commands.addCommand({
            name: 'insertQuote',
            bindKey: '"',
            exec: function(editor) {
                editor.insert('""');
                editor.navigateLeft();
            }
        });
    } else {
        editor.commands.removeCommand('insertParenthesis');
        editor.commands.removeCommand('insertBracket');
        editor.commands.removeCommand('insertBrace');
        editor.commands.removeCommand('insertQuote');
    }
}

const lumenlangCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
        const completionList = [];
        
        completions.keywords.forEach(keyword => {
            completionList.push({
                caption: keyword,
                value: keyword,
                meta: "keyword",
                score: 1000,
                type: "keyword"
            });
        });

        Object.entries(completions.snippets).forEach(([name, snippet]) => {
            completionList.push({
                caption: name,
                value: snippet,
                meta: "snippet",
                score: 900,
                type: "snippet"
            });
        });
        completions.variables.forEach(variable => {
            completionList.push({
                caption: variable,
                value: variable,
                meta: "variable",
                score: 800,
                type: "variable"
            });
        });

        callback(null, completionList);
    }
};

function setupAutoComplete(enabled) {
    editor.setOptions({
        enableBasicAutocompletion: enabled,
        enableLiveAutocompletion: enabled
    });
    if (enabled) {
        editor.completers = [lumenlangCompleter];
    } else {
        editor.completers = [];
    }
}

function setupSuggestions(enabled) {
    editor.setOptions({
        enableSnippets: enabled
    });
    if (editor.getOption('enableBasicAutocompletion') || editor.getOption('enableLiveAutocompletion')) {
        editor.completers = [lumenlangCompleter];
    }
}

document.getElementById('autoCompleteSelect').addEventListener('change', (e) => {
    const enabled = e.target.value === 'true';
    setupAutoComplete(enabled);
    saveSettings({ auto_complete: enabled });
});

document.getElementById('autoPairsSelect').addEventListener('change', (e) => {
    const enabled = e.target.value === 'true';
    setupAutoPairs(enabled);
    saveSettings({ auto_pairs: enabled });
});

document.getElementById('suggestionsSelect').addEventListener('change', (e) => {
    const enabled = e.target.value === 'true';
    setupSuggestions(enabled);
    saveSettings({ suggestions: enabled });
});

editor.getSession().on('change', function() {
    const content = editor.getValue();
    const setMatches = content.match(/SET\s+([a-zA-Z_]\w*)/g);
    if (setMatches) {
        setMatches.forEach(match => {
            const varName = match.replace('SET ', '').trim();
            completions.variables.add(varName);
        });
    }
});

editor.session.setMode("ace/mode/lumen");
setupAutoComplete(true);

const consoleContainer = document.querySelector('.console-container');
const consoleInput = document.createElement('div');
consoleInput.className = 'console-input';
consoleInput.style.display = 'none';
consoleInput.innerHTML = `
    <span class="input-prompt">&gt;</span>
    <input type="text" class="console-input-field" />
`;
consoleContainer.appendChild(consoleInput);

const inputField = consoleInput.querySelector('.console-input-field');

inputField.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const text = inputField.value;
        console.innerHTML += text + '\n';
        try {
            await window.electron.ipcRenderer.invoke('console-input', text);
        } catch (error) {
            console.innerHTML += `Error: ${error.message}\n`;
        }
        inputField.value = '';
        consoleInput.style.display = 'none';
        console.scrollTop = console.scrollHeight;
    }
});

window.electron.ipcRenderer.on('input-requested', () => {
    consoleInput.style.display = 'block';
    inputField.focus();
});

let highlights = {};

async function loadHighlights() {
    try {
        highlights = await window.electron.ipcRenderer.invoke('load-highlights');
        if (highlights.error) {
            console.error('Error loading highlights:', highlights.error);
            return;
        }
        
        const highlightSelect = document.getElementById('highlightSelect');
        highlightSelect.innerHTML = '';
        
        Object.keys(highlights).forEach(highlightName => {
            const option = document.createElement('option');
            option.value = highlightName;
            option.textContent = highlightName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            highlightSelect.appendChild(option);
        });
        
        const settings = await window.electron.ipcRenderer.invoke('load-settings');
        const highlightName = settings?.highlight || 'lumen';
        if (highlights[highlightName]) {
            applyHighlight(highlightName);
            highlightSelect.value = highlightName;
        }
    } catch (error) {
        console.error('Error initializing highlights:', error);
    }
}

function applyHighlight(highlightName) {
    const highlight = highlights[highlightName];
    if (!highlight) return;

    let styleEl = document.getElementById('highlight-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'highlight-styles';
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
        .ace_keyword { color: ${highlight.rules.keyword} !important; }
        .ace_constant.ace_language { color: ${highlight.rules["constant.language"]} !important; }
        .ace_string { color: ${highlight.rules.string} !important; }
        .ace_variable { color: ${highlight.rules.variable} !important; }
        .ace_string.ace_escaped { color: ${highlight.rules["string.escaped"]} !important; }
        .ace_constant.ace_numeric { color: ${highlight.rules.numeric} !important; }
        .ace_comment { color: ${highlight.rules.comment} !important; }
        .ace_keyword.ace_operator { color: ${highlight.rules.operator} !important; }
        .ace_support.ace_function { color: ${highlight.rules.function} !important; }
    `;
}

document.getElementById('highlightSelect').addEventListener('change', async (e) => {
    const highlightName = e.target.value;
    if (highlights[highlightName]) {
        applyHighlight(highlightName);
        saveSettings({ highlight: highlightName });
    }
});

loadHighlights();
