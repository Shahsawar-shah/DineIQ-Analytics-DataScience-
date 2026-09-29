"""Generates the DineIQ Power BI Project (.pbip): semantic model (model.bim) + report (report.json).
Usage: python powerbi/build_pbip.py <cols.txt>   (cols.txt = table|column|pg_type from information_schema)
"""
import json, sys, uuid, hashlib
from pathlib import Path

OUT = Path(__file__).resolve().parent / "DineIQ_Dashboard"
NAME = "DineIQ"

# ---------------------------------------------------------------- MODEL
TYPE_MAP = {"bigint": "int64", "integer": "int64", "numeric": "double", "text": "string",
            "boolean": "boolean", "date": "dateTime", "timestamp without time zone": "dateTime"}
ID_COLS = {"order_id", "order_item_id", "customer_id", "restaurant_id", "promotion_id", "item_id",
           "wastage_id", "rating_id", "inventory_id", "price_id", "year", "quarter", "month_no",
           "weekday_no", "week_no", "order_hour", "basket_size"}
CURRENCY = {"revenue", "cost", "profit", "unit_price", "cost_price", "subtotal", "discount_amount",
            "total_amount", "base_price", "preparation_cost", "unit_margin", "wastage_cost",
            "unit_cost", "stock_value", "old_price", "new_price", "price_delta", "monetary_value",
            "contribution_margin", "min_order_value", "discount_applied"}

cols = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    t, c, ty = line.split("|")
    if ty.startswith("time "):
        continue
    cols.setdefault(t, []).append((c, TYPE_MAP[ty]))


def column(c, dt):
    col = {"name": c, "dataType": dt, "sourceColumn": c}
    if c in ID_COLS or dt == "string" or dt == "boolean":
        col["summarizeBy"] = "none"
    elif dt in ("int64", "double"):
        col["summarizeBy"] = "sum"
    if dt == "dateTime":
        col["formatString"] = "Short Date" if c != "trained_at" else "General Date"
        col["summarizeBy"] = "none"
    if c in CURRENCY:
        col["formatString"] = "\\$#,0.00;(\\$#,0.00);\\$#,0.00"
    return col


def m_partition(t, cnames):
    sel = ", ".join(f'"{c}"' for c in cnames)
    return {"name": t, "mode": "import", "source": {"type": "m", "expression": [
        "let",
        "    Source = PostgreSQL.Database(PG_Server, PG_Database),",
        f'    Data = Source{{[Schema="bi",Item="{t}"]}}[Data],',
        f"    Selected = Table.SelectColumns(Data, {{{sel}}})",
        "in",
        "    Selected"]}}


tables = []
for t, cl in cols.items():
    tbl = {"name": t, "columns": [column(c, dt) for c, dt in cl],
           "partitions": [m_partition(t, [c for c, _ in cl])]}
    if t == "dim_date":
        tbl["dataCategory"] = "Time"
        for col in tbl["columns"]:
            if col["name"] == "date":
                col["isKey"] = True
            if col["name"] == "month_name":
                col["sortByColumn"] = "month_no"
            if col["name"] == "weekday_name":
                col["sortByColumn"] = "weekday_no"
    if t.startswith("stg_"):
        continue
    tables.append(tbl)

