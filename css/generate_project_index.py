#!/usr/bin/env python3
"""Génère PROJECT_INDEX.md et PROJECT_INDEX.json pour le projet courant."""
from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

IGNORED_DIRS = {
    ".git", ".godot", ".import", ".venv", "venv", "env", "__pycache__",
    "node_modules", "build", "dist", ".cache", ".idea", ".vscode",
}
IGNORED_FILES = {"PROJECT_INDEX.md", "PROJECT_INDEX.json"}
TEXT_EXTENSIONS = {
    ".gd", ".tscn", ".tres", ".godot", ".cfg", ".ini", ".json", ".md",
    ".txt", ".csv", ".xml", ".yaml", ".yml", ".toml", ".py", ".js",
    ".ts", ".html", ".css", ".shader", ".gdshader", ".glsl", ".h",
    ".hpp", ".c", ".cpp", ".cs", ".java", ".kt", ".swift", ".rs",
    ".go", ".lua", ".sh", ".bat", ".ps1",
}
ASSET_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".svg", ".gif", ".wav",
    ".ogg", ".mp3", ".flac", ".m4a", ".glb", ".gltf", ".fbx", ".obj",
    ".dae", ".blend", ".ttf", ".otf", ".woff", ".woff2", ".zip", ".7z", ".rar",
}

@dataclass
class GDScriptInfo:
    extends: str | None = None
    class_name: str | None = None
    functions: list[str] = field(default_factory=list)
    signals: list[str] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)

@dataclass
class SceneInfo:
    scripts: list[str] = field(default_factory=list)
    resources: list[str] = field(default_factory=list)
    node_count: int = 0

@dataclass
class FileInfo:
    path: str
    name: str
    extension: str
    size_bytes: int
    size_human: str
    modified_utc: str
    line_count: int | None
    category: str
    gdscript: GDScriptInfo | None = None
    scene: SceneInfo | None = None


def human_size(size: int) -> str:
    units = ["o", "Ko", "Mo", "Go", "To"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{int(value)} {unit}" if unit == "o" else f"{value:.2f} {unit}"
        value /= 1024
    return f"{size} o"


def safe_read_text(path: Path) -> str | None:
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
        except OSError:
            return None
    return None


def count_lines(text: str) -> int:
    return 0 if not text else text.count("\n") + (0 if text.endswith("\n") else 1)


def normalize_resource_path(value: str) -> str:
    value = value.strip().strip('"').strip("'")
    return value[6:] if value.startswith("res://") else value


def extract_gdscript_info(text: str) -> GDScriptInfo:
    info = GDScriptInfo()
    match = re.search(r"^\s*extends\s+([^\n#]+)", text, re.MULTILINE)
    if match:
        info.extends = match.group(1).strip()
    match = re.search(r"^\s*class_name\s+([A-Za-z_]\w*)", text, re.MULTILINE)
    if match:
        info.class_name = match.group(1)
    info.functions = sorted(set(re.findall(r"^\s*func\s+([A-Za-z_]\w*)\s*\(", text, re.MULTILINE)))
    info.signals = sorted(set(re.findall(r"^\s*signal\s+([A-Za-z_]\w*)", text, re.MULTILINE)))
    info.exports = sorted(set(re.findall(
        r"^\s*@export(?:_[A-Za-z_]\w*)?(?:\([^)]*\))?\s+var\s+([A-Za-z_]\w*)",
        text, re.MULTILINE,
    )))
    deps = re.findall(r"\b(?:preload|load)\s*\(\s*[\"']([^\"']+)[\"']\s*\)", text)
    info.dependencies = sorted(set(normalize_resource_path(dep) for dep in deps))
    return info


def extract_scene_info(text: str) -> SceneInfo:
    info = SceneInfo()
    pattern = r'^\[ext_resource\s+type="([^"]+)"\s+path="([^"]+)"\s+id="([^"]+)"\]'
    for resource_type, resource_path, _ in re.findall(pattern, text, re.MULTILINE):
        normalized = normalize_resource_path(resource_path)
        info.resources.append(normalized)
        if resource_type == "Script" or normalized.endswith(".gd"):
            info.scripts.append(normalized)
    info.node_count = len(re.findall(r"^\[node\b", text, re.MULTILINE))
    info.resources = sorted(set(info.resources))
    info.scripts = sorted(set(info.scripts))
    return info


def categorize(extension: str) -> str:
    if extension == ".gd": return "Script Godot"
    if extension == ".tscn": return "Scène Godot"
    if extension == ".tres": return "Ressource Godot"
    if extension in ASSET_EXTENSIONS: return "Asset"
    if extension in TEXT_EXTENSIONS: return "Texte / Code"
    if not extension: return "Sans extension"
    return "Autre"


def inspect_file(path: Path, root: Path) -> FileInfo:
    stat = path.stat()
    ext = path.suffix.lower()
    rel = path.relative_to(root).as_posix()
    text = safe_read_text(path) if ext in TEXT_EXTENSIONS else None
    return FileInfo(
        path=rel,
        name=path.name,
        extension=ext,
        size_bytes=stat.st_size,
        size_human=human_size(stat.st_size),
        modified_utc=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(timespec="seconds"),
        line_count=count_lines(text) if text is not None else None,
        category=categorize(ext),
        gdscript=extract_gdscript_info(text) if ext == ".gd" and text is not None else None,
        scene=extract_scene_info(text) if ext == ".tscn" and text is not None else None,
    )


def scan_project(root: Path) -> list[FileInfo]:
    files: list[FileInfo] = []
    for current_root, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORED_DIRS)
        current = Path(current_root)
        for filename in sorted(filenames):
            if filename in IGNORED_FILES:
                continue
            path = current / filename
            try:
                files.append(inspect_file(path, root))
            except (OSError, ValueError) as exc:
                print(f"[AVERTISSEMENT] {path}: {exc}")
    return sorted(files, key=lambda item: item.path.lower())


