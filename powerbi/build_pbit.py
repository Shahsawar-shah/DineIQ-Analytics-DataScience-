"""Packs DineIQ_Dashboard (pbip) into a Power BI template: DineIQ_Dashboard.pbit
Usage: python powerbi/build_pbit.py   (run build_pbip.py first)
"""
import json, zipfile, uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "DineIQ_Dashboard"
OUT = HERE / "DineIQ_Dashboard.pbit"

model = json.loads((SRC / "DineIQ.SemanticModel" / "model.bim").read_text())
model = {"name": str(uuid.uuid4()), **model}
model["model"].setdefault("annotations", []).append({"name": "PBIDesktopVersion", "value": "2.130.754.0 (24.06)"})
layout = json.loads((SRC / "DineIQ.Report" / "report.json").read_text())
layout = {"id": 0, **layout}


def u16(obj):
    s = obj if isinstance(obj, str) else json.dumps(obj, separators=(",", ":"))
    return s.encode("utf-16-le")


content_types = ('﻿<?xml version="1.0" encoding="utf-8"?>'
                 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                 '<Default Extension="json" ContentType="" />'
                 '<Override PartName="/Version" ContentType="" />'
                 '<Override PartName="/DataModelSchema" ContentType="" />'
                 '<Override PartName="/DiagramLayout" ContentType="" />'
                 '<Override PartName="/Report/Layout" ContentType="" />'
                 '<Override PartName="/Settings" ContentType="" />'
                 '<Override PartName="/Metadata" ContentType="" />'
                 '</Types>').encode("utf-8")

diagram = {"version": "1.1.0", "diagrams": [{"ordinal": 0, "scrollPosition": {"x": 0, "y": 0}, "nodes": [],
           "name": "All tables", "zoomValue": 100, "pinKeyFieldsToTop": False, "showExtraHeaderInfo": False,
           "hideKeyFieldsWhenCollapsed": False, "tablesLocked": False}],
           "selectedDiagram": "All tables", "defaultDiagram": "All tables"}
settings = {"Version": 4, "ReportSettings": {}, "QueriesSettings": {"TypeDetectionEnabled": True,
            "RelationshipImportEnabled": False, "Version": "2.130.754.0"}}
metadata = {"version": 5, "autoCreatedRelationships": [], "fileDescription": "DineIQ Analytics dashboard template",
            "createdFrom": "Cloud", "createdFromRelease": "2024.06"}

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("Version", u16("1.28"))
    z.writestr("DataModelSchema", u16(model))
    z.writestr("DiagramLayout", u16(diagram))
    z.writestr("Report/Layout", u16(layout))
    z.writestr("Settings", u16(settings))
    z.writestr("Metadata", u16(metadata))
print(f"Wrote {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
