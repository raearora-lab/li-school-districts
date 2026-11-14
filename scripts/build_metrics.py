"""Merge NYSED outcome and salary metrics into public/data/districts.json and write the CSV.
Sources (all official NYSED):
- 4-year graduation rate: 2025 High School Graduation Rate Researcher File (data.nysed.gov gradrate 24-25),
  '2021 Total Cohort - 4 Year Outcome - August 2025', All Students, district level.
- Grades 3-8 ELA / Math % proficient (Level 3+), 2025: SRC2025 Report Card Database, tables
  'Annual EM ELA' (ELA3_8) and 'Annual EM MATH' (MATH3_8), All Students, YEAR 2025 (2024-25).
- Regents % proficient (Level 3+), 2025: SRC2025 'Annual Regents Exams', Regents Algebra I and
  Regents Common Core English Language Arts, All Students.
- Teacher salary: NYSED Personnel Master File statistical runs 2024-25, sheet SALARY_PERCENTILES_BY_DIST
  (Classroom Teacher, Full Time, 50th percentile = median) and AVG_SALARY (Classroom Teacher, AVG_SAL_FOR_FTE).
"""
import json, csv, pandas as pd
N = "/workspace/li-schools/nysed"
P = "public/data/districts.json"
D = json.load(open(P))
beds = {d["beds"] for d in D}

def dist(df):
    df = df.copy(); df["cd"] = df.ENTITY_CD.astype(str)
    df = df[df.cd.str.endswith("0000") & df.cd.str[:6].isin(beds)]; df["b6"] = df.cd.str[:6]
    return df

def pnum(v):
    s = str(v).strip().rstrip(".").rstrip("%")
    try: return float(s)
    except ValueError: return None

# grade span from NYSED BEDS enrollment (latest year per district)
en = pd.DataFrame(pd.read_pickle("/workspace/li-schools/enr.pkl")["BEDS Day Enrollment"])
en["cd"] = en.ENTITY_CD.astype(str); en = en[en.cd.str.endswith("0000") & en.cd.str[:6].isin(beds)]
en = en.sort_values("YEAR").groupby(en.cd.str[:6]).tail(1)
G = ["PK", "KHALF", "KFULL"] + [str(i) for i in range(1, 13)]
def span(r):
    has = [g for g in G if pd.to_numeric(r.get(g), errors="coerce") and pd.to_numeric(r.get(g), errors="coerce") > 0]
    lab = lambda g: "PK" if g == "PK" else "K" if g.startswith("K") else g
    return (lab(has[0]) + "-" + lab(has[-1])) if has else None, ("12" in has)
SPAN = {r.cd[:6]: span(r) for _, r in en.iterrows()}

gr = pd.read_pickle(f"{N}/grad2025.pkl")
gr = gr[(gr.AGGREGATION_TYPE == "District") & (gr.SUBGROUP_NAME == "All Students") & (gr.MEMBERSHIP_DESC == "2021 Total Cohort - 4 Year Outcome - August 2025")].copy()
gr["b6"] = gr.AGGREGATION_CODE.astype(str).str[:6]; GR = {r.b6: r for _, r in gr.iterrows()}

def em(file, assess):
    x = dist(pd.read_pickle(f"{N}/{file}"))
    x = x[(x.ASSESSMENT_NAME == assess) & (x.SUBGROUP_NAME == "All Students") & (x.YEAR == "2025.")]
    return {r.b6: r for _, r in x.iterrows()}
ELA, MATH = em("Annual_EM_ELA.pkl", "ELA3_8"), em("Annual_EM_MATH.pkl", "MATH3_8")
rg = dist(pd.read_pickle(f"{N}/Annual_Regents_Exams.pkl"))
rg = rg[(rg.SUBGROUP_NAME == "All Students") & (rg.YEAR == "2025.")]
ALG = {r.b6: r for _, r in rg[rg.SUBJECT == "Regents Algebra I"].iterrows()}
RELA = {r.b6: r for _, r in rg[rg.SUBJECT == "Regents Common Core English Language Art"].iterrows()}

sp = pd.read_csv(f"{N}/sal_pct.csv", dtype={"b6": str}); sp = sp[~sp.DISTRICT_NAME.str.contains("CHARTER|ACADEMY|LEADERSHIP|PREP")]
sa = pd.read_csv(f"{N}/sal_avg.csv", dtype={"b6": str}); sa = sa[~sa.DISTRICT_NAME.str.contains("CHARTER|ACADEMY|LEADERSHIP|PREP")]
SP = {r.b6: r for _, r in sp.iterrows()}; SA = {r.b6: r for _, r in sa.iterrows()}

