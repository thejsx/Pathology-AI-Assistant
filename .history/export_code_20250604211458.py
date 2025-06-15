#!/usr/bin/env python3
"""Walk the current directory tree, copy a directory map and file contents to clipboard.

Usage:
    python export_code.py
"""

import os
import pyperclip
import io

SKIP_DIRS = {'.git', '__pycache__', '.venv', 'venv'}


def print_tree(root, out):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel = os.path.relpath(dirpath, root)
        depth = 0 if rel == '.' else rel.count(os.sep) + 1
        indent = '    ' * depth
        name = os.path.basename(dirpath) if rel != '.' else '.'
        out.write(f"{indent}{name}/\n")
        for fname in sorted(filenames):
            out.write(f"{indent}    {fname}\n")


def print_contents(root, out):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            file_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(file_path, root)
            out.write(f"{'='*80}\nFile: {rel_path}\n{'='*80}\n")
            try:
                with open(file_path, encoding='utf-8') as f:
                    out.write(f.read())
            except (UnicodeDecodeError, PermissionError):
                out.write("[binary file skipped]\n")
            out.write("\n\n")


def main():
    root = os.getcwd()
    buffer = io.StringIO()
    buffer.write(f"Directory tree of {root}:\n\n")
    print_tree(root, buffer)
    buffer.write("\n\nContents of files:\n\n")
    print_contents(root, buffer)
    
    # Copy to clipboard
    pyperclip.copy(buffer.getvalue())
    print("📋 All content copied to clipboard!")


if __name__ == '__main__':
    main()
