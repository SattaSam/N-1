#!/usr/bin/env python3
"""
generate_project_index.py — Version 4.0

Indexeur de projet orienté Godot, conçu pour faciliter le travail avec une IA.

Génère :
- PROJECT_INDEX.md
- PROJECT_INDEX.json
- PROJECT_GRAPH.json
- PROJECT_AI_CONTEXT.md
- PROJECT_CHANGES.md
- PROJECT_AI_MEMORY.json

Fonctionnalités principales :
- scan récursif avec exclusions configurables ;
- analyse GDScript avancée ;
- analyse des scènes .tscn ;
- lecture de project.godot ;
- détection des autoloads, inputs et scène principale ;
- graphe des dépendances ;
- graphe approximatif des appels de fonctions ;
- regroupement automatique par systèmes ;
- détection des TODO / FIXME / BUG / HACK ;
- détection des fichiers volumineux et centraux ;
- suivi des changements entre deux générations ;
- cache local pour accélérer les analyses suivantes ;
- configuration facultative via project_index_config.json.

Aucune dépendance externe.
Compatible Python 3.10+.

Utilisation :
    python generate_project_index.py
    python generate_project_index.py --root "C:\\MonProjet"
    python generate_project_index.py --no-cache
    python generate_project_index.py --max-file-size-mb 10
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import traceback
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


VERSION = "4.0"

OUTPUT_FILES = {
    "PROJECT_INDEX.md",
    "PROJECT_INDEX.json",
    "PROJECT_GRAPH.json",
    "PROJECT_AI_CONTEXT.md",
    "PROJECT_CHANGES.md",
    "PROJECT_AI_MEMORY.json",
}

CACHE_FILE = ".project_index_cache.json"
CONFIG_FILE = "project_index_config.json"

DEFAULT_IGNORED_DIRS = {
    ".git", ".godot", ".import", ".venv", "venv", "env", "__pycache__",
    "node_modules", "build", "dist", ".cache", ".idea", ".vscode",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", "coverage", "tmp", "temp",
    "export", "exports", "bin", "obj",
}

DEFAULT_IGNORED_FILES = {
    *OUTPUT_FILES,
    CACHE_FILE,
}

TEXT_EXTENSIONS = {
    ".gd", ".tscn", ".tres", ".godot", ".cfg", ".ini", ".json", ".md",
    ".txt", ".csv", ".xml", ".yaml", ".yml", ".toml", ".py", ".js",
    ".ts", ".html", ".css", ".shader", ".gdshader", ".glsl", ".h",
    ".hpp", ".c", ".cpp", ".cs", ".java", ".kt", ".swift", ".rs",
    ".go", ".lua", ".sh", ".bat", ".ps1", ".po", ".translation",
}

ASSET_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".svg", ".gif", ".ico",
    ".wav", ".ogg", ".mp3", ".flac", ".m4a",
    ".glb", ".gltf", ".fbx", ".obj", ".dae", ".blend",
    ".ttf", ".otf", ".woff", ".woff2",
    ".zip", ".7z", ".rar",
    ".mp4", ".webm", ".mov",
}

SYSTEM_KEYWORDS = {
    "player": "PLAYER",
    "character": "PLAYER",
    "bluefox": "PLAYER",
    "avatar": "PLAYER",
    "camera": "CAMERA",
    "inventory": "INVENTORY",
    "item": "INVENTORY",
    "equipment": "INVENTORY",
    "resource": "RESOURCES",
    "collect": "RESOURCES",
    "harvest": "RESOURCES",
    "navigation": "NAVIGATION",
    "path": "NAVIGATION",
    "navmesh": "NAVIGATION",
    "agent": "NAVIGATION",
    "ai": "AI",
    "brain": "AI",
    "behavior": "AI",
    "autonomy": "AI",
    "mission": "MISSIONS",
    "quest": "MISSIONS",
    "objective": "MISSIONS",
    "journal": "JOURNAL",
    "dialog": "DIALOGUE",
    "dialogue": "DIALOGUE",
    "speech": "DIALOGUE",
    "save": "SAVE",
    "load": "SAVE",
    "persistence": "SAVE",
    "world": "WORLD",
    "map": "WORLD",
    "zone": "WORLD",
    "biome": "WORLD",
    "planet": "WORLD",
    "ui": "UI",
    "hud": "UI",
    "menu": "UI",
    "panel": "UI",
    "popup": "UI",
    "audio": "AUDIO",
    "sound": "AUDIO",
    "music": "AUDIO",
    "voice": "AUDIO",
    "animation": "ANIMATION",
    "anim": "ANIMATION",
    "input": "INPUT",
    "control": "INPUT",
    "interaction": "INTERACTION",
    "interact": "INTERACTION",
    "camera_input": "INPUT",
    "network": "NETWORK",
    "multiplayer": "NETWORK",
    "debug": "DEBUG",
    "test": "TESTS",
}


@dataclass
class FunctionInfo:
    name: str
    parameters: list[str] = field(default_factory=list)
    return_type: str | None = None
    line: int = 0
    end_line: int | None = None
    is_private: bool = False
    calls: list[str] = field(default_factory=list)


@dataclass
class VariableInfo:
    name: str
    type_hint: str | None = None
    default_value: str | None = None
    line: int = 0


@dataclass
class GDScriptInfo:
    extends: str | None = None
    class_name: str | None = None
    functions: list[FunctionInfo] = field(default_factory=list)
    signals: list[str] = field(default_factory=list)
    exports: list[VariableInfo] = field(default_factory=list)
    onready: list[VariableInfo] = field(default_factory=list)
    variables: list[VariableInfo] = field(default_factory=list)
    constants: list[VariableInfo] = field(default_factory=list)
    enums: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    node_paths: list[str] = field(default_factory=list)
    signal_connections: list[str] = field(default_factory=list)
    emitted_signals: list[str] = field(default_factory=list)
    groups: list[str] = field(default_factory=list)
    todos: list[str] = field(default_factory=list)
    comments_summary: list[str] = field(default_factory=list)


@dataclass
class SceneNode:
    name: str
    node_type: str | None = None
    parent: str | None = None
    instance: str | None = None
    script: str | None = None
    groups: list[str] = field(default_factory=list)


@dataclass
class SceneInfo:
    scripts: list[str] = field(default_factory=list)
    resources: list[str] = field(default_factory=list)
    nodes: list[SceneNode] = field(default_factory=list)
    root_node: str | None = None
    root_type: str | None = None
    connection_count: int = 0
    editable_instances: list[str] = field(default_factory=list)


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
    sha1_12: str
    cached: bool = False
    gdscript: GDScriptInfo | None = None
    scene: SceneInfo | None = None


@dataclass
class ProjectSettingsInfo:
    project_name: str | None = None
    main_scene: str | None = None
    rendering_method: str | None = None
    autoloads: dict[str, str] = field(default_factory=dict)
    input_actions: dict[str, list[str]] = field(default_factory=dict)
    features: list[str] = field(default_factory=list)
    raw_sections: list[str] = field(default_factory=list)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def human_size(size: int) -> str:
    units = ["o", "Ko", "Mo", "Go", "To"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{int(value)} {unit}" if unit == "o" else f"{value:.2f} {unit}"
        value /= 1024
    return f"{size} o"


def sha1_short(path: Path) -> str:
    digest = hashlib.sha1()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()[:12]
    except OSError:
        return ""


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


def clean_inline_value(value: str, limit: int = 120) -> str:
    value = re.sub(r"\s+", " ", value.strip())
    return value if len(value) <= limit else value[: limit - 3] + "..."


def split_parameters(raw: str) -> list[str]:
    if not raw.strip():
        return []

    params: list[str] = []
    depth = 0
    current: list[str] = []

    for char in raw:
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth = max(0, depth - 1)

        if char == "," and depth == 0:
            params.append("".join(current).strip())
            current = []
        else:
            current.append(char)

    if current:
        params.append("".join(current).strip())

    return [param for param in params if param]


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def parse_variable_match(match: re.Match[str], text: str) -> VariableInfo:
    name, type_hint, default_value = match.groups()
    return VariableInfo(
        name=name,
        type_hint=type_hint.strip() if type_hint else None,
        default_value=clean_inline_value(default_value) if default_value else None,
        line=line_number(text, match.start()),
    )


def extract_function_body_ranges(text: str, matches: list[re.Match[str]]) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        ranges.append((start, end))
    return ranges


def extract_calls(body: str, current_function: str) -> list[str]:
    candidates = re.findall(r"(?<![\w.])([A-Za-z_]\w*)\s*\(", body)
    ignored = {
        "if", "elif", "for", "while", "match", "assert", "return",
        "print", "prints", "printerr", "push_error", "push_warning",
        "range", "len", "min", "max", "abs", "round", "floor", "ceil",
        "str", "int", "float", "bool", "Array", "Dictionary", "Vector2",
        "Vector3", "Color", "NodePath", "StringName", "Callable",
        "preload", "load", "typeof", "is_instance_valid",
    }
    return sorted({
        name for name in candidates
        if name not in ignored and name != current_function
    })


def extract_gdscript_info(text: str) -> GDScriptInfo:
    info = GDScriptInfo()

    match = re.search(r"^\s*extends\s+([^\n#]+)", text, re.MULTILINE)
    if match:
        info.extends = match.group(1).strip()

    match = re.search(r"^\s*class_name\s+([A-Za-z_]\w*)", text, re.MULTILINE)
    if match:
        info.class_name = match.group(1)

    function_pattern = re.compile(
        r"^\s*func\s+([A-Za-z_]\w*)\s*\((.*?)\)\s*(?:->\s*([^:\n]+))?\s*:",
        re.MULTILINE,
    )
    function_matches = list(function_pattern.finditer(text))
    function_ranges = extract_function_body_ranges(text, function_matches)

    for index, function_match in enumerate(function_matches):
        name, raw_params, return_type = function_match.groups()
        body_start, body_end = function_ranges[index]
        body = text[body_start:body_end]

        info.functions.append(FunctionInfo(
            name=name,
            parameters=split_parameters(raw_params),
            return_type=return_type.strip() if return_type else None,
            line=line_number(text, function_match.start()),
            end_line=line_number(text, body_end),
            is_private=name.startswith("_"),
            calls=extract_calls(body, name),
        ))

    info.signals = sorted(set(re.findall(
        r"^\s*signal\s+([A-Za-z_]\w*)",
        text,
        re.MULTILINE,
    )))

    export_pattern = re.compile(
        r"^\s*@export(?:_[A-Za-z_]\w*)?(?:\([^)]*\))?\s+var\s+"
        r"([A-Za-z_]\w*)\s*(?::\s*([^=\n]+))?\s*(?:=\s*(.+))?$",
        re.MULTILINE,
    )
    info.exports = [parse_variable_match(match, text) for match in export_pattern.finditer(text)]

    onready_pattern = re.compile(
        r"^\s*@onready\s+var\s+([A-Za-z_]\w*)\s*"
        r"(?::\s*([^=\n]+))?\s*(?:=\s*(.+))?$",
        re.MULTILINE,
    )
    info.onready = [parse_variable_match(match, text) for match in onready_pattern.finditer(text)]

    const_pattern = re.compile(
        r"^\s*const\s+([A-Za-z_]\w*)\s*(?::\s*([^=\n]+))?\s*=\s*(.+)$",
        re.MULTILINE,
    )
    info.constants = [parse_variable_match(match, text) for match in const_pattern.finditer(text)]

    variable_pattern = re.compile(
        r"^\s*var\s+([A-Za-z_]\w*)\s*(?::\s*([^=\n]+))?\s*(?:=\s*(.+))?$",
        re.MULTILINE,
    )
    exported_names = {item.name for item in info.exports}
    onready_names = {item.name for item in info.onready}
    info.variables = [
        parse_variable_match(match, text)
        for match in variable_pattern.finditer(text)
        if match.group(1) not in exported_names and match.group(1) not in onready_names
    ]

    info.enums = [
        name if name else "(anonyme)"
        for name in re.findall(
            r"^\s*enum(?:\s+([A-Za-z_]\w*))?\s*\{",
            text,
            re.MULTILINE,
        )
    ]

    dependencies = re.findall(
        r"\b(?:preload|load)\s*\(\s*[\"']([^\"']+)[\"']\s*\)",
        text,
    )
    dependencies += re.findall(
        r"^\s*extends\s+[\"']([^\"']+)[\"']",
        text,
        re.MULTILINE,
    )
    info.dependencies = sorted(set(normalize_resource_path(dep) for dep in dependencies))

    node_paths = re.findall(r"(?:\$|%)([A-Za-z0-9_./:-]+)", text)
    node_paths += re.findall(
        r"get_node(?:_or_null)?\s*\(\s*[\"']([^\"']+)[\"']",
        text,
    )
    info.node_paths = sorted(set(node_paths))

    info.signal_connections = sorted(set(re.findall(
        r"\.([A-Za-z_]\w*)\.connect\s*\(",
        text,
    )))
    info.emitted_signals = sorted(set(re.findall(
        r"\bemit_signal\s*\(\s*[\"']([^\"']+)[\"']",
        text,
    )))
    info.emitted_signals += sorted(set(re.findall(
        r"\.([A-Za-z_]\w*)\.emit\s*\(",
        text,
    )))
    info.emitted_signals = sorted(set(info.emitted_signals))

    info.groups = sorted(set(re.findall(
        r"\badd_to_group\s*\(\s*[\"']([^\"']+)[\"']",
        text,
    )))

    todo_matches = re.findall(
        r"^\s*#\s*(TODO|FIXME|HACK|BUG)\s*:?\s*(.+)$",
        text,
        re.MULTILINE | re.IGNORECASE,
    )
    info.todos = [f"{kind.upper()}: {message.strip()}" for kind, message in todo_matches]

    comment_lines = re.findall(r"^\s*##?\s+(.+)$", text, re.MULTILINE)
    info.comments_summary = [
        clean_inline_value(line, 180)
        for line in comment_lines
        if not re.match(r"^(TODO|FIXME|HACK|BUG)\b", line, re.IGNORECASE)
    ][:12]

    return info


def extract_scene_info(text: str) -> SceneInfo:
    info = SceneInfo()
    resource_by_id: dict[str, str] = {}

    ext_resource_pattern = re.compile(
        r'^\[ext_resource\b([^\]]+)\]',
        re.MULTILINE,
    )
    for match in ext_resource_pattern.finditer(text):
        attributes = match.group(1)
        path_match = re.search(r'path="([^"]+)"', attributes)
        id_match = re.search(r'id="([^"]+)"', attributes)
        if not path_match or not id_match:
            continue

        normalized = normalize_resource_path(path_match.group(1))
        resource_by_id[id_match.group(1)] = normalized
        info.resources.append(normalized)
        if normalized.endswith(".gd"):
            info.scripts.append(normalized)

    node_pattern = re.compile(r"^\[node\s+([^\]]+)\]", re.MULTILINE)
    node_matches = list(node_pattern.finditer(text))

    for index, node_match in enumerate(node_matches):
        attributes = node_match.group(1)
        name_match = re.search(r'name="([^"]+)"', attributes)
        type_match = re.search(r'type="([^"]+)"', attributes)
        parent_match = re.search(r'parent="([^"]+)"', attributes)
        instance_match = re.search(r'instance=ExtResource\("([^"]+)"\)', attributes)
        groups_match = re.search(r'groups=\[([^\]]*)\]', attributes)

        groups: list[str] = []
        if groups_match:
            groups = re.findall(r'&?"([^"]+)"', groups_match.group(1))

        name = name_match.group(1) if name_match else "(sans nom)"
        node = SceneNode(
            name=name,
            node_type=type_match.group(1) if type_match else None,
            parent=parent_match.group(1) if parent_match else None,
            instance=resource_by_id.get(instance_match.group(1)) if instance_match else None,
            groups=groups,
        )

        body_start = node_match.end()
        body_end = node_matches[index + 1].start() if index + 1 < len(node_matches) else len(text)
        body = text[body_start:body_end]
        script_match = re.search(r"^\s*script\s*=\s*ExtResource\(\"([^\"]+)\"\)", body, re.MULTILINE)
        if script_match:
            node.script = resource_by_id.get(script_match.group(1))
            if node.script:
                info.scripts.append(node.script)

        info.nodes.append(node)

        if index == 0:
            info.root_node = name
            info.root_type = node.node_type

    info.connection_count = len(re.findall(r"^\[connection\b", text, re.MULTILINE))
    info.editable_instances = re.findall(
        r"^\[editable path=\"([^\"]+)\"\]",
        text,
        re.MULTILINE,
    )

    info.resources = sorted(set(info.resources))
    info.scripts = sorted(set(info.scripts))
    return info


def parse_project_settings(path: Path) -> ProjectSettingsInfo:
    info = ProjectSettingsInfo()
    text = safe_read_text(path)
    if text is None:
        return info

    info.raw_sections = re.findall(r"^\[([^\]]+)\]$", text, re.MULTILINE)

    match = re.search(r'^config/name="([^"]+)"', text, re.MULTILINE)
    if match:
        info.project_name = match.group(1)

    match = re.search(r'^run/main_scene="([^"]+)"', text, re.MULTILINE)
    if match:
        info.main_scene = normalize_resource_path(match.group(1))

    match = re.search(r'^renderer/rendering_method="([^"]+)"', text, re.MULTILINE)
    if match:
        info.rendering_method = match.group(1)

    features_match = re.search(r"^config/features=PackedStringArray\((.*?)\)", text, re.MULTILINE)
    if features_match:
        info.features = re.findall(r'"([^"]+)"', features_match.group(1))

    autoload_section = re.search(
        r"^\[autoload\]\s*(.*?)(?=^\[|\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if autoload_section:
        for name, raw_path in re.findall(
            r'^([A-Za-z_]\w*)="(\*?res://[^"]+)"',
            autoload_section.group(1),
            re.MULTILINE,
        ):
            info.autoloads[name] = normalize_resource_path(raw_path.lstrip("*"))

    input_section = re.search(
        r"^\[input\]\s*(.*?)(?=^\[|\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if input_section:
        action_starts = list(re.finditer(r'^([A-Za-z0-9_./-]+)=\{', input_section.group(1), re.MULTILINE))
        section_text = input_section.group(1)
        for index, action_match in enumerate(action_starts):
            action = action_match.group(1)
            start = action_match.end()
            end = action_starts[index + 1].start() if index + 1 < len(action_starts) else len(section_text)
            block = section_text[start:end]
            events = re.findall(r'"physical_keycode":\s*(\d+)', block)
            events += re.findall(r'"button_index":\s*(\d+)', block)
            info.input_actions[action] = events

    return info


def categorize(extension: str) -> str:
    if extension == ".gd":
        return "Script Godot"
    if extension == ".tscn":
        return "Scène Godot"
    if extension == ".tres":
        return "Ressource Godot"
    if extension == ".godot":
        return "Configuration Godot"
    if extension in ASSET_EXTENSIONS:
        return "Asset"
    if extension in TEXT_EXTENSIONS:
        return "Texte / Code"
    if not extension:
        return "Sans extension"
    return "Autre"


def load_config(root: Path) -> dict[str, Any]:
    path = root / CONFIG_FILE
    if not path.exists():
        return {}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError) as exc:
        print(f"[AVERTISSEMENT] Configuration ignorée : {exc}")
        return {}


def load_cache(root: Path) -> dict[str, Any]:
    path = root / CACHE_FILE
    if not path.exists():
        return {}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def save_cache(root: Path, files: list[FileInfo]) -> None:
    payload = {
        "version": VERSION,
        "generated_utc": utc_now(),
        "files": {
            item.path: {
                "size_bytes": item.size_bytes,
                "modified_utc": item.modified_utc,
                "sha1_12": item.sha1_12,
                "data": asdict(item),
            }
            for item in files
        },
    }
    (root / CACHE_FILE).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def file_from_cached_dict(data: dict[str, Any]) -> FileInfo:
    gdscript = data.get("gdscript")
    scene = data.get("scene")

    gd_obj: GDScriptInfo | None = None
    if gdscript:
        gd_obj = GDScriptInfo(
            extends=gdscript.get("extends"),
            class_name=gdscript.get("class_name"),
            functions=[FunctionInfo(**item) for item in gdscript.get("functions", [])],
            signals=gdscript.get("signals", []),
            exports=[VariableInfo(**item) for item in gdscript.get("exports", [])],
            onready=[VariableInfo(**item) for item in gdscript.get("onready", [])],
            variables=[VariableInfo(**item) for item in gdscript.get("variables", [])],
            constants=[VariableInfo(**item) for item in gdscript.get("constants", [])],
            enums=gdscript.get("enums", []),
            dependencies=gdscript.get("dependencies", []),
            node_paths=gdscript.get("node_paths", []),
            signal_connections=gdscript.get("signal_connections", []),
            emitted_signals=gdscript.get("emitted_signals", []),
            groups=gdscript.get("groups", []),
            todos=gdscript.get("todos", []),
            comments_summary=gdscript.get("comments_summary", []),
        )

    scene_obj: SceneInfo | None = None
    if scene:
        scene_obj = SceneInfo(
            scripts=scene.get("scripts", []),
            resources=scene.get("resources", []),
            nodes=[SceneNode(**item) for item in scene.get("nodes", [])],
            root_node=scene.get("root_node"),
            root_type=scene.get("root_type"),
            connection_count=scene.get("connection_count", 0),
            editable_instances=scene.get("editable_instances", []),
        )

    result = FileInfo(
        path=data["path"],
        name=data["name"],
        extension=data["extension"],
        size_bytes=data["size_bytes"],
        size_human=data["size_human"],
        modified_utc=data["modified_utc"],
        line_count=data.get("line_count"),
        category=data["category"],
        sha1_12=data.get("sha1_12", ""),
        cached=True,
        gdscript=gd_obj,
        scene=scene_obj,
    )
    return result


def inspect_file(
    path: Path,
    root: Path,
    max_file_size_bytes: int,
    cache: dict[str, Any],
    use_cache: bool,
) -> FileInfo:
    stat = path.stat()
    extension = path.suffix.lower()
    relative = path.relative_to(root).as_posix()
    modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(timespec="seconds")

    cached_entry = cache.get("files", {}).get(relative)
    if (
        use_cache
        and cached_entry
        and cached_entry.get("size_bytes") == stat.st_size
        and cached_entry.get("modified_utc") == modified
        and cached_entry.get("data")
    ):
        return file_from_cached_dict(cached_entry["data"])

    digest = sha1_short(path)
    text: str | None = None

    if extension in TEXT_EXTENSIONS and stat.st_size <= max_file_size_bytes:
        text = safe_read_text(path)

    return FileInfo(
        path=relative,
        name=path.name,
        extension=extension,
        size_bytes=stat.st_size,
        size_human=human_size(stat.st_size),
        modified_utc=modified,
        line_count=count_lines(text) if text is not None else None,
        category=categorize(extension),
        sha1_12=digest,
        cached=False,
        gdscript=extract_gdscript_info(text) if extension == ".gd" and text is not None else None,
        scene=extract_scene_info(text) if extension == ".tscn" and text is not None else None,
    )


def should_ignore_file(
    relative_path: str,
    filename: str,
    ignored_files: set[str],
    ignored_patterns: list[str],
) -> bool:
    if filename in ignored_files:
        return True

    normalized = relative_path.replace("\\", "/")
    return any(re.search(pattern, normalized) for pattern in ignored_patterns)


def scan_project(
    root: Path,
    ignored_dirs: set[str],
    ignored_files: set[str],
    ignored_patterns: list[str],
    max_file_size_bytes: int,
    cache: dict[str, Any],
    use_cache: bool,
) -> list[FileInfo]:
    files: list[FileInfo] = []

    for current_root, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            dirname
            for dirname in dirnames
            if dirname not in ignored_dirs
        )
        current = Path(current_root)

        for filename in sorted(filenames):
            path = current / filename
            relative = path.relative_to(root).as_posix()

            if should_ignore_file(relative, filename, ignored_files, ignored_patterns):
                continue

            try:
                files.append(
                    inspect_file(
                        path=path,
                        root=root,
                        max_file_size_bytes=max_file_size_bytes,
                        cache=cache,
                        use_cache=use_cache,
                    )
                )
            except (OSError, ValueError) as exc:
                print(f"[AVERTISSEMENT] {relative}: {exc}")

    return sorted(files, key=lambda item: item.path.lower())


def build_summary(files: list[FileInfo]) -> dict[str, Any]:
    categories = Counter(item.category for item in files)
    extensions = Counter(item.extension or "(sans extension)" for item in files)
    total_size = sum(item.size_bytes for item in files)
    total_lines = sum(item.line_count or 0 for item in files)

    gd_files = [item for item in files if item.gdscript]
    scene_files = [item for item in files if item.scene]
    todo_count = sum(len(item.gdscript.todos) for item in gd_files if item.gdscript)
    cached_count = sum(1 for item in files if item.cached)

    largest_files = sorted(files, key=lambda item: item.size_bytes, reverse=True)[:30]
    largest_scripts = sorted(
        gd_files,
        key=lambda item: item.line_count or 0,
        reverse=True,
    )[:30]

    return {
        "file_count": len(files),
        "script_count": len(gd_files),
        "scene_count": len(scene_files),
        "todo_count": todo_count,
        "cached_file_count": cached_count,
        "total_size_bytes": total_size,
        "total_size_human": human_size(total_size),
        "total_text_lines": total_lines,
        "by_category": dict(sorted(categories.items())),
        "by_extension": dict(sorted(
            extensions.items(),
            key=lambda pair: (-pair[1], pair[0]),
        )),
        "largest_files": [
            {
                "path": item.path,
                "size_bytes": item.size_bytes,
                "size_human": item.size_human,
            }
            for item in largest_files
        ],
        "largest_scripts": [
            {
                "path": item.path,
                "line_count": item.line_count or 0,
            }
            for item in largest_scripts
        ],
    }


def make_tree(paths: Iterable[str]) -> str:
    tree: dict[str, Any] = {}

    for path in paths:
        current = tree
        for part in path.split("/"):
            current = current.setdefault(part, {})

    lines: list[str] = []

    def walk(node: dict[str, Any], prefix: str = "") -> None:
        entries = sorted(
            node.items(),
            key=lambda pair: (not bool(pair[1]), pair[0].lower()),
        )
        for index, (name, children) in enumerate(entries):
            last = index == len(entries) - 1
            lines.append(prefix + ("└── " if last else "├── ") + name)
            if children:
                walk(children, prefix + ("    " if last else "│   "))

    walk(tree)
    return "\n".join(lines)


def resolve_dependency(
    dependency: str,
    source_path: str,
    known_paths: set[str],
) -> str | None:
    normalized = normalize_resource_path(dependency).replace("\\", "/")

    if normalized in known_paths:
        return normalized

    source_parent = Path(source_path).parent
    candidate = (source_parent / normalized).as_posix()
    candidate = str(Path(candidate)).replace("\\", "/")
    if candidate in known_paths:
        return candidate

    matches = [path for path in known_paths if path.endswith("/" + normalized) or path == normalized]
    if len(matches) == 1:
        return matches[0]

    return None


def build_graph(files: list[FileInfo], project: ProjectSettingsInfo) -> dict[str, Any]:
    known_paths = {item.path for item in files}
    outgoing: dict[str, set[str]] = defaultdict(set)
    incoming: dict[str, set[str]] = defaultdict(set)
    unresolved: dict[str, set[str]] = defaultdict(set)

    for item in files:
        dependencies: list[str] = []

        if item.gdscript:
            dependencies.extend(item.gdscript.dependencies)
        if item.scene:
            dependencies.extend(item.scene.resources)
            dependencies.extend(
                node.instance
                for node in item.scene.nodes
                if node.instance
            )

        for dependency in dependencies:
            resolved = resolve_dependency(dependency, item.path, known_paths)
            if resolved:
                outgoing[item.path].add(resolved)
                incoming[resolved].add(item.path)
            else:
                unresolved[item.path].add(normalize_resource_path(dependency))

    if project.main_scene and project.main_scene in known_paths:
        incoming[project.main_scene].add("[PROJECT_MAIN_SCENE]")

    for name, path in project.autoloads.items():
        if path in known_paths:
            incoming[path].add(f"[AUTOLOAD:{name}]")

    nodes = []
    for item in files:
        out_degree = len(outgoing[item.path])
        in_degree = len(incoming[item.path])
        line_weight = min((item.line_count or 0) / 150, 10)
        type_weight = 2 if item.gdscript else 1 if item.scene else 0
        importance = in_degree * 4 + out_degree * 1.5 + line_weight + type_weight

        nodes.append({
            "path": item.path,
            "category": item.category,
            "incoming_count": in_degree,
            "outgoing_count": out_degree,
            "importance_score": round(importance, 2),
        })

    nodes.sort(key=lambda node: (-node["importance_score"], node["path"]))

    edges = [
        {"source": source, "target": target}
        for source in sorted(outgoing)
        for target in sorted(outgoing[source])
    ]

    return {
        "nodes": nodes,
        "edges": edges,
        "outgoing": {
            key: sorted(value)
            for key, value in sorted(outgoing.items())
            if value
        },
        "incoming": {
            key: sorted(value)
            for key, value in sorted(incoming.items())
            if value
        },
        "unresolved": {
            key: sorted(value)
            for key, value in sorted(unresolved.items())
            if value
        },
    }


def build_function_graph(files: list[FileInfo]) -> dict[str, Any]:
    definitions: dict[str, list[str]] = defaultdict(list)

    for item in files:
        if not item.gdscript:
            continue
        for function in item.gdscript.functions:
            definitions[function.name].append(f"{item.path}::{function.name}")

    edges: list[dict[str, str]] = []
    unresolved_calls: dict[str, list[str]] = {}

    for item in files:
        if not item.gdscript:
            continue

        for function in item.gdscript.functions:
            source = f"{item.path}::{function.name}"
            unresolved: list[str] = []

            for call in function.calls:
                targets = definitions.get(call, [])
                if len(targets) == 1:
                    edges.append({
                        "source": source,
                        "target": targets[0],
                        "confidence": "high",
                    })
                elif len(targets) > 1:
                    local_target = f"{item.path}::{call}"
                    if local_target in targets:
                        edges.append({
                            "source": source,
                            "target": local_target,
                            "confidence": "high",
                        })
                    else:
                        unresolved.append(call)
                else:
                    unresolved.append(call)

            if unresolved:
                unresolved_calls[source] = sorted(set(unresolved))

    return {
        "definitions": dict(sorted(definitions.items())),
        "edges": edges,
        "unresolved_calls": unresolved_calls,
    }


def detect_system(path: str, config: dict[str, Any]) -> str:
    custom_systems = config.get("systems", {})
    lowered = path.lower()

    if isinstance(custom_systems, dict):
        for system, keywords in custom_systems.items():
            if isinstance(keywords, list) and any(str(keyword).lower() in lowered for keyword in keywords):
                return str(system).upper()

    scores: Counter[str] = Counter()
    for keyword, system in SYSTEM_KEYWORDS.items():
        if keyword in lowered:
            scores[system] += 1

    if scores:
        return scores.most_common(1)[0][0]

    parts = Path(path).parts
    if len(parts) > 1:
        return parts[0].upper()

    return "AUTRE"


def infer_role(item: FileInfo) -> list[str]:
    hints: list[str] = []

    if item.gdscript:
        gd = item.gdscript
        if gd.class_name:
            hints.append(f"classe globale {gd.class_name}")
        if gd.extends:
            hints.append(f"étend {gd.extends}")

        public_functions = [function.name for function in gd.functions if not function.is_private]
        if public_functions:
            hints.append("API: " + ", ".join(public_functions[:8]))

        if gd.signals:
            hints.append("signaux: " + ", ".join(gd.signals[:6]))

        if gd.todos:
            hints.append(f"{len(gd.todos)} note(s) TODO/FIXME")

    if item.scene:
        scene = item.scene
        hints.append(
            f"scène {scene.root_type or 'Node'} avec {len(scene.nodes)} nœud(s)"
        )
        if scene.scripts:
            hints.append(f"{len(scene.scripts)} script(s) associé(s)")

    return hints


def build_ai_context(
    files: list[FileInfo],
    graph: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    incoming = graph["incoming"]
    outgoing = graph["outgoing"]
    score_by_path = {
        node["path"]: node["importance_score"]
        for node in graph["nodes"]
    }

    systems: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for item in files:
        if not item.gdscript and not item.scene:
            continue

        system = detect_system(item.path, config)
        systems[system].append({
            "path": item.path,
            "category": item.category,
            "line_count": item.line_count or 0,
            "importance_score": score_by_path.get(item.path, 0),
            "incoming": incoming.get(item.path, []),
            "outgoing": outgoing.get(item.path, []),
            "role_hints": infer_role(item),
            "todos": item.gdscript.todos if item.gdscript else [],
        })

    for entries in systems.values():
        entries.sort(
            key=lambda entry: (
                -entry["importance_score"],
                -entry["line_count"],
                entry["path"],
            )
        )

    return {"systems": dict(sorted(systems.items()))}


def build_changes(
    previous_index: dict[str, Any],
    files: list[FileInfo],
) -> dict[str, Any]:
    previous_files = {
        item.get("path"): item
        for item in previous_index.get("files", [])
        if isinstance(item, dict) and item.get("path")
    }
    current_files = {item.path: item for item in files}

    added = sorted(set(current_files) - set(previous_files))
    removed = sorted(set(previous_files) - set(current_files))
    modified: list[dict[str, Any]] = []

    for path in sorted(set(current_files) & set(previous_files)):
        old = previous_files[path]
        new = current_files[path]
        if old.get("sha1_12") != new.sha1_12:
            modified.append({
                "path": path,
                "old_sha1_12": old.get("sha1_12"),
                "new_sha1_12": new.sha1_12,
                "old_size_bytes": old.get("size_bytes"),
                "new_size_bytes": new.size_bytes,
                "old_line_count": old.get("line_count"),
                "new_line_count": new.line_count,
            })

    return {
        "added": added,
        "removed": removed,
        "modified": modified,
        "has_previous_index": bool(previous_index),
    }


def read_previous_index(root: Path) -> dict[str, Any]:
    path = root / "PROJECT_INDEX.json"
    if not path.exists():
        return {}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def stars_from_score(score: float) -> str:
    if score >= 20:
        count = 5
    elif score >= 12:
        count = 4
    elif score >= 7:
        count = 3
    elif score >= 3:
        count = 2
    else:
        count = 1
    return "★" * count + "☆" * (5 - count)



def build_ai_memory(
    root: Path,
    files: list[FileInfo],
    summary: dict[str, Any],
    graph: dict[str, Any],
    function_graph: dict[str, Any],
    ai_context: dict[str, Any],
    project: ProjectSettingsInfo,
) -> dict[str, Any]:
    """
    Construit une mémoire IA compacte et orientée architecture.

    Le but n'est pas de recopier tout PROJECT_INDEX.json, mais de fournir
    immédiatement les points d'entrée, systèmes, APIs publiques, dépendances,
    fichiers critiques et points d'attention.
    """
    files_by_path = {item.path: item for item in files}
    score_by_path = {
        node["path"]: node["importance_score"]
        for node in graph["nodes"]
    }

    critical_files: list[dict[str, Any]] = []
    for node in graph["nodes"][:30]:
        path = node["path"]
        item = files_by_path.get(path)
        if not item:
            continue

        reasons: list[str] = []
        if path == project.main_scene:
            reasons.append("scène principale")
        if path in project.autoloads.values():
            names = [name for name, value in project.autoloads.items() if value == path]
            reasons.append("autoload: " + ", ".join(names))
        if node["incoming_count"] >= 3:
            reasons.append(f"{node['incoming_count']} dépendances entrantes")
        if node["outgoing_count"] >= 3:
            reasons.append(f"{node['outgoing_count']} dépendances sortantes")
        if (item.line_count or 0) >= 500:
            reasons.append(f"script volumineux ({item.line_count} lignes)")
        if item.gdscript and item.gdscript.todos:
            reasons.append(f"{len(item.gdscript.todos)} point(s) d'attention")

        if reasons or node["importance_score"] >= 5:
            critical_files.append({
                "path": path,
                "category": item.category,
                "importance_score": node["importance_score"],
                "reasons": reasons,
            })

    systems: dict[str, Any] = {}
    for system_name, entries in ai_context["systems"].items():
        system_files: list[dict[str, Any]] = []
        public_api: list[dict[str, Any]] = []
        todos: list[dict[str, str]] = []
        dependencies: set[str] = set()
        dependents: set[str] = set()

        for entry in entries:
            path = entry["path"]
            item = files_by_path.get(path)
            if not item:
                continue

            file_record: dict[str, Any] = {
                "path": path,
                "category": item.category,
                "importance_score": score_by_path.get(path, 0),
                "role_hints": infer_role(item),
            }

            if item.gdscript:
                gd = item.gdscript
                public_functions = [
                    {
                        "name": function.name,
                        "parameters": function.parameters,
                        "return_type": function.return_type,
                        "line": function.line,
                    }
                    for function in gd.functions
                    if not function.is_private
                ]
                if public_functions:
                    file_record["public_functions"] = public_functions
                    for function in public_functions:
                        public_api.append({
                            "file": path,
                            **function,
                        })

                if gd.signals:
                    file_record["signals"] = gd.signals
                if gd.class_name:
                    file_record["class_name"] = gd.class_name
                if gd.extends:
                    file_record["extends"] = gd.extends

                for todo in gd.todos:
                    todos.append({"file": path, "note": todo})

            for dependency in graph["outgoing"].get(path, []):
                dependency_system = detect_system(dependency, {})
                if dependency_system != system_name:
                    dependencies.add(dependency_system)

            for source in graph["incoming"].get(path, []):
                if source.startswith("["):
                    continue
                source_system = detect_system(source, {})
                if source_system != system_name:
                    dependents.add(source_system)

            system_files.append(file_record)

        system_files.sort(
            key=lambda item: (-item["importance_score"], item["path"])
        )

        main_file = system_files[0]["path"] if system_files else None
        systems[system_name] = {
            "main_file": main_file,
            "files": system_files,
            "public_api": public_api,
            "depends_on_systems": sorted(dependencies),
            "used_by_systems": sorted(dependents),
            "todos": todos,
        }

    architecture = {
        "entry_points": {
            "main_scene": project.main_scene,
            "autoloads": project.autoloads,
        },
        "godot": {
            "project_name": project.project_name or root.name,
            "rendering_method": project.rendering_method,
            "features": project.features,
            "input_actions": sorted(project.input_actions),
        },
        "statistics": {
            "files": summary["file_count"],
            "scripts": summary["script_count"],
            "scenes": summary["scene_count"],
            "lines": summary["total_text_lines"],
            "resolved_dependencies": len(graph["edges"]),
            "resolved_function_calls": len(function_graph["edges"]),
            "todo_count": summary["todo_count"],
        },
        "critical_files": critical_files,
        "systems": systems,
    }

    recommended_read_order: list[str] = []
    if project.main_scene:
        recommended_read_order.append(project.main_scene)
    recommended_read_order.extend(project.autoloads.values())
    recommended_read_order.extend(
        item["path"] for item in critical_files[:15]
    )

    # Déduplication en conservant l'ordre.
    architecture["recommended_read_order"] = list(dict.fromkeys(
        path for path in recommended_read_order if path
    ))

    return {
        "generator": {
            "name": "generate_project_index.py",
            "version": VERSION,
            "generated_utc": utc_now(),
        },
        "purpose": (
            "Mémoire technique compacte destinée à aider une IA à comprendre "
            "rapidement l'architecture du projet et à choisir les bons fichiers."
        ),
        "project": architecture,
    }


def write_ai_memory(root: Path, memory: dict[str, Any]) -> Path:
    output = root / "PROJECT_AI_MEMORY.json"
    output.write_text(
        json.dumps(memory, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output


def write_json_files(
    root: Path,
    files: list[FileInfo],
    summary: dict[str, Any],
    graph: dict[str, Any],
    function_graph: dict[str, Any],
    project: ProjectSettingsInfo,
    changes: dict[str, Any],
) -> tuple[Path, Path]:
    generated_utc = utc_now()

    index_path = root / "PROJECT_INDEX.json"
    index_payload = {
        "generator": {
            "name": "generate_project_index.py",
            "version": VERSION,
            "generated_utc": generated_utc,
        },
        "project": {
            "name": project.project_name or root.name,
            "root": str(root.resolve()),
            "settings": asdict(project),
        },
        "summary": summary,
        "changes": changes,
        "files": [asdict(item) for item in files],
    }
    index_path.write_text(
        json.dumps(index_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    graph_path = root / "PROJECT_GRAPH.json"
    graph_payload = {
        "generator": {
            "name": "generate_project_index.py",
            "version": VERSION,
            "generated_utc": generated_utc,
        },
        "file_graph": graph,
        "function_graph": function_graph,
    }
    graph_path.write_text(
        json.dumps(graph_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return index_path, graph_path


def write_markdown(
    root: Path,
    files: list[FileInfo],
    summary: dict[str, Any],
    graph: dict[str, Any],
    project: ProjectSettingsInfo,
) -> Path:
    output = root / "PROJECT_INDEX.md"

    lines: list[str] = [
        f"# Index du projet — {project.project_name or root.name}",
        "",
        f"_Généré automatiquement par la version {VERSION}, "
        f"le {datetime.now().astimezone().strftime('%d/%m/%Y à %H:%M:%S')}._",
        "",
        "## Vue d'ensemble",
        "",
        f"- Fichiers analysés : **{summary['file_count']}**",
        f"- Scripts Godot : **{summary['script_count']}**",
        f"- Scènes Godot : **{summary['scene_count']}**",
        f"- Taille totale : **{summary['total_size_human']}**",
        f"- Lignes de texte/code : **{summary['total_text_lines']}**",
        f"- Dépendances résolues : **{len(graph['edges'])}**",
        f"- TODO/FIXME/BUG/HACK : **{summary['todo_count']}**",
        f"- Fichiers repris depuis le cache : **{summary['cached_file_count']}**",
        "",
    ]

    if project.main_scene or project.autoloads or project.input_actions:
        lines += ["## Configuration Godot", ""]

        if project.main_scene:
            lines.append(f"- Scène principale : `{project.main_scene}`")
        if project.rendering_method:
            lines.append(f"- Méthode de rendu : `{project.rendering_method}`")
        if project.features:
            lines.append("- Fonctionnalités : " + ", ".join(f"`{item}`" for item in project.features))

        if project.autoloads:
            lines += ["", "### Autoloads", "", "| Nom | Script / scène |", "|---|---|"]
            for name, path in sorted(project.autoloads.items()):
                lines.append(f"| `{name}` | `{path}` |")

        if project.input_actions:
            lines += ["", "### Actions d'entrée", "", "| Action | Événements détectés |", "|---|---:|"]
            for action, events in sorted(project.input_actions.items()):
                lines.append(f"| `{action}` | {len(events)} |")

        lines.append("")

    lines += [
        "## Répartition par catégorie",
        "",
        "| Catégorie | Nombre |",
        "|---|---:|",
    ]
    for category, count in summary["by_category"].items():
        lines.append(f"| {category} | {count} |")

    lines += [
        "",
        "## Scripts les plus volumineux",
        "",
        "| Script | Lignes |",
        "|---|---:|",
    ]
    for item in summary["largest_scripts"][:15]:
        lines.append(f"| `{item['path']}` | {item['line_count']} |")

    lines += [
        "",
        "## Fichiers centraux",
        "",
        "| Fichier | Entrantes | Sortantes | Importance |",
        "|---|---:|---:|---:|",
    ]
    displayed = 0
    for node in graph["nodes"]:
        if not node["incoming_count"] and not node["outgoing_count"]:
            continue
        lines.append(
            f"| `{node['path']}` | {node['incoming_count']} | "
            f"{node['outgoing_count']} | {node['importance_score']} |"
        )
        displayed += 1
        if displayed >= 20:
            break

    lines += [
        "",
        "## Arborescence",
        "",
        "```text",
        project.project_name or root.name,
        make_tree(item.path for item in files),
        "```",
        "",
    ]

    gd_files = [item for item in files if item.gdscript]
    if gd_files:
        lines += ["## Scripts Godot", ""]

        for item in gd_files:
            gd = item.gdscript
            assert gd is not None

            lines += [
                f"### `{item.path}`",
                "",
                f"- Taille : {item.size_human}",
                f"- Lignes : {item.line_count or 0}",
            ]

            if gd.extends:
                lines.append(f"- Étend : `{gd.extends}`")
            if gd.class_name:
                lines.append(f"- Classe globale : `{gd.class_name}`")
            if gd.signals:
                lines.append("- Signaux : " + ", ".join(f"`{name}`" for name in gd.signals))
            if gd.emitted_signals:
                lines.append("- Signaux émis : " + ", ".join(f"`{name}`" for name in gd.emitted_signals))
            if gd.signal_connections:
                lines.append("- Signaux connectés : " + ", ".join(f"`{name}`" for name in gd.signal_connections))
            if gd.groups:
                lines.append("- Groupes : " + ", ".join(f"`{name}`" for name in gd.groups))

            if gd.exports:
                lines.append("- Variables exportées :")
                for variable in gd.exports:
                    type_part = f": {variable.type_hint}" if variable.type_hint else ""
                    default_part = f" = {variable.default_value}" if variable.default_value else ""
                    lines.append(
                        f"  - ligne {variable.line} : `{variable.name}{type_part}{default_part}`"
                    )

            if gd.functions:
                lines.append("- Fonctions :")
                for function in gd.functions:
                    signature = ", ".join(function.parameters)
                    return_part = f" -> {function.return_type}" if function.return_type else ""
                    calls_part = ""
                    if function.calls:
                        calls_part = " — appelle " + ", ".join(f"`{name}()`" for name in function.calls[:8])
                    lines.append(
                        f"  - lignes {function.line}-{function.end_line or '?'} : "
                        f"`{function.name}({signature}){return_part}`{calls_part}"
                    )

            if gd.dependencies:
                lines.append("- Dépendances chargées :")
                lines.extend(f"  - `{dependency}`" for dependency in gd.dependencies)

            if graph["incoming"].get(item.path):
                lines.append("- Utilisé par :")
                lines.extend(f"  - `{source}`" for source in graph["incoming"][item.path])

            if gd.todos:
                lines.append("- Notes de code :")
                lines.extend(f"  - {todo}" for todo in gd.todos)

            lines.append("")

    scene_files = [item for item in files if item.scene]
    if scene_files:
        lines += ["## Scènes Godot", ""]

        for item in scene_files:
            scene = item.scene
            assert scene is not None

            lines += [
                f"### `{item.path}`",
                "",
                f"- Racine : `{scene.root_node or '(inconnue)'}`",
                f"- Type racine : `{scene.root_type or '(inconnu)'}`",
                f"- Nœuds : {len(scene.nodes)}",
                f"- Connexions de signaux : {scene.connection_count}",
            ]

            if scene.scripts:
                lines.append("- Scripts :")
                lines.extend(f"  - `{path}`" for path in scene.scripts)

            instances = sorted(set(node.instance for node in scene.nodes if node.instance))
            if instances:
                lines.append("- Scènes instanciées :")
                lines.extend(f"  - `{path}`" for path in instances)

            groups = sorted({
                group
                for node in scene.nodes
                for group in node.groups
            })
            if groups:
                lines.append("- Groupes de nœuds : " + ", ".join(f"`{group}`" for group in groups))

            lines.append("")

    lines += [
        "## Tous les fichiers",
        "",
        "| Chemin | Catégorie | Taille | Lignes | Empreinte |",
        "|---|---|---:|---:|---|",
    ]

    for item in files:
        line_value = "" if item.line_count is None else str(item.line_count)
        lines.append(
            f"| `{item.path}` | {item.category} | {item.size_human} | "
            f"{line_value} | `{item.sha1_12}` |"
        )

    lines.append("")
    output.write_text("\n".join(lines), encoding="utf-8")
    return output


def write_ai_context(
    root: Path,
    ai_context: dict[str, Any],
    graph: dict[str, Any],
    project: ProjectSettingsInfo,
) -> Path:
    output = root / "PROJECT_AI_CONTEXT.md"

    lines: list[str] = [
        f"# Contexte IA — {project.project_name or root.name}",
        "",
        "Document synthétique destiné à identifier rapidement les systèmes et les fichiers prioritaires.",
        "",
    ]

    if project.main_scene:
        lines += [
            "## Point d'entrée",
            "",
            f"- Scène principale : `{project.main_scene}`",
        ]
        if project.autoloads:
            lines.append("- Autoloads :")
            for name, path in sorted(project.autoloads.items()):
                lines.append(f"  - `{name}` → `{path}`")
        lines.append("")

    for system, entries in ai_context["systems"].items():
        lines += [f"## {system}", ""]

        for entry in entries[:25]:
            lines += [
                f"### `{entry['path']}`",
                "",
                f"- Importance : {stars_from_score(entry['importance_score'])} "
                f"({entry['importance_score']})",
                f"- Type : {entry['category']}",
                f"- Taille logique : {entry['line_count']} lignes",
            ]

            if entry["role_hints"]:
                lines.append("- Rôle probable :")
                lines.extend(f"  - {hint}" for hint in entry["role_hints"])

            if entry["incoming"]:
                lines.append("- Utilisé par :")
                lines.extend(f"  - `{path}`" for path in entry["incoming"][:12])

            if entry["outgoing"]:
                lines.append("- Dépend de :")
                lines.extend(f"  - `{path}`" for path in entry["outgoing"][:12])

            if entry["todos"]:
                lines.append("- Points d'attention :")
                lines.extend(f"  - {todo}" for todo in entry["todos"][:10])

            lines.append("")

    unresolved_count = sum(len(values) for values in graph["unresolved"].values())
    if unresolved_count:
        lines += [
            "## Dépendances non résolues",
            "",
            f"{unresolved_count} référence(s) n'ont pas pu être reliées à un fichier indexé.",
            "",
        ]
        for source, values in graph["unresolved"].items():
            lines.append(f"- `{source}`")
            lines.extend(f"  - `{value}`" for value in values)
        lines.append("")

    output.write_text("\n".join(lines), encoding="utf-8")
    return output


def write_changes(root: Path, changes: dict[str, Any]) -> Path:
    output = root / "PROJECT_CHANGES.md"
    lines: list[str] = [
        "# Changements depuis le dernier index",
        "",
        f"_Généré le {datetime.now().astimezone().strftime('%d/%m/%Y à %H:%M:%S')}._",
        "",
    ]

    if not changes["has_previous_index"]:
        lines += [
            "Aucun index précédent n'a été trouvé. Ce fichier servira de base à la prochaine comparaison.",
            "",
        ]
    else:
        lines += [
            f"- Fichiers ajoutés : **{len(changes['added'])}**",
            f"- Fichiers supprimés : **{len(changes['removed'])}**",
            f"- Fichiers modifiés : **{len(changes['modified'])}**",
            "",
        ]

        if changes["added"]:
            lines += ["## Ajoutés", ""]
            lines.extend(f"- `{path}`" for path in changes["added"])
            lines.append("")

        if changes["removed"]:
            lines += ["## Supprimés", ""]
            lines.extend(f"- `{path}`" for path in changes["removed"])
            lines.append("")

        if changes["modified"]:
            lines += [
                "## Modifiés",
                "",
                "| Fichier | Anciennes lignes | Nouvelles lignes | Ancienne empreinte | Nouvelle empreinte |",
                "|---|---:|---:|---|---|",
            ]
            for item in changes["modified"]:
                lines.append(
                    f"| `{item['path']}` | {item['old_line_count'] or ''} | "
                    f"{item['new_line_count'] or ''} | "
                    f"`{item['old_sha1_12'] or ''}` | `{item['new_sha1_12']}` |"
                )
            lines.append("")

    output.write_text("\n".join(lines), encoding="utf-8")
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Génère un index technique complet et un contexte IA pour un projet Godot.",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Racine du projet. Par défaut : dossier du script.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Désactive la réutilisation du cache.",
    )
    parser.add_argument(
        "--max-file-size-mb",
        type=float,
        default=5.0,
        help="Taille maximale des fichiers texte analysés en profondeur.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Affiche les détails complets en cas d'erreur.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.expanduser().resolve()

    if not root.exists() or not root.is_dir():
        print(f"[ERREUR] Dossier introuvable : {root}")
        return 1

    config = load_config(root)

    ignored_dirs = DEFAULT_IGNORED_DIRS | set(config.get("ignored_dirs", []))
    ignored_files = DEFAULT_IGNORED_FILES | set(config.get("ignored_files", []))
    ignored_patterns = [
        str(pattern)
        for pattern in config.get("ignored_patterns", [])
        if isinstance(pattern, str)
    ]

    max_size_mb = config.get("max_file_size_mb", args.max_file_size_mb)
    try:
        max_file_size_bytes = int(float(max_size_mb) * 1024 * 1024)
    except (TypeError, ValueError):
        max_file_size_bytes = int(args.max_file_size_mb * 1024 * 1024)

    use_cache = not args.no_cache and bool(config.get("use_cache", True))
    cache = load_cache(root) if use_cache else {}
    previous_index = read_previous_index(root)

    try:
        print(f"Analyse du projet : {root}")
        files = scan_project(
            root=root,
            ignored_dirs=ignored_dirs,
            ignored_files=ignored_files,
            ignored_patterns=ignored_patterns,
            max_file_size_bytes=max_file_size_bytes,
            cache=cache,
            use_cache=use_cache,
        )

        project_settings_path = root / "project.godot"
        project = (
            parse_project_settings(project_settings_path)
            if project_settings_path.exists()
            else ProjectSettingsInfo(project_name=root.name)
        )

        summary = build_summary(files)
        graph = build_graph(files, project)
        function_graph = build_function_graph(files)
        ai_context = build_ai_context(files, graph, config)
        ai_memory = build_ai_memory(
            root=root,
            files=files,
            summary=summary,
            graph=graph,
            function_graph=function_graph,
            ai_context=ai_context,
            project=project,
        )
        changes = build_changes(previous_index, files)

        index_json, graph_json = write_json_files(
            root=root,
            files=files,
            summary=summary,
            graph=graph,
            function_graph=function_graph,
            project=project,
            changes=changes,
        )
        index_md = write_markdown(root, files, summary, graph, project)
        ai_md = write_ai_context(root, ai_context, graph, project)
        changes_md = write_changes(root, changes)
        ai_memory_json = write_ai_memory(root, ai_memory)

        save_cache(root, files)

        print("")
        print("Fichiers générés avec succès :")
        for path in (index_md, index_json, graph_json, ai_md, changes_md, ai_memory_json):
            print(f"- {path.name}")

        print("")
        print(f"{summary['file_count']} fichiers analysés.")
        print(f"{summary['cached_file_count']} fichiers repris depuis le cache.")
        print(f"{len(graph['edges'])} dépendances résolues.")
        print(f"{len(function_graph['edges'])} appels de fonctions reliés.")
        print(
            f"{len(changes['added'])} ajout(s), "
            f"{len(changes['modified'])} modification(s), "
            f"{len(changes['removed'])} suppression(s)."
        )
        return 0

    except Exception as exc:
        print(f"[ERREUR] {exc}")
        if args.debug:
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