CUR = "\\$#,0;(\\$#,0);\\$#,0"
PCT = "0.0%"
INT = "#,0"
DEC = "#,0.00"
MEASURES = [
    # name, expression, format, folder
    ("Total Revenue", "CALCULATE(SUM(fact_order_items[revenue]), fact_order_items[is_cancelled] = FALSE())", CUR, "Sales"),
    ("Total Cost", "CALCULATE(SUM(fact_order_items[cost]), fact_order_items[is_cancelled] = FALSE())", CUR, "Sales"),
    ("Gross Profit", "[Total Revenue] - [Total Cost]", CUR, "Sales"),
    ("Profit Margin %", "DIVIDE([Gross Profit], [Total Revenue])", PCT, "Sales"),
    ("Units Sold", "CALCULATE(SUM(fact_order_items[quantity]), fact_order_items[is_cancelled] = FALSE())", INT, "Sales"),
    ("Total Orders", "CALCULATE(DISTINCTCOUNT(fact_orders[order_id]), fact_orders[is_cancelled] = FALSE())", INT, "Sales"),
    ("Avg Order Value", "DIVIDE([Total Revenue], [Total Orders])", "\\$#,0.00", "Sales"),
    ("Avg Basket Size", "AVERAGE(fact_orders[basket_size])", DEC, "Sales"),
    ("Cancellation Rate", "DIVIDE(CALCULATE(COUNTROWS(fact_orders), fact_orders[is_cancelled] = TRUE()), COUNTROWS(fact_orders))", "0.00%", "Sales"),
    ("Revenue MoM %", "VAR prev = CALCULATE([Total Revenue], DATEADD(dim_date[date], -1, MONTH)) RETURN DIVIDE([Total Revenue] - prev, prev)", PCT, "Time"),
    ("Revenue MTD", "TOTALMTD([Total Revenue], dim_date[date])", CUR, "Time"),
    ("Customer Count", "COUNTROWS(dim_customer)", INT, "Customers"),
    ("Active Customers", "CALCULATE(DISTINCTCOUNT(fact_orders[customer_id]), fact_orders[is_cancelled] = FALSE())", INT, "Customers"),
    ("At-Risk Customers", "CALCULATE(COUNTROWS(dim_customer), dim_customer[churn_status] = \"At Risk\")", INT, "Customers"),
    ("Churn Risk %", "DIVIDE([At-Risk Customers], [Customer Count])", PCT, "Customers"),
    ("Avg RFM Score", "AVERAGE(dim_customer[rfm_score])", DEC, "Customers"),
    ("Discount Given", "CALCULATE(SUM(fact_orders[discount_amount]), fact_orders[is_cancelled] = FALSE())", CUR, "Promotions"),
    ("Promo Revenue", "CALCULATE([Total Revenue], fact_order_items[promotion_id] <> 0)", CUR, "Promotions"),
    ("Promo Share %", "DIVIDE([Promo Revenue], [Total Revenue])", PCT, "Promotions"),
    ("Promo ROI", "DIVIDE([Promo Revenue] - [Discount Given], [Discount Given])", "0.00\"x\"", "Promotions"),
    ("Promo Orders", "CALCULATE([Total Orders], fact_orders[promotion_id] <> 0)", INT, "Promotions"),
    ("Wastage Cost", "SUM(fact_wastage[wastage_cost])", CUR, "Wastage"),
    ("Wastage Qty", "SUM(fact_wastage[wastage_quantity])", INT, "Wastage"),
    ("Wastage % of Cost", "DIVIDE([Wastage Cost], [Total Cost])", "0.00%", "Wastage"),
    ("Avg Rating", "AVERAGE(fact_ratings[rating_value])", "0.00", "Ratings"),
    ("Rating Count", "COUNTROWS(fact_ratings)", INT, "Ratings"),
    ("Stock Value", "SUM(fact_inventory[stock_value])", CUR, "Inventory"),
    ("Items To Reorder", "CALCULATE(COUNTROWS(fact_inventory), fact_inventory[needs_reorder] = TRUE())", INT, "Inventory"),
    ("Item Count", "COUNTROWS(dim_menu_item)", INT, "ML"),
    ("Correct Predictions", "COUNTROWS(FILTER(dim_menu_item, dim_menu_item[menu_class] = dim_menu_item[predicted_class]))", INT, "ML"),
    ("Prediction Accuracy", "DIVIDE([Correct Predictions], [Item Count])", PCT, "ML"),
    ("Precision", "DIVIDE([Correct Predictions], [Item Count])", PCT, "ML"),   # use with predicted_class on rows
    ("Recall", "DIVIDE([Correct Predictions], [Item Count])", PCT, "ML"),      # use with menu_class on rows
    ("Avg Confidence", "AVERAGE(dim_menu_item[prediction_confidence])", PCT, "ML"),
    ("Metric Value", "SUM(model_metrics[value])", "0.0000", "ML"),
]
tables.append({
    "name": "_Measures",
    "columns": [{"type": "calculatedTableColumn", "name": "x", "dataType": "int64", "isHidden": True,
                 "isNameInferred": True, "isDataTypeInferred": True, "sourceColumn": "[x]", "summarizeBy": "none"}],
    "partitions": [{"name": "_Measures", "mode": "import", "source": {"type": "calculated", "expression": "ROW(\"x\", 0)"}}],
    "measures": [{"name": n, "expression": e, "formatString": f, "displayFolder": d} for n, e, f, d in MEASURES],
})

