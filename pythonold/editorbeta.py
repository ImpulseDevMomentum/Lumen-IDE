# NOT TESTED STUFF, PLEASE USE WITH MIND


import tkinter as tk
from tkinter import filedialog, messagebox, ttk, simpledialog
from tkinter.scrolledtext import ScrolledText
import os
import logging
import importlib.util
import sys
import threading
import queue
import json
import re
from tkinter.font import Font

THEMES = {
    "dark": {
        "bg": "#282c34",
        "fg": "#abb2bf",
        "selected_bg": "#3e4451",
        "selected_fg": "#ffffff",
        "console_bg": "#21252b",
        "console_fg": "#98c379",
        "syntax_colors": {
            "keywords": "#c678dd",    
            "strings": "#98c379",     
            "numbers": "#d19a66",     
            "comments": "#5c6370",    
            "operators": "#56b6c2",
        }
    },
    "light": {
        "bg": "#ffffff",
        "fg": "#383a42",
        "selected_bg": "#e5e5e6",
        "selected_fg": "#000000",
        "console_bg": "#f0f0f0",
        "console_fg": "#383a42",
        "syntax_colors": {
            "keywords": "#a626a4",
            "strings": "#50a14f",
            "numbers": "#986801",
            "comments": "#a0a1a7",
            "operators": "#0184bc",
        }
    },
    "purple_haze": {
        "bg": "#2e1a47",
        "fg": "#d1bfe2",
        "selected_bg": "#4a2975",
        "selected_fg": "#e3d0f3",
        "console_bg": "#27163a",
        "console_fg": "#b39dd8",
        "syntax_colors": {
            "keywords": "#b084cc",    
            "strings": "#d5a6e0",     
            "numbers": "#c89ee5",     
            "comments": "#6e4b81",    
            "operators": "#a75f9b",
        }
    },
    "lavender_dream": {
        "bg": "#352c61",
        "fg": "#c9b1e1",
        "selected_bg": "#5a478a",
        "selected_fg": "#e4d4f7",
        "console_bg": "#2a2149",
        "console_fg": "#9b87cc",
        "syntax_colors": {
            "keywords": "#8c72b9",    
            "strings": "#b78dcb",     
            "numbers": "#aa80c6",     
            "comments": "#5d4a82",    
            "operators": "#7d6cbb",
        }
    },
    "violet_twilight": {
        "bg": "#251a40",
        "fg": "#b197cf",
        "selected_bg": "#42306d",
        "selected_fg": "#d6c1e8",
        "console_bg": "#1f1433",
        "console_fg": "#9f82bc",
        "syntax_colors": {
            "keywords": "#875eb0",    
            "strings": "#aa71c8",     
            "numbers": "#9257b1",     
            "comments": "#6c4a92",    
            "operators": "#7a5da5",
        }
    }
}

KEYWORDS = [
    "SET", "ELSE", "PRINT", "IF", "THEN", "OTHER", "STOP", "FOR", "TO", "STEP", "NEXT",
    "WHILE", "DO", "INPUT", "INPUT_INT", "AND", "OR", "NOT", "FUNC", "BACK", "BREAK"
]

class SyntaxHighlighter:
    def __init__(self, text_widget, theme):
        self.text = text_widget
        self.theme = theme
        
        for tag, color in theme["syntax_colors"].items():
            self.text.tag_configure(tag, foreground=color)
            
    def highlight(self, event=None):
        for tag in self.theme["syntax_colors"]:
            self.text.tag_remove(tag, "1.0", "end")
            
        for keyword in KEYWORDS:
            start = "1.0"
            while True:
                start = self.text.search(r'\m' + keyword + r'\M', start, "end", regexp=True)
                if not start:
                    break
                end = f"{start}+{len(keyword)}c"
                self.text.tag_add("keywords", start, end)
                start = end
                
        start = "1.0"
        while True:
            start = self.text.search(r'"[^"]*"', start, "end", regexp=True)
            if not start:
                break
            content = self.text.get(start, self.text.index(f"{start} lineend"))
            match = re.match(r'"[^"]*"', content)
            if match:
                end = f"{start}+{len(match.group(0))}c"
                self.text.tag_add("strings", start, end)
                start = end
            else:
                break
                
        start = "1.0"
        while True:
            start = self.text.search(r'\m\d+\M', start, "end", regexp=True)
            if not start:
                break
            end = f"{start}+{self.text.get(start, 'end').split()[0].__len__()}c"
            self.text.tag_add("numbers", start, end)
            start = end

