#!/usr/bin/env python3
"""Export source-grounded writing briefs; never changes the project."""
import argparse
import hashlib
import json
from pathlib import Path


def digest(value):
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--batch-size", type=int, default=12)
    args = parser.parse_args()
    if not 1 <= args.batch_size <= 30:
        parser.error("batch-size must be between 1 and 30")
    source = args.project / "src/content/foundation/sectors.json"
    records = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(records, list) or len({r["id"] for r in records}) != len(records):
        raise SystemExit("Expected a list with unique record IDs")
    args.out.mkdir(parents=True, exist_ok=True)
    groups = {}
    for r in records:
        key = (r["unit"], r["domain"])
        groups.setdefault(key, []).append({
            "id": r["id"], "source_sha256": digest(r),
            "domain": r["domain"], "unit": r["unit"], "role": r["role"],
            "scenario": r.get("scenario"), "semanticId": r.get("semanticId"),
            "meaningAxis": r.get("meaningAxis"), "requires": r.get("requires"),
            "premises": r.get("premises"), "exclusions": r.get("exclusions"),
            "evidenceRefs": r.get("evidenceRefs"), "contribution": r.get("contribution"),
            "variantOf": r.get("variantOf"), "conflictGroup": r.get("conflictGroup"),
            "duplicateGroup": r.get("duplicateGroup"),
            "current": {k: r.get(k) for k in ("title", "paragraphs", "proposal")},
            "editorial_brief": {
                "keep_meaning": "현재 조건과 원래 본문을 읽고 유지할 의미를 한국어 한 문장으로 명시",
                "reader_flow": "기간의 핵심 판단 → 구체적인 상황 → 주의점 또는 짧은 조언",
                "unresolved": "조건만으로 유불리를 정할 수 없으면 새 길흉을 만들지 말고 의미 검토 대상으로 분리",
                "note": "집필용 자료이며 공개 본문에 기술 필드를 그대로 옮기지 않음"
            }
        })
    # Each batch stays within one domain and period, allowing editors to compare close neighbors.
    files = []
    for (unit, domain), rows in sorted(groups.items()):
        for start in range(0, len(rows), args.batch_size):
            name = f"{unit}-{domain}-{start // args.batch_size + 1:02}.json"
            target = args.out / name
            target.write_text(json.dumps(rows[start:start + args.batch_size], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            files.append(name)
    manifest = {"source_sha256": digest(records), "record_count": len(records), "batch_count": len(files), "files": files}
    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(records), "batches": len(files), "output": str(args.out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