REL = [  # from(many) table, col, to(one) table, col
    ("fact_order_items", "order_date", "dim_date", "date"),
    ("fact_order_items", "item_id", "dim_menu_item", "item_id"),
    ("fact_order_items", "restaurant_id", "dim_restaurant", "restaurant_id"),
    ("fact_order_items", "customer_id", "dim_customer", "customer_id"),
    ("fact_order_items", "promotion_id", "dim_promotion", "promotion_id"),
    ("fact_orders", "order_date", "dim_date", "date"),
    ("fact_orders", "restaurant_id", "dim_restaurant", "restaurant_id"),
    ("fact_orders", "customer_id", "dim_customer", "customer_id"),
    ("fact_orders", "promotion_id", "dim_promotion", "promotion_id"),
    ("fact_wastage", "wastage_date", "dim_date", "date"),
    ("fact_wastage", "item_id", "dim_menu_item", "item_id"),
    ("fact_wastage", "restaurant_id", "dim_restaurant", "restaurant_id"),
    ("fact_ratings", "rating_date", "dim_date", "date"),
    ("fact_ratings", "item_id", "dim_menu_item", "item_id"),
    ("fact_ratings", "restaurant_id", "dim_restaurant", "restaurant_id"),
    ("fact_inventory", "item_id", "dim_menu_item", "item_id"),
    ("fact_inventory", "restaurant_id", "dim_restaurant", "restaurant_id"),
    ("fact_price_changes", "item_id", "dim_menu_item", "item_id"),
]
relationships = [{"name": str(uuid.uuid5(uuid.NAMESPACE_OID, f"{a}{b}{c}{d}")), "fromTable": a, "fromColumn": b,
                  "toTable": c, "toColumn": d} for a, b, c, d in REL]

model = {
    "compatibilityLevel": 1567,
    "model": {
        "culture": "en-US",
        "defaultPowerBIDataSourceVersion": "powerBI_V3",
        "sourceQueryCulture": "en-US",
        "dataAccessOptions": {"legacyRedirects": True, "returnErrorValuesAsNull": True},
        "tables": tables,
        "relationships": relationships,
        "expressions": [
            {"name": "PG_Server", "kind": "m",
             "expression": "\"187.127.98.233:5432\" meta [IsParameterQuery=true, Type=\"Text\", IsParameterQueryRequired=true]",
             "annotations": [{"name": "PBI_ResultType", "value": "Text"}]},
            {"name": "PG_Database", "kind": "m",
             "expression": "\"dineiq_analytics\" meta [IsParameterQuery=true, Type=\"Text\", IsParameterQueryRequired=true]",
             "annotations": [{"name": "PBI_ResultType", "value": "Text"}]},
        ],
        "annotations": [
            {"name": "PBI_QueryOrder", "value": json.dumps(["PG_Server", "PG_Database"] + [t["name"] for t in tables if t["name"] != "_Measures"])},
            {"name": "__PBI_TimeIntelligenceEnabled", "value": "0"},
        ],
    },
}

# ---------------------------------------------------------------- REPORT
W, H = 1280, 720
BG = "#F3F5F9"
BRAND = "#0F766E"


