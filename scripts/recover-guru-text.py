#!/usr/bin/env python3
"""Recover only uniquely corroborated U+FFFD text from a GURU JSON export.

The source is never changed. The repaired export and an audit are written to
new paths. JSON.stringify(..., null, 2) emits one string value per line.
"""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re


def parse_line(line):
    body = line.strip()
    comma = body.endswith(",")
    body = body[:-1] if comma else body
    try:
        if '": ' in body:
            entry = json.loads("{" + body + "}")
            if len(entry) == 1:
                key, value = next(iter(entry.items()))
                if isinstance(value, str):
                    return "field", key, value, comma
        value = json.loads(body)
        if isinstance(value, str):
            return "item", "(array)", value, comma
    except (ValueError, StopIteration):
        pass
    return None


def damaged_key(line):
    match = re.match(r'^\s*("(?:\\.|[^"\\])*")\s*:', line)
    if not match:
        return None
    key = json.loads(match.group(1))
    return key if "�" in key else None


def source_rows(path):
    with path.open("r", encoding="utf-8", errors="strict") as source:
        for line_number, line in enumerate(source, 1):
            yield line_number, line, parse_line(line)


def candidates_for(key, damaged, clean_by_length):
    runs = re.findall("�+", damaged)
    minimum = len(damaged) - sum(map(len, runs)) + len(runs)
    expression = re.compile("^" + "".join(
        f"[\\s\\S]{{1,{len(part)}}}" if "�" in part else re.escape(part)
        for part in re.split("(�+)", damaged)
    ) + "$")
    possible = []
    for length in range(minimum, len(damaged) + 1):
        for candidate in clean_by_length.get(key, {}).get(length, ()):
            if expression.fullmatch(candidate):
                possible.append(candidate)
                if len(possible) > 1:
                    return possible
    return possible


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def recover(source, output, report_path):
    if source.resolve() in (output.resolve(), report_path.resolve()) or output.resolve() == report_path.resolve():
        raise ValueError("Input, output and report paths must be different")
    if output.exists() or report_path.exists():
        raise FileExistsError("Output or report already exists; original files are preserved")

    clean = defaultdict(set)
    damaged = Counter()
    raw_replacement_count = 0
    for _, line, row in source_rows(source):
        raw_replacement_count += line.count("�")
        if not row:
            continue
        kind, key, value, _ = row
        if "�" in value:
            damaged[(key, value)] += 1
        elif "�" not in key:
            clean[key].add(value)

    by_length = {key: defaultdict(set) for key in clean}
    for key, values in clean.items():
        for value in values:
            by_length[key][len(value)].add(value)

    repairs = {}
    for (key, value), occurrences in damaged.items():
        matches = candidates_for(key, value, by_length)
        if len(matches) == 1:
            repairs[(key, value)] = matches[0]

    resolved_occurrences = 0
    unresolved = []
    resolved = []
    unresolved_keys = []
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8", newline="") as target:
        for number, line, row in source_rows(source):
            key = damaged_key(line) if "�" in line else None
            if key is not None:
                unresolved_keys.append({"line": number, "original": key})
            if not row or "�" not in row[2]:
                target.write(line)
                continue
            kind, key, value, comma = row
            replacement = repairs.get((key, value))
            record = {"line": number, "field": key, "original": value}
            if replacement is None:
                unresolved.append(record)
                target.write(line)
                continue
            record["restored"] = replacement
            resolved.append(record)
            resolved_occurrences += 1
            indentation = line[:len(line) - len(line.lstrip())]
            if kind == "field":
                content = json.dumps(key, ensure_ascii=False) + ": " + json.dumps(replacement, ensure_ascii=False)
            else:
                content = json.dumps(replacement, ensure_ascii=False)
            target.write(indentation + content + ("," if comma else "") + "\n")

    # Only JSON string literals are rewritten; the surrounding JSON structure
    # stays byte-for-byte identical. Avoid loading a multi-gigabyte export.
    report = {
        "source": str(source), "sourceSha256": sha256(source),
        "recoveredExport": str(output), "recoveredSha256": sha256(output),
        "rawReplacementCount": raw_replacement_count,
        "restoredOccurrences": resolved_occurrences,
        "unresolvedOccurrences": len(unresolved),
        "unresolvedKeyOccurrences": len(unresolved_keys),
        "unresolvedKeys": unresolved_keys,
        "method": "Unique exact pattern match against an undamaged string in the same JSON field",
        "restored": resolved, "unresolved": unresolved,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("x", encoding="utf-8") as target:
        json.dump(report, target, ensure_ascii=False, indent=2)
    print(json.dumps({key: report[key] for key in (
        "rawReplacementCount", "restoredOccurrences", "unresolvedOccurrences", "unresolvedKeyOccurrences",
        "sourceSha256", "recoveredSha256")}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Complete pretty-printed GURU JSON export")
    parser.add_argument("output", type=Path, help="New repaired JSON file")
    parser.add_argument("report", type=Path, help="New audit JSON file")
    args = parser.parse_args()
    recover(args.source, args.output, args.report)