class ConsoleIO:
    def __init__(self, console_widget):
        self.console = console_widget
        self.input_queue = queue.Queue()
        self.console.bind('<Return>', self.handle_input)
        self.waiting_for_input = False
        
    def write(self, text):
        self.console.configure(state='normal')
        self.console.insert(tk.END, str(text))
        self.console.see(tk.END)
        self.console.configure(state='disabled')
        
    def flush(self):
        pass
        
    def readline(self):
        self.waiting_for_input = True
        self.console.configure(state='normal')
        self.write("> ")
        self.console.configure(state='normal')
        try:
            return self.input_queue.get()
        finally:
            self.waiting_for_input = False
            
    def handle_input(self, event):
        if not self.waiting_for_input:
            return
        
        self.console.configure(state='normal')
        line_start = self.console.get("end-1c linestart", "end-1c")
        user_input = line_start.replace("> ", "") + "\n"
        
        self.input_queue.put(user_input)
        self.console.insert(tk.END, "\n")
        self.console.configure(state='disabled')
        return "break"

class LumenEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Lumen IDE")
        
        self.load_settings()
        
        self.setup_ui()
        self.setup_logger()
        self.file_path = None
        self.running = False
        
        self.root.state('zoomed')

    def load_settings(self):
        self.settings_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.json")
        try:
            with open(self.settings_file, "r") as f:
                self.settings = json.load(f)
        except:
            self.settings = {
                "theme": "dark",
                "font_size": 12,
                "font_family": "Consolas"
            }
            self.save_settings()

    def save_settings(self):
        with open(self.settings_file, "w") as f:
            json.dump(self.settings, f)
        
    def setup_ui(self):
        self.style = ttk.Style()

        self.paned = ttk.PanedWindow(self.root, orient=tk.VERTICAL)
        self.paned.pack(fill=tk.BOTH, expand=True)
        
        self.toolbar = ttk.Frame(self.root)
        self.toolbar.pack(fill=tk.X, padx=5, pady=2)
        
        ttk.Label(self.toolbar, text="Theme:").pack(side=tk.LEFT, padx=5)
        self.theme_var = tk.StringVar(value=self.settings["theme"])
        theme_combo = ttk.Combobox(self.toolbar, textvariable=self.theme_var, values=list(THEMES.keys()), width=10, state='readonly')
        theme_combo.pack(side=tk.LEFT, padx=5)
        theme_combo.bind('<<ComboboxSelected>>', self.change_theme)
        
        ttk.Label(self.toolbar, text="Font Size:").pack(side=tk.LEFT, padx=5)
        self.font_size_var = tk.StringVar(value=str(self.settings["font_size"]))
        font_size_combo = ttk.Combobox(self.toolbar, textvariable=self.font_size_var, values=[str(i) for i in range(8, 25)], width=5, state='readonly')
        font_size_combo.pack(side=tk.LEFT, padx=5)
        font_size_combo.bind('<<ComboboxSelected>>', self.change_font_size)
        
        editor_frame = ttk.Frame(self.paned)
        self.paned.add(editor_frame, weight=3)
        
        console_frame = ttk.Frame(self.paned)
        self.paned.add(console_frame, weight=1)
        
        self.menu = tk.Menu(self.root)
        self.root.config(menu=self.menu)
        
        file_menu = tk.Menu(self.menu, tearoff=0)
        file_menu.add_command(label="New", command=self.new_file, accelerator="Ctrl+N")
        file_menu.add_command(label="Open", command=self.open_file, accelerator="Ctrl+O")
        file_menu.add_command(label="Save", command=self.save_file, accelerator="Ctrl+S")
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)
        self.menu.add_cascade(label="File", menu=file_menu)

        edit_menu = tk.Menu(self.menu, tearoff=0)
        edit_menu.add_command(label="Undo", command=lambda: self.text_editor.edit_undo(), accelerator="Ctrl+Z")
        edit_menu.add_command(label="Redo", command=lambda: self.text_editor.edit_redo(), accelerator="Ctrl+Y")
        edit_menu.add_command(label="Find", command=self.find_text, accelerator="Ctrl+F")
        edit_menu.add_command(label="Replace", command=self.replace_text, accelerator="Ctrl+H")
        self.menu.add_cascade(label="Edit", menu=edit_menu)

        run_menu = tk.Menu(self.menu, tearoff=0)
        run_menu.add_command(label="Run", command=self.run_code, accelerator="F5")
        run_menu.add_command(label="Stop", command=self.stop_code, accelerator="F6")
        self.menu.add_cascade(label="Run", menu=run_menu)

        self.text_editor = ScrolledText(editor_frame, wrap=tk.WORD, undo=True)
        self.text_editor.pack(fill=tk.BOTH, expand=True)
        
        self.highlighter = SyntaxHighlighter(self.text_editor, THEMES[self.settings["theme"]])
        self.text_editor.bind('<KeyRelease>', self.highlighter.highlight)

        self.console = ScrolledText(console_frame, wrap=tk.WORD, height=10)
        self.console.pack(fill=tk.BOTH, expand=True)
        self.console.configure(state='disabled')
        
        self.console_io = ConsoleIO(self.console)
        
        self.apply_theme()
        
        self.root.bind('<Control-n>', lambda e: self.new_file())
        self.root.bind('<Control-o>', lambda e: self.open_file())
        self.root.bind('<Control-s>', lambda e: self.save_file())
        self.root.bind('<Control-z>', lambda e: self.text_editor.edit_undo())
        self.root.bind('<Control-y>', lambda e: self.text_editor.edit_redo())
        self.root.bind('<Control-f>', lambda e: self.find_text())
        self.root.bind('<Control-h>', lambda e: self.replace_text())
        self.root.bind('<F5>', lambda e: self.run_code())
        self.root.bind('<F6>', lambda e: self.stop_code())

    def find_text(self):
        find_string = simpledialog.askstring("Find", "Enter text to find:")
        if find_string:
            start_pos = "1.0"
            while True:
                start_pos = self.text_editor.search(find_string, start_pos, stopindex=tk.END)
                if not start_pos:
                    break
                end_pos = f"{start_pos}+{len(find_string)}c"
                self.text_editor.tag_add("highlight", start_pos, end_pos)
                start_pos = end_pos
            self.text_editor.tag_config("highlight", background="yellow", foreground="black")

    def replace_text(self):
        replace_popup = tk.Toplevel(self.root)
        replace_popup.title("Find and Replace")
        tk.Label(replace_popup, text="Find:").grid(row=0, column=0, padx=5, pady=5)
        find_entry = tk.Entry(replace_popup)
        find_entry.grid(row=0, column=1, padx=5, pady=5)
        tk.Label(replace_popup, text="Replace:").grid(row=1, column=0, padx=5, pady=5)
        replace_entry = tk.Entry(replace_popup)
        replace_entry.grid(row=1, column=1, padx=5, pady=5)
        
        def replace_all():
            find_string = find_entry.get()
            replace_string = replace_entry.get()
            content = self.text_editor.get("1.0", tk.END)
            new_content = content.replace(find_string, replace_string)
            self.text_editor.delete("1.0", tk.END)
            self.text_editor.insert("1.0", new_content)
            replace_popup.destroy()
        
        tk.Button(replace_popup, text="Replace All", command=replace_all).grid(row=2, column=1, padx=5, pady=5)

    def apply_theme(self):
        theme = THEMES[self.settings["theme"]]
        
        self.style.configure("TFrame", background=theme["bg"])
        self.style.configure("TLabel", background=theme["bg"], foreground=theme["fg"])
        self.style.configure("TButton", background=theme["bg"], foreground=theme["fg"])
        
        font = Font(family=self.settings["font_family"], size=self.settings["font_size"])
        
        self.text_editor.configure(
            bg=theme["bg"],
            fg=theme["fg"],
            insertbackground=theme["fg"],
            selectbackground=theme["selected_bg"],
            selectforeground=theme["selected_fg"],
            font=font
        )
        
        self.console.configure(
            bg=theme["console_bg"],
            fg=theme["console_fg"],
            insertbackground=theme["console_fg"],
            selectbackground=theme["selected_bg"],
            selectforeground=theme["selected_fg"],
            font=font
        )

    def change_theme(self, event=None):
        self.settings["theme"] = self.theme_var.get()
        self.save_settings()
        self.apply_theme()
        
    def change_font_size(self, event=None):
        try:
            size = int(self.font_size_var.get())
            self.settings["font_size"] = size
            self.save_settings()
            self.apply_theme()
        except ValueError:
            pass

    def setup_logger(self):
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
        os.makedirs(log_dir, exist_ok=True)
        logging.basicConfig(
            filename=os.path.join(log_dir, "lumen.log"),
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    def new_file(self):
        self.file_path = None
        self.text_editor.delete(1.0, tk.END)

    def open_file(self):
        try:
            file_path = filedialog.askopenfilename(
                filetypes=[("Lumen Files", "*.lum"), ("All Files", "*.*")]
            )
            if file_path:
                with open(file_path, "r", encoding='utf-8') as file:
                    self.file_path = file_path
                    self.text_editor.delete(1.0, tk.END)
                    self.text_editor.insert(tk.END, file.read())
        except Exception as e:
            logging.error(f"Error opening file: {str(e)}")
            messagebox.showerror("Error", f"Could not open file: {str(e)}")

    def save_file(self):
        try:
            if not self.file_path:
                file_path = filedialog.asksaveasfilename(
                    defaultextension=".lum",
                    filetypes=[("Lumen Files", "*.lum"), ("All Files", "*.*")]
                )
                if not file_path:
                    return
                self.file_path = file_path
            
            with open(self.file_path, "w", encoding='utf-8') as file:
                file.write(self.text_editor.get(1.0, tk.END).strip())
        except Exception as e:
            logging.error(f"Error saving file: {str(e)}")
            messagebox.showerror("Error", f"Could not save file: {str(e)}")

    def run_code(self):
        if self.running:
            messagebox.showwarning("Warning", "Code is already running")
            return
            
        if not self.file_path:
            messagebox.showerror("Error", "Please save your file before running.")
            return

        try:
            self.save_file()
            
            self.console.configure(state='normal')
            self.console.delete(1.0, tk.END)
            self.console.configure(state='disabled')
            
            self.running = True
            self.run_thread = threading.Thread(target=self._run_program)
            self.run_thread.daemon = True
            self.run_thread.start()

        except Exception as e:
            logging.error(f"Runtime error: {str(e)}")
            messagebox.showerror("Error", f"Runtime error: {str(e)}")
            self.running = False

    def stop_code(self):
        if self.running:
            self.running = False
            self.console_io.input_queue.put("\n")
            self.console.configure(state='normal')
            self.console.insert(tk.END, "\n--- Program stopped ---\n")
            self.console.configure(state='disabled')


    def _run_program(self):
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            shell_path = os.path.join(script_dir, "shell.py")
            
            if not os.path.exists(shell_path):
                raise FileNotFoundError(f"shell.py not found at: {shell_path}")

            old_stdout = sys.stdout
            old_stdin = sys.stdin
            
            sys.stdout = self.console_io
            sys.stdin = self.console_io
            
            try:
                spec = importlib.util.spec_from_file_location("shell", shell_path)
                shell_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(shell_module)
                
                shell_module.RUN(self.file_path)
                
            finally:
                sys.stdout = old_stdout
                sys.stdin = old_stdin
                
                self.console.configure(state='normal')
                self.console.insert(tk.END, "\n--- Program finished ---\n")
                self.console.configure(state='disabled')
                self.running = False
                
        except Exception as e:
            self.console.configure(state='normal')
            self.console.insert(tk.END, f"\nError: {str(e)}\n")
            self.console.configure(state='disabled')
            logging.error(f"Runtime error: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    editor = LumenEditor(root)
    root.mainloop()