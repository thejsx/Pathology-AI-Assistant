import os
import io
from pathlib import Path
from typing import Optional
import pathspec  

def load_gitignore(root: Path) -> Optional[pathspec.PathSpec]:
    """Compile a PathSpec from .gitignore, ignoring blank lines & comments."""
    gi = root / '.gitignore'
    if not gi.exists():
        return None

    cleaned: list[str] = []
    for raw in gi.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue  # skip comments / empty lines which would match *everything*
        print(line)
        cleaned.append(line)

    return pathspec.PathSpec.from_lines('gitwildmatch', cleaned) if cleaned else None

a = load_gitignore(Path('.')) 
print(a)