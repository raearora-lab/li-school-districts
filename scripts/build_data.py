"""Build public/data/districts.json and boundaries.geojson from /workspace/li-schools sources."""
import csv, json, shapefile
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
SRC = "/workspace/li-schools"
rows = list(csv.DictReader(open(f"{SRC}/li_districts.csv")))
def num(v):
    if v in ("", None): return None
    f = float(v); return int(f) if f.is_integer() else f
out = []
for r in rows:
    cur = r["nysed_enroll_year"] == "2025-26"
    bud27, enr27 = num(r["budget_2026_27"]), num(r["ptrc_enroll_2026_27"])
    out.append(dict(
        id=r["nces_leaid"], beds=r["beds"], name=r["district"], county=r["county"],
        pk12=num(r["enroll_pk12"]) if cur else None, k12=num(r["enroll_k12"]) if cur else None,
        k12chg=num(r["enroll_chg_pct"]) if cur else None, k12prev=num(r["enroll_k12_prev"]) if cur else None,
        enr26=num(r["ptrc_enroll_2025_26"]), enr27=enr27,
        bud26=num(r["budget_2025_26"]), bud27=bud27, budchg=num(r["budget_chg_pct"]),
        levy26=num(r["levy_2025_26"]), levy27=num(r["levy_2026_27"]), levychg=num(r["levy_chg_pct"]),
        cap=num(r["levy_vs_cap_2026_27"]), fb=num(r["unrestricted_fb_pct_2026_27"]),
        revote=r["revote"] == "True",
        pp=round(bud27 / enr27) if bud27 and enr27 else None,
        lpp=num(r["levy_per_pupil_2026_27"]),
        lat=float(r["office_lat"]), lon=float(r["office_lon"]), office=r["office_address"],
    ))
json.dump(out, open("public/data/districts.json", "w"), separators=(",", ":"))
ids = {d["id"] for d in out}
# county land (Nassau 36059, Suffolk 36103)
cr = shapefile.Reader(f"{SRC}/geo/cb_2023_us_county_500k.shp")
land = unary_union([shape(s.shape.__geo_interface__) for s in cr.iterShapeRecords() if s.record["GEOID"] in ("36059", "36103")])
feats = []
for t in ("unsd", "elsd", "scsd"):
    sr = shapefile.Reader(f"{SRC}/geo/tl_2024_36_{t}.shp")
    for s in sr.iterShapeRecords():
        g = s.record["GEOID"]
        if g not in ids or t == "scsd": continue
        geom = shape(s.shape.__geo_interface__).intersection(land).simplify(0.0006, preserve_topology=True)
        if geom.is_empty: continue
        gj = mapping(geom)
        def rnd(c):
            return [rnd(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 5), round(c[1], 5)]
        gj = {"type": gj["type"], "coordinates": rnd(gj["coordinates"])}
        feats.append({"type": "Feature", "properties": {"id": g}, "geometry": gj})
json.dump({"type": "FeatureCollection", "features": feats}, open("public/data/boundaries.geojson", "w"), separators=(",", ":"))
print(len(out), "districts;", len(feats), "boundaries; missing:", sorted(d["name"] for d in out if d["id"] not in {f["properties"]["id"] for f in feats}))