def build_summary(files: list[FileInfo]) -> dict[str, Any]:
    by_category: dict[str, int] = {}
    by_extension: dict[str, int] = {}
    total_size = total_lines = 0
    for item in files:
        total_size += item.size_bytes
        total_lines += item.line_count or 0
        by_category[item.category] = by_category.get(item.category, 0) + 1
        key = item.extension or "(sans extension)"
        by_extension[key] = by_extension.get(key, 0) + 1
    return {
        "file_count": len(files),
        "total_size_bytes": total_size,
        "total_size_human": human_size(total_size),
        "total_text_lines": total_lines,
        "by_category": dict(sorted(by_category.items())),
        "by_extension": dict(sorted(by_extension.items(), key=lambda p: (-p[1], p[0]))),
    }


def make_tree(paths: list[str]) -> str:
    tree: dict[str, Any] = {}
    for path in paths:
        current = tree
        for part in path.split("/"):
            current = current.setdefault(part, {})
    lines: list[str] = []
    def walk(node: dict[str, Any], prefix: str = "") -> None:
        entries = sorted(node.items(), key=lambda p: (bool(p[1]), p[0].lower()))
        for index, (name, children) in enumerate(entries):
            last = index == len(entries) - 1
            lines.append(prefix + ("└── " if last else "├── ") + name)
            if children:
                walk(children, prefix + ("    " if last else "│   "))
    walk(tree)
    return "\n".join(lines)


def write_json(root: Path, files: list[FileInfo], summary: dict[str, Any]) -> Path:
    output = root / "PROJECT_INDEX.json"
    payload = {
        "generator": {"name": "generate_project_index.py", "version": "1.0", "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds")},
        "project": {"name": root.name, "root": str(root.resolve())},
        "summary": summary,
        "files": [asdict(item) for item in files],
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return output


def write_markdown(root: Path, files: list[FileInfo], summary: dict[str, Any]) -> Path:
    output = root / "PROJECT_INDEX.md"
    lines: list[str] = [
        f"# Index du projet — {root.name}", "",
        f"_Généré automatiquement le {datetime.now().astimezone().strftime('%d/%m/%Y à %H:%M:%S')}._", "",
        "## Résumé", "",
        f"- Fichiers : **{summary['file_count']}**",
        f"- Taille totale : **{summary['total_size_human']}**",
        f"- Lignes de texte/code : **{summary['total_text_lines']}**", "",
        "### Répartition par catégorie", "", "| Catégorie | Nombre |", "|---|---:|",
    ]
    for category, count in summary["by_category"].items():
        lines.append(f"| {category} | {count} |")
    lines += ["", "## Arborescence", "", "```text", root.name, make_tree([f.path for f in files]), "```", ""]

    gd_files = [f for f in files if f.gdscript]
    if gd_files:
        lines += ["## Scripts Godot", ""]
        for item in gd_files:
            gd = item.gdscript
            assert gd
            lines += [f"### `{item.path}`", "", f"- Taille : {item.size_human}", f"- Lignes : {item.line_count or 0}"]
            if gd.extends: lines.append(f"- Étend : `{gd.extends}`")
            if gd.class_name: lines.append(f"- Classe globale : `{gd.class_name}`")
            if gd.functions: lines.append("- Fonctions : " + ", ".join(f"`{n}()`" for n in gd.functions))
            if gd.signals: lines.append("- Signaux : " + ", ".join(f"`{n}`" for n in gd.signals))
            if gd.exports: lines.append("- Variables exportées : " + ", ".join(f"`{n}`" for n in gd.exports))
            if gd.dependencies:
                lines.append("- Dépendances :")
                lines.extend(f"  - `{dep}`" for dep in gd.dependencies)
            lines.append("")

    scene_files = [f for f in files if f.scene]
    if scene_files:
        lines += ["## Scènes Godot", ""]
        for item in scene_files:
            scene = item.scene
            assert scene
            lines += [f"### `{item.path}`", "", f"- Taille : {item.size_human}", f"- Nœuds détectés : {scene.node_count}"]
            if scene.scripts:
                lines.append("- Scripts :")
                lines.extend(f"  - `{p}`" for p in scene.scripts)
            if scene.resources:
                lines.append("- Ressources externes :")
                lines.extend(f"  - `{p}`" for p in scene.resources)
            lines.append("")

    lines += ["## Tous les fichiers", "", "| Chemin | Catégorie | Taille | Lignes |", "|---|---|---:|---:|"]
    for item in files:
        lines.append(f"| `{item.path}` | {item.category} | {item.size_human} | {'' if item.line_count is None else item.line_count} |")
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return output


def main() -> int:
    root = Path(__file__).resolve().parent
    print(f"Analyse du projet : {root}")
    files = scan_project(root)
    summary = build_summary(files)
    markdown_path = write_markdown(root, files, summary)
    json_path = write_json(root, files, summary)
    print("\nIndex généré avec succès :")
    print(f"- {markdown_path.name}\n- {json_path.name}")
    print(f"\n{summary['file_count']} fichiers analysés.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
