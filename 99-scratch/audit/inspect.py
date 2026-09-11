import json, os
S = "/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/SKOOL COMMUNITIES/AI Advantage (Realtors)"
c = json.load(open(os.path.join(S,"16_production_data","curriculum.json")))
print("curriculum type:", type(c))
if isinstance(c, dict):
    print("keys:", list(c.keys()))
    courses = c.get("courses", c)
else:
    courses = c
print("n courses:", len(courses))
print("course keys:", list(courses[0].keys()))
tot=0
for co in courses:
    ls=co.get("lessons",[])
    tot+=len(ls)
    print(co.get("course_number"), "|", co.get("slug"), "|", co.get("title"), "| lessons:", len(ls), "| folder:", co.get("folder"))
print("total lessons:", tot)
print("\n--- sample course 1 ---")
print(json.dumps({k:v for k,v in courses[1].items() if k!="lessons"}, indent=1)[:2000])
print("\n--- sample lesson ---")
l = courses[1]["lessons"][0]
print("lesson keys:", list(l.keys()))
print(json.dumps(l, indent=1)[:2500])