def lit(v):
    if isinstance(v, bool):
        return {"expr": {"Literal": {"Value": "true" if v else "false"}}}
    if isinstance(v, (int, float)):
        return {"expr": {"Literal": {"Value": f"{v}D"}}}
    return {"expr": {"Literal": {"Value": f"'{v}'"}}}


def color(c):
    return {"solid": {"color": lit(c)}}


def vid(*parts):
    return hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:20]


class Q:
    """Builds prototypeQuery + projections."""
    def __init__(self):
        self.alias, self.frm, self.select = {}, [], []

    def src(self, table):
        if table not in self.alias:
            a = f"t{len(self.alias)}"
            self.alias[table] = a
            self.frm.append({"Name": a, "Entity": table, "Type": 0})
        return self.alias[table]

    def field(self, f):
        """f = 'table.column' or measure name (no dot / starts with '[')."""
        if "." in f:
            t, c = f.split(".", 1)
            expr = {"Column": {"Expression": {"SourceRef": {"Source": self.src(t)}}, "Property": c}}
            ref = f
        else:
            expr = {"Measure": {"Expression": {"SourceRef": {"Source": self.src("_Measures")}}, "Property": f}}
            ref = f"_Measures.{f}"
        if ref not in [s["Name"] for s in self.select]:
            self.select.append({**expr, "Name": ref, "NativeReferenceName": f.split(".")[-1]})
        return ref, expr


def expr_of(f):
    q = Q()
    return q.field(f)[1]


def visual(page, vtype, x, y, w, h, roles, title=None, sort=None, top=None, objects=None, extra_vc=None):
    q = Q()
    projections = {}
    for role, fields in roles.items():
        projections[role] = [{"queryRef": q.field(f)[0]} for f in fields]
    for p in projections.get("Category", [])[:1] + projections.get("Rows", [])[:1]:
        p["active"] = True
    proto = {"Version": 2, "From": q.frm, "Select": q.select}
    if sort:
        f, direction = sort
        assert any(f in fl for fl in roles.values()), f"sort field {f} not in visual"
        _, e = q.field(f)
        proto["OrderBy"] = [{"Direction": 2 if direction == "desc" else 1, "Expression": e}]
    vc = {
        "title": [{"properties": {"show": lit(bool(title)), **({"text": lit(title)} if title else {}),
                                   "fontColor": color("#1F2937"), "fontSize": lit(11)}}],
        "background": [{"properties": {"show": lit(True), "color": color("#FFFFFF"), "transparency": lit(0)}}],
        "border": [{"properties": {"show": lit(True), "color": color("#E5E7EB"), "radius": lit(10)}}],
        "dropShadow": [{"properties": {"show": lit(True), "preset": lit("Center"), "transparency": lit(88)}}],
    }
    if extra_vc:
        vc.update(extra_vc)
    name = vid(page, vtype, x, y)
    cfg = {"name": name,
           "layouts": [{"id": 0, "position": {"x": x, "y": y, "z": 0, "width": w, "height": h}}],
           "singleVisual": {"visualType": vtype, "projections": projections, "prototypeQuery": proto,
                            "drillFilterOtherVisuals": True, "hasDefaultSort": bool(sort),
                            "objects": objects or {}, "vcObjects": vc}}
    filters = []
    if top:
        field, n, by = top
        t, c = field.split(".")
        filters.append({
            "name": vid(name, "top"),
            "expression": {"Column": {"Expression": {"SourceRef": {"Entity": t}}, "Property": c}},
            "filter": {"Version": 2,
                       "From": [{"Name": "subquery", "Expression": {"Subquery": {"Query": {
                           "Version": 2,
                           "From": [{"Name": "d", "Entity": t, "Type": 0}, {"Name": "m", "Entity": "_Measures", "Type": 0}],
                           "Select": [{"Column": {"Expression": {"SourceRef": {"Source": "d"}}, "Property": c}, "Name": "field"}],
                           "OrderBy": [{"Direction": 2, "Expression": {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": by}}}],
                           "Top": n}}}, "Type": 2},
                                {"Name": "d", "Entity": t, "Type": 0}],
                       "Where": [{"Condition": {"In": {"Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": "d"}}, "Property": c}}],
                                                       "Table": {"SourceRef": {"Source": "subquery"}}}}}]},
            "type": "TopN", "howCreated": 1})
    return {"x": x, "y": y, "z": 0, "width": w, "height": h, "config": json.dumps(cfg), "filters": json.dumps(filters)}


