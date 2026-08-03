#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, html
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--compiled", default="compiled")
    ap.add_argument("--output", default="CUM_DEPENDANCES.graphml")
    args=ap.parse_args()
    folder=Path(args.compiled)
    missions=json.loads((folder/"mission-missions.json").read_text(encoding="utf-8"))
    children=json.loads((folder/"mission-mission-children.json").read_text(encoding="utf-8")) if (folder/"mission-mission-children.json").exists() else []
    nodes={}
    edges=[]
    for m in missions:
        mid=m.get("MISSION_ID")
        if mid:
            nodes[mid]=m.get("NOM") or mid
            parent=m.get("PARENT_MISSION_ID")
            if parent:
                edges.append((parent,mid,"PARENT"))
    for c in children:
        cid=c.get("CHILD_MISSION_ID"); pid=c.get("PARENT_MISSION_ID")
        if cid:
            nodes[cid]=c.get("NOM") or cid
        if cid and pid:
            edges.append((pid,cid,"MISSION_FILLE"))
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<graphml xmlns="http://graphml.graphdrawing.org/xmlns">','<graph id="G" edgedefault="directed">']
    for nid,label in nodes.items():
        lines.append(f'<node id="{html.escape(nid)}"><data key="label">{html.escape(str(label))}</data></node>')
    for i,(s,t,kind) in enumerate(edges):
        lines.append(f'<edge id="e{i}" source="{html.escape(s)}" target="{html.escape(t)}"><data key="type">{kind}</data></edge>')
    lines += ['</graph>','</graphml>']
    Path(args.output).write_text("\n".join(lines),encoding="utf-8")
    print(args.output)

if __name__=="__main__":
    main()
