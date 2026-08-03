#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path
from collections import Counter, defaultdict

def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def pick_id(row):
    for key in ("MISSION_ID","CHILD_MISSION_ID","PROJECT_ID","EVENT_ID","VARIABLE_ID","TRIGGER_ID","NARRATIVE_ID","AXIS_ID","OBSESSION_ID","MEMORY_ID","TEMPLATE_ID"):
        if row.get(key):
            return str(row[key])
    return None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--compiled", default="compiled")
    ap.add_argument("--output", default="validation-report.json")
    args=ap.parse_args()
    folder=Path(args.compiled)
    issues=[]
    datasets={}
    for p in folder.glob("mission-*.json"):
        datasets[p.stem]=load(p)
    ids=[]
    for rows in datasets.values():
        ids += [pick_id(r) for r in rows if pick_id(r)]
    for value,count in Counter(ids).items():
        if count>1:
            issues.append({"severity":"ERROR","rule":"VAL_ID_UNIQUE","id":value,"message":f"ID dupliqué {count} fois"})
    all_ids=set(ids)
    for row in datasets.get("mission-missions",[]):
        for field in ("PROJECT_ID","PARENT_MISSION_ID","ENGINE_EVENT_ID","VARIABLE_ID"):
            ref=row.get(field)
            if ref and ref not in all_ids:
                sev="WARNING" if field=="VARIABLE_ID" else "ERROR"
                issues.append({"severity":sev,"rule":"VAL_REFERENCE","id":row.get("MISSION_ID"),"field":field,"reference":ref})
    report={
        "errors":sum(i["severity"]=="ERROR" for i in issues),
        "warnings":sum(i["severity"]=="WARNING" for i in issues),
        "issues":issues
    }
    Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(args.output)
    raise SystemExit(1 if report["errors"] else 0)

if __name__=="__main__":
    main()