def textbox(page, x, y, w, h, text, sub=None):
    paras = [{"textRuns": [{"value": text, "textStyle": {"fontWeight": "bold", "fontSize": "20pt", "color": "#FFFFFF"}}]}]
    if sub:
        paras.append({"textRuns": [{"value": sub, "textStyle": {"fontSize": "10pt", "color": "#CCFBF1"}}]})
    cfg = {"name": vid(page, "tb", x, y),
           "layouts": [{"id": 0, "position": {"x": x, "y": y, "z": 0, "width": w, "height": h}}],
           "singleVisual": {"visualType": "textbox", "drillFilterOtherVisuals": True,
                            "objects": {"general": [{"properties": {"paragraphs": paras}}]},
                            "vcObjects": {"background": [{"properties": {"show": lit(True), "color": color(BRAND), "transparency": lit(0)}}],
                                          "border": [{"properties": {"show": lit(False), "radius": lit(10)}}]}}}
    return {"x": x, "y": y, "z": 0, "width": w, "height": h, "config": json.dumps(cfg), "filters": "[]"}


def card(page, x, y, measure, w=200, h=95):
    return visual(page, "card", x, y, w, h, {"Values": [measure]},
                  objects={"labels": [{"properties": {"color": color(BRAND), "fontSize": lit(22)}}],
                           "categoryLabels": [{"properties": {"color": color("#6B7280"), "fontSize": lit(10)}}]})


def slicer(page, x, y, field, w=150, h=58):
    return visual(page, "slicer", x, y, w, h, {"Values": [field]},
                  objects={"data": [{"properties": {"mode": lit("Dropdown")}}],
                           "header": [{"properties": {"show": lit(True), "fontColor": color("#374151")}}]})


def header(page, title, sub, slicers=True):
    v = [textbox(page, 0, 0, W, 72, title, sub)]
    if slicers:
        v.append(slicer(page, 790, 7, "dim_date.year_month"))
        v.append(slicer(page, 950, 7, "dim_restaurant.restaurant_name"))
        v.append(slicer(page, 1110, 7, "fact_orders.order_channel", w=160))
    return v


def kpis(page, measures, y=86):
    gap = 12
    w = (W - 24 - gap * (len(measures) - 1)) // len(measures)
    return [card(page, 12 + i * (w + gap), y, m, w=w) for i, m in enumerate(measures)]


pages = []

# 1. Executive
p = "Executive"
v = header(p, "DineIQ Analytics — Executive Overview", "Revenue, profit and order performance across all outlets")
v += kpis(p, ["Total Revenue", "Gross Profit", "Profit Margin %", "Total Orders", "Avg Order Value", "Active Customers"])
v.append(visual(p, "lineClusteredColumnComboChart", 12, 195, 820, 255,
                {"Category": ["dim_date.year_month"], "Y": ["Total Revenue"], "Y2": ["Profit Margin %"]},
                "Monthly Revenue & Margin", sort=("dim_date.year_month", "asc")))
v.append(visual(p, "donutChart", 844, 195, 424, 255, {"Category": ["fact_orders.order_channel"], "Y": ["Total Revenue"]},
                "Revenue by Channel"))
v.append(visual(p, "clusteredBarChart", 12, 462, 420, 250, {"Category": ["dim_menu_item.category_name"], "Y": ["Total Revenue"]},
                "Revenue by Category", sort=("Total Revenue", "desc")))