for d in D:
    b = d["beds"]; sp_, hs = SPAN.get(b, (None, False)); d["grades"] = sp_
    g = GR.get(b)
    if g is not None and pnum(g.GRAD_PCT) is not None:
        d.update(grad=pnum(g.GRAD_PCT), gradn=int(g.ENROLL_CNT), regadv=pnum(g.REG_ADV_PCT), dropout=pnum(g.DROPOUT_PCT), grad_flag=None)
    else:
        d.update(grad=None, gradn=None, regadv=None, dropout=None,
                 grad_flag=("No high school" if not hs and sp_ else "Not reported" if g is None else "Suppressed by NYSED"))
    for key, src in (("ela", ELA), ("math", MATH)):
        r = src.get(b)
        if r is None: d[key], d[key + "n"], d[key + "_flag"] = None, None, "Not reported"
        else:
            v = pnum(r.PER_PROF); n = pnum(r.NUM_TESTED)
            d[key], d[key + "n"] = v, (int(n) if n is not None else None)
            d[key + "_flag"] = None if v is not None else ("No students tested" if not n else "Suppressed by NYSED")
    for key, src in (("alg1", ALG), ("rela", RELA)):
        r = src.get(b)
        if r is None: d[key], d[key + "_flag"] = None, ("No high school" if not hs and sp_ else "Not reported")
        else:
            v = pnum(r.PER_PROF); d[key] = v; d[key + "_flag"] = None if v is not None else "Suppressed by NYSED"
    p, a = SP.get(b), SA.get(b)
    d["tsal"] = int(p["50th"]) if p is not None and pd.notna(p["50th"]) else None
    d["tsal_avg"] = int(round(a.AVG_SAL_FOR_FTE)) if a is not None and pd.notna(a.AVG_SAL_FOR_FTE) else None
    d["tcount"] = int(a.TOTAL_STAFF_COUNT) if a is not None and pd.notna(a.TOTAL_STAFF_COUNT) else None
    d["tsal_flag"] = None if d["tsal"] is not None else "Not reported"

json.dump(D, open(P, "w"), separators=(",", ":"))
cols = [("name","District"),("county","County"),("beds","NYSED BEDS code"),("grades","Grades served"),("pk12","Students PK-12 (fall 2025)"),("k12chg","K-12 enrollment change % (1 yr)"),
        ("bud26","Budget 2025-26 ($)"),("bud27","Proposed budget 2026-27 ($)"),("budchg","Budget change %"),("enr27","Budget enrollment 2026-27"),("pp","Budget per pupil 2026-27 ($)"),
        ("levy26","Tax levy 2025-26 ($)"),("levy27","Tax levy 2026-27 ($)"),("levychg","Levy change %"),("cap","Levy vs tax cap ($, negative = over)"),("revote","Revote budget"),
        ("grad","4-yr graduation rate % (2021 cohort, Aug 2025)"),("gradn","Graduation cohort size"),("regadv","Regents w/ Advanced Designation %"),("dropout","Dropout %"),("grad_flag","Graduation note"),
        ("ela","Grades 3-8 ELA % proficient (2025)"),("elan","ELA students tested"),("ela_flag","ELA note"),("math","Grades 3-8 Math % proficient (2025)"),("mathn","Math students tested"),("math_flag","Math note"),
        ("alg1","Regents Algebra I % proficient (2025)"),("alg1_flag","Algebra I note"),("rela","Regents ELA % proficient (2025)"),("rela_flag","Regents ELA note"),
        ("tsal","Median full-time classroom teacher salary 2024-25 ($)"),("tsal_avg","Average classroom teacher salary per FTE 2024-25 ($)"),("tcount","Classroom teachers 2024-25"),("tsal_flag","Salary note"),
        ("office","District office"),("lat","Office lat"),("lon","Office lon")]
with open("public/data/li_school_districts.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow([c[1] for c in cols])
    for d in D: w.writerow(["" if d.get(k) is None else d.get(k) for k, _ in cols])
import collections
for k in ["grad", "ela", "math", "alg1", "rela", "tsal"]:
    fl = collections.Counter(d.get(k + "_flag") for d in D if d[k] is None)
    print(k, "have", sum(d[k] is not None for d in D), "missing", dict(fl))
