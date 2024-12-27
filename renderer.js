const editor = ace.edit("editor")
editor.setTheme("ace/theme/monokai")
editor.setFontSize(14)

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
                    regex: "\\b(SET|ELSE|PRINT|IF|THEN|OTHER|STOP|FOR|TO|STEP|NEXT|WHILE|DO|INPUT|INPUT_INT|AND|OR|NOT|FUNC|BACK|BREAK|FLOAT|INT|STR|TRUE|FALSE|RANDOM_INT|RANDOM_FLOAT|RANDOM_CHOICE|FORMAT)\\b"
                },
                {
                    token: "constant.language",
                    regex: "\\b(NULL|TRUE|FALSE|MATH_PI|MATH_E|MATH_TAU)\\b"
                },
                {
                    token: ["string", "variable", "string"],
                    regex: '(".*?)({[^}]+})(.*?")',
                    merge: false
                },
                {
                    token: "string",
                    regex: '".*?"'
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
            ]
        };
    };
    oop.inherits(LumenHighlightRules, TextHighlightRules);
    exports.LumenHighlightRules = LumenHighlightRules;
});

editor.session.setMode("ace/mode/lumen");

const themes = {
    dark: {
        editorTheme: "ace/theme/monokai",
        background: "#282c34",
        foreground: "#abb2bf",
        consoleBackground: "#21252b",
        consoleForeground: "#98c379"
    },
    light: {
        editorTheme: "ace/theme/chrome",
        background: "#ffffff",
        foreground: "#383a42",
        consoleBackground: "#f0f0f0",
        consoleForeground: "#383a42"
    },
    github_dark: {
        editorTheme: "ace/theme/dracula",
        background: "#0d1117",
        foreground: "#c9d1d9",
        consoleBackground: "#161b22",
        consoleForeground: "#8b949e",
        menuBackground: "#161b22",
        menuForeground: "#c9d1d9"
    },
    midnight: {
        editorTheme: "ace/theme/cobalt",
        background: "#000C18",
        foreground: "#6688CC",
        consoleBackground: "#002240",
        consoleForeground: "#FFFFFF",
        menuBackground: "#002240",
        menuForeground: "#6688CC"
    },
    purple_haze: {
        editorTheme: "ace/theme/twilight",
        background: "#2e1a47",
        foreground: "#d1bfe2",
        consoleBackground: "#27163a",
        consoleForeground: "#b39dd8",
        menuBackground: "#2e1a47",
        menuForeground: "#d1bfe2"
    },
    lavender_dream: {
        editorTheme: "ace/theme/pastel_on_dark",
        background: "#352c61",
        foreground: "#c9b1e1",
        consoleBackground: "#2a2149",
        consoleForeground: "#9b87cc"
    },
    violet_twilight: {
        editorTheme: "ace/theme/merbivore_soft",
        background: "#251a40",
        foreground: "#b197cf",
        consoleBackground: "#1f1433",
        consoleForeground: "#9f82bc"
    }
};

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
    const theme = themes[themeName];
    
    editor.setTheme(theme.editorTheme);
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.foreground;
    
    const consoleEl = document.getElementById('console');
    const consoleContainer = document.querySelector('.console-container');
    
    consoleEl.style.backgroundColor = theme.consoleBackground;
    consoleEl.style.color = theme.consoleForeground;
    consoleContainer.style.backgroundColor = theme.consoleBackground;
    
    document.querySelector('.menu-bar').style.backgroundColor = theme.background;
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.style.backgroundColor = theme.background;
    });

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
            consoleInput.style.display = 'block';
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

editor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    fontSize: "14px"
});

editor.setTheme(themes.dark.editorTheme); 

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

async function newFile() {
    if (editor.getValue().trim() !== '') {
        if (confirm('Current file has unsaved changes. Create new file anyway?')) {
            editor.setValue('', -1);
            currentFilePath = null;
        }
    } else {
        editor.setValue('', -1);
        currentFilePath = null;
    }
}

async function saveFileAs() {
    currentFilePath = null;
    await saveFile();
}

function toggleConsole() {
    const consoleContainer = document.querySelector('.console-container');
    consoleContainer.style.display = consoleContainer.style.display === 'none' ? 'block' : 'none';
}

const completions = {
    keywords: [
        "SET", "IF", "THEN", "ELSE", "FOR", "TO", "STEP", "WHILE", "FUNC", 
        "PRINT", "INPUT", "INPUT_INT", "BREAK", "CONTINUE", "AND", "OR", "NOT"
    ],
    snippets: {
        "PRINT": "PRINT(${1})",
        "IF": "IF ${1} THEN\n    ${2}\nSTOP",
        "FOR": "FOR ${1} = ${2} TO ${3} THEN\n    ${4}\nSTOP",
        "WHILE": "WHILE ${1} THEN\n    ${2}\nSTOP",
        "FUNC": "FUNC ${1}(${2})\n    ${3}\nSTOP"
    },
    variables: new Set()
}

// Konfiguracja edytora
editor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
    showPrintMargin: false,
    fontSize: "14px"
});

function setupAutoPairs(enabled) {
    editor.off('change');
    
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

function setupAutoComplete(enabled) {
    editor.setOptions({
        enableBasicAutocompletion: enabled,
        enableLiveAutocompletion: enabled
    });
}

function setupSuggestions(enabled) {
    editor.setOptions({
        enableSnippets: enabled
    });
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

const lumenlangCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
        const completionList = [];
        
        completions.keywords.forEach(keyword => {
            completionList.push({
                caption: keyword,
                value: keyword,
                meta: "keyword",
                score: 100
            });
        });

        Object.entries(completions.snippets).forEach(([name, snippet]) => {
            completionList.push({
                caption: name,
                value: snippet,
                meta: "snippet",
                score: 90
            });
        });

        completions.variables.forEach(variable => {
            completionList.push({
                caption: variable,
                value: variable,
                meta: "variable",
                score: 80
            });
        });

        callback(null, completionList);
    }
};

editor.completers = [lumenlangCompleter];

editor.setBehavioursEnabled(true);
editor.getSession().setOption("useWorker", true);

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

editor.getSession().setOption("useWorker", true);
editor.session.setMode("ace/mode/lumen");