v.append(visual(p, "clusteredColumnChart", 444, 462, 400, 250, {"Category": ["dim_date.weekday_name"], "Y": ["Total Orders"]},
                "Orders by Weekday", sort=("dim_date.weekday_name", "asc")))
v.append(visual(p, "clusteredColumnChart", 856, 462, 412, 250, {"Category": ["fact_orders.order_hour"], "Y": ["Total Orders"]},
                "Orders by Hour (Peak Analysis)", sort=("fact_orders.order_hour", "asc")))
pages.append((p, v))

# 2. Menu Engineering
p = "Menu Engineering"
v = header(p, "Menu Engineering Matrix", "Profit Drivers · Volume Drivers · Hidden Opportunities · Low Performers")
v += kpis(p, ["Item Count", "Units Sold", "Gross Profit", "Profit Margin %", "Avg Rating"])
v.append(visual(p, "scatterChart", 12, 195, 760, 330,
                {"Category": ["dim_menu_item.item_name"], "Series": ["dim_menu_item.menu_class"], "X": ["Units Sold"], "Y": ["Profit Margin %"]},
                "Popularity vs Profitability (each dot = menu item)"))
v.append(visual(p, "donutChart", 784, 195, 484, 330, {"Category": ["dim_menu_item.menu_class"], "Y": ["Item Count"]},
                "Items per Menu Class"))
v.append(visual(p, "clusteredBarChart", 12, 537, 420, 175, {"Category": ["dim_menu_item.item_name"], "Y": ["Gross Profit"]},
                "Top 10 Items by Profit", sort=("Gross Profit", "desc"), top=("dim_menu_item.item_name", 10, "Gross Profit")))
v.append(visual(p, "tableEx", 444, 537, 824, 175,
                {"Values": ["dim_menu_item.item_name", "dim_menu_item.category_name", "dim_menu_item.menu_class",
                            "Total Revenue", "Gross Profit", "Profit Margin %", "Avg Rating"]},
                "Menu Item Detail", sort=("Gross Profit", "desc")))
pages.append((p, v))

# 3. ML Evidence
p = "ML Model Evidence"
v = header(p, "ML Model Evidence — Menu Classification", "XGBoost (Python) + Spark MLlib · confusion matrix, precision & recall", slicers=False)
v += kpis(p, ["Prediction Accuracy", "Correct Predictions", "Item Count", "Avg Confidence"])
v.append(visual(p, "pivotTable", 12, 195, 620, 250,
                {"Rows": ["dim_menu_item.menu_class"], "Columns": ["dim_menu_item.predicted_class"], "Values": ["Item Count"]},
                "Confusion Matrix (rows = actual, columns = predicted)"))
v.append(visual(p, "tableEx", 644, 195, 300, 250, {"Values": ["dim_menu_item.predicted_class", "Precision", "Item Count"]},
                "Precision by Class"))
v.append(visual(p, "tableEx", 956, 195, 312, 250, {"Values": ["dim_menu_item.menu_class", "Recall", "Item Count"]},
                "Recall by Class"))
v.append(visual(p, "clusteredColumnChart", 12, 457, 620, 255,
                {"Category": ["model_metrics.model"], "Series": ["model_metrics.metric"], "Y": ["Metric Value"]},
                "Spark MLlib Model Comparison"))
v.append(visual(p, "tableEx", 644, 457, 624, 255,
                {"Values": ["dim_menu_item.item_name", "dim_menu_item.menu_class", "dim_menu_item.predicted_class",
                            "dim_menu_item.prediction_confidence", "dim_menu_item.model_used"]},
                "Per-item Predictions (150 cases)"))
pages.append((p, v))

# 4. Customers
p = "Customers & Churn"
v = header(p, "Customer Intelligence & Churn Risk", "RFM segmentation, churn status and demographics")
v += kpis(p, ["Customer Count", "Active Customers", "At-Risk Customers", "Churn Risk %", "Avg RFM Score"])
v.append(visual(p, "donutChart", 12, 195, 400, 255, {"Category": ["dim_customer.churn_status"], "Y": ["Customer Count"]},
                "Churn Status"))
v.append(visual(p, "clusteredBarChart", 424, 195, 420, 255, {"Category": ["dim_customer.customer_segment"], "Y": ["Customer Count"]},
                "Customers by Segment", sort=("Customer Count", "desc")))
v.append(visual(p, "clusteredColumnChart", 856, 195, 412, 255, {"Category": ["dim_customer.age_group"], "Y": ["Total Revenue"]},
                "Revenue by Age Group", sort=("dim_customer.age_group", "asc")))
v.append(visual(p, "clusteredBarChart", 12, 462, 620, 250, {"Category": ["dim_customer.city"], "Y": ["Total Revenue"]},
                "Revenue by Customer City", sort=("Total Revenue", "desc")))
v.append(visual(p, "pivotTable", 644, 462, 624, 250,
                {"Rows": ["dim_customer.customer_segment"], "Columns": ["dim_customer.churn_status"], "Values": ["Customer Count"]},
                "Segment × Churn Status"))
pages.append((p, v))

# 5. Promotions
p = "Promotions & Pricing"
v = header(p, "Promotion Effectiveness", "ROI, discount leakage and promotion traps")
v += kpis(p, ["Promo Revenue", "Discount Given", "Promo Share %", "Promo ROI", "Promo Orders"])
v.append(visual(p, "clusteredBarChart", 12, 195, 620, 255, {"Category": ["dim_promotion.promo_name"], "Y": ["Promo ROI"]},
                "ROI by Promotion", sort=("Promo ROI", "desc")))
v.append(visual(p, "clusteredColumnChart", 644, 195, 624, 255,
                {"Category": ["dim_promotion.promo_type"], "Y": ["Promo Revenue", "Discount Given"]},
                "Revenue vs Discount by Promo Type"))
v.append(visual(p, "tableEx", 12, 462, 1256, 250,
                {"Values": ["dim_promotion.promo_name", "dim_promotion.promo_type", "dim_promotion.discount_percentage",
                            "dim_promotion.is_promotion_trap", "Promo Orders", "Promo Revenue", "Discount Given", "Promo ROI"]},
                "Promotion Scorecard (is_promotion_trap = discount too deep)", sort=("Promo ROI", "desc")))
pages.append((p, v))

# 6. Wastage & Inventory
p = "Wastage & Inventory"
v = header(p, "Wastage & Inventory Control", "Where food cost is lost and what needs reordering")
v += kpis(p, ["Wastage Cost", "Wastage Qty", "Wastage % of Cost", "Stock Value", "Items To Reorder"])
v.append(visual(p, "lineChart", 12, 195, 620, 255, {"Category": ["dim_date.year_month"], "Y": ["Wastage Cost"]},
                "Wastage Cost Trend", sort=("dim_date.year_month", "asc")))
v.append(visual(p, "donutChart", 644, 195, 624, 255, {"Category": ["fact_wastage.wastage_reason"], "Y": ["Wastage Cost"]},
                "Wastage by Reason"))
v.append(visual(p, "clusteredBarChart", 12, 462, 620, 250, {"Category": ["dim_menu_item.item_name"], "Y": ["Wastage Cost"]},
                "Top 10 Wasted Items", sort=("Wastage Cost", "desc"), top=("dim_menu_item.item_name", 10, "Wastage Cost")))
v.append(visual(p, "clusteredBarChart", 644, 462, 624, 250,
                {"Category": ["dim_restaurant.restaurant_name"], "Y": ["Stock Value", "Wastage Cost"]},
                "Stock Value vs Wastage by Outlet", sort=("Stock Value", "desc")))
pages.append((p, v))

# 7. Locations
p = "Locations & Channels"
v = header(p, "Location & Channel Performance", "20 outlets across cities · dine-in, delivery, takeaway")
v += kpis(p, ["Total Revenue", "Total Orders", "Avg Rating", "Avg Basket Size", "Cancellation Rate"])
v.append(visual(p, "clusteredBarChart", 12, 195, 620, 517, {"Category": ["dim_restaurant.restaurant_name"], "Y": ["Total Revenue"]},
                "Revenue by Outlet", sort=("Total Revenue", "desc")))
v.append(visual(p, "clusteredColumnChart", 644, 195, 624, 255,
                {"Category": ["dim_restaurant.location_city"], "Y": ["Total Revenue"]},
                "Revenue by City", sort=("Total Revenue", "desc")))
v.append(visual(p, "pivotTable", 644, 462, 624, 250,
                {"Rows": ["dim_restaurant.location_city"], "Columns": ["fact_orders.order_channel"], "Values": ["Total Orders"]},
                "Orders: City × Channel"))
pages.append((p, v))

known = {f"{t['name']}.{c['name']}" for t in tables for c in t["columns"]} | {m[0] for m in MEASURES}
for _, vcs in pages:
    for vc in vcs:
        for sel in json.loads(vc["config"])["singleVisual"].get("prototypeQuery", {}).get("Select", []):
            n = sel["Name"].replace("_Measures.", "")
            assert n in known, f"unknown field {n}"

sections = []
for i, (name, vcs) in enumerate(pages):
    for z, vc in enumerate(vcs):
        vc["z"] = z * 1000
        cfg = json.loads(vc["config"])
        cfg["layouts"][0]["position"]["z"] = z * 1000
        vc["config"] = json.dumps(cfg)
    sections.append({
        "name": vid("section", name), "displayName": name, "displayOption": 1, "ordinal": i,
        "width": W, "height": H, "filters": "[]",
        "config": json.dumps({"objects": {"background": [{"properties": {"color": color(BG), "transparency": lit(0)}}],
                                          "outspace": [{"properties": {"color": color(BG)}}]}}),
        "visualContainers": vcs})

report = {
    "config": json.dumps({"version": "5.43", "themeCollection": {}, "activeSectionIndex": 0,
                          "defaultDrillFilterOtherVisuals": True, "linguisticSchemaSyncVersion": 0,
                          "settings": {"useNewFilterPaneExperience": True, "allowChangeFilterTypes": True,
                                       "useStylableVisualContainerHeader": True, "exportDataMode": 1},
                          "objects": {"outspacePane": [{"properties": {"expanded": lit(False)}}]}}),
    "layoutOptimization": 0,
    "resourcePackages": [],
    "sections": sections,
}

# ---------------------------------------------------------------- WRITE
sm, rp = OUT / f"{NAME}.SemanticModel", OUT / f"{NAME}.Report"
sm.mkdir(parents=True, exist_ok=True)
rp.mkdir(parents=True, exist_ok=True)
(OUT / f"{NAME}.pbip").write_text(json.dumps({
    "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
    "version": "1.0", "artifacts": [{"report": {"path": f"{NAME}.Report"}}],
    "settings": {"enableAutoRecovery": True}}, indent=2))
(sm / "definition.pbism").write_text(json.dumps({"version": "1.0", "settings": {}}, indent=2))
(sm / "model.bim").write_text(json.dumps(model, indent=2))
(rp / "definition.pbir").write_text(json.dumps({
    "version": "1.0", "datasetReference": {"byPath": {"path": f"../{NAME}.SemanticModel"}, "byConnection": None}}, indent=2))
(rp / "report.json").write_text(json.dumps(report, indent=2))
(OUT / ".gitignore").write_text("**/.pbi/localSettings.json\n**/.pbi/cache.abf\n")
print(f"Wrote {OUT}: {len(tables)} tables, {len(relationships)} relationships, {len(MEASURES)} measures, "
      f"{len(pages)} pages, {sum(len(v) for _, v in pages)} visuals")
