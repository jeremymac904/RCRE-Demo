import json, os, re, sys

SRC = "/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/SKOOL COMMUNITIES/AI Advantage (Realtors)"
APP = "/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE/apps/rcre-demo"
PUB = os.path.join(APP, "public")
OUT = os.path.join(APP, "src", "data", "academy.ts")

cur = json.load(open(os.path.join(SRC, "16_production_data", "curriculum.json")))
courses = cur["courses"]

# ---- parse the paste-ready Skool course files for full (unshortened) lesson descriptions
def parse_course_md(path):
    t = open(path, encoding="utf-8").read()
    m = re.search(r"## Skool course description\s*\n```\n(.*?)\n```", t, re.S)
    cdesc = m.group(1).strip() if m else ""
    tier = re.search(r"\*\*Tier:\*\*\s*(.+)", t)
    tier = tier.group(1).strip() if tier else ""
    lessons = {}
    for blk in re.split(r"\n### Lesson ", t)[1:]:
        num = int(re.match(r"(\d+)", blk).group(1))
        d = re.search(r"\*\*Skool lesson description\*\*\s*\n```\n(.*?)\n```", blk, re.S)
        lessons[num] = d.group(1).strip() if d else ""
    return cdesc, tier, lessons

md_dir = os.path.join(SRC, "13_skool_build", "courses")
md = {}
for fn in os.listdir(md_dir):
    m = re.match(r"^(\d\d)_", fn)
    if m and fn.endswith(".md"):
        n = int(m.group(1))
        if n >= 1:
            md[n] = parse_course_md(os.path.join(md_dir, fn))

LEVEL = {1:"Foundation",2:"Foundation",3:"Foundation",
         4:"Practitioner",5:"Practitioner",6:"Practitioner",7:"Practitioner",8:"Practitioner",
         9:"Advanced",10:"Advanced",11:"Advanced",12:"Advanced",13:"Advanced",14:"Advanced"}

# Public recruiting preview: ONLY where the source designates the whole course Free.
# ALL_COURSES_INDEX.md tiers: 1 Free, 2 Free, 14 Free (Elite teaser).
# Course 3 is "Free (Twin Lite) / Premium (full)" -> mixed, so NOT a whole-course public preview.
PUBLIC = {1, 2, 14}

COVER_SLUG = {}  # course_number -> cover filename stem
for fn in sorted(os.listdir(os.path.join(SRC, "08_course_graphics", "course_covers"))):
    m = re.match(r"^(\d\d)_(.+)_cover\.png$", fn)
    if m:
        COVER_SLUG[int(m.group(1))] = (m.group(1) + "_" + m.group(2)).replace("_", "-")

HANDOUT = {  # course -> (copied filename, source filename)
 1:"01-chatgpt-and-personalization",  # placeholder, fixed below
}
def slugpdf(name): return name[:-4].lower().replace("_", "-") + ".pdf"

COURSE_HANDOUT_SRC = {
 1:"01_ChatGPT_Setup_and_Personalization_Handout.pdf",
 2:"02_Prompting_for_Real_Estate_Handout.pdf",
 3:"03_Build_Your_Realtor_AI_Twin_Handout.pdf",
 4:"04_Real_Estate_Marketing_Pro_Handout.pdf",
 5:"05_Listing_Marketing_and_Visuals_Handout.pdf",
 6:"06_Virtual_Staging_Studio_Handout.pdf",
 7:"07_Realtor_Coach_and_Sales_Roleplay_Handout.pdf",
 8:"08_CMA_and_Market_Analysis_Assistant_Handout.pdf",
 9:"09_Credit_Boost_Assistant_Handout.pdf",
 10:"10_Bookkeeping_and_Self_Employed_Clients_Handout.pdf",
 11:"11_Real_Estate_Investor_Master_Handout.pdf",
 12:"12_Bonus_Tax_Preparation_Side_Hustle_Handout.pdf",
 13:"13_Bonus_Credit_Services_Side_Hustle_Handout.pdf",
 14:"14_AI_Advantage_Elite_Preview_Handout.pdf",
}
COURSE_EXTRA_SRC = {  # topical cheat sheet / checklist / scorecard
 1:("ChatGPT_Setup_Checklist.pdf","ChatGPT Setup Checklist"),
 2:("Real_Estate_Prompting_Cheat_Sheet.pdf","Real Estate Prompting Cheat Sheet"),
 3:("Build_Your_Realtor_AI_Twin_Checklist.pdf","Build Your Realtor AI Twin Checklist"),
 4:("Real_Estate_AI_Marketing_Cheat_Sheet.pdf","Real Estate AI Marketing Cheat Sheet"),
 5:("AI_Listing_Visual_Checklist.pdf","AI Listing Visual Checklist"),
 6:("Virtual_Staging_Cheat_Sheet.pdf","Virtual Staging Cheat Sheet"),
 7:("Realtor_Coach_Weekly_Scorecard.pdf","Realtor Coach Weekly Scorecard"),
 8:("AI_CMA_and_Pricing_Cheat_Sheet.pdf","AI CMA and Pricing Cheat Sheet"),
 9:("Credit_Conversation_Cheat_Sheet.pdf","Credit Conversation Cheat Sheet"),
 10:("Bookkeeping_and_Self_Employed_Buyer_Cheat_Sheet.pdf","Bookkeeping and Self Employed Buyer Cheat Sheet"),
 11:("Real_Estate_Investor_AI_Cheat_Sheet.pdf","Real Estate Investor AI Cheat Sheet"),
 12:("Tax_Preparation_Side_Hustle_Launch_Checklist.pdf","Tax Preparation Side Hustle Launch Checklist"),
 13:("Credit_Services_Side_Hustle_Launch_Checklist.pdf","Credit Services Side Hustle Launch Checklist"),
 14:("AI_Advantage_Elite_Workshop_Roadmap.pdf","AI Advantage Elite Workshop Roadmap"),
}
COURSE_ZIP_SRC = {
 3:("01_My_Realtor_AI_Twin.zip","My Realtor AI Twin — project files"),
 4:("02_Real_Estate_Marketing_Project.zip","Real Estate Marketing — project files"),
 5:("03_Listing_Visual_Project.zip","Listing Visual — project files"),
 6:("04_Virtual_Staging_Project.zip","Virtual Staging — project files"),
 7:("05_Realtor_Coach_Project.zip","Realtor Coach — project files"),
 8:("06_CMA_Market_Analysis_Project.zip","CMA and Market Analysis — project files"),
 9:("07_Credit_Mortgage_Readiness_Project.zip","Credit and Mortgage Readiness — project files"),
 10:("08_Real_Estate_Bookkeeping_Project.zip","Real Estate Bookkeeping — project files"),
 11:("09_Real_Estate_Investor_Project.zip","Real Estate Investor — project files"),
 12:("10_Tax_Preparation_AI_Project.zip","Tax Preparation AI — project files"),
 13:("11_Credit_Services_AI_Project.zip","Credit Services AI — project files"),
}
def zipslug(n): return n[:-4].lower().replace("_", "-") + ".zip"

def size(rel):
    p = os.path.join(PUB, rel.lstrip("/"))
    return os.path.getsize(p)

# Videos actually present (Course Production/Course_01)
VIDEO = {
 (1,1): dict(src="/academy/video/c01-l01.mp4", captions="/academy/video/c01-l01.vtt", seconds=196,
             sourcePath="Course Production/Course_01/Lesson_01/Final/AI_Advantage_C01_L01_Settings_and_Personalization.mp4"),
 (1,7): dict(src="/academy/video/c01-l07.mp4", captions="/academy/video/c01-l07.vtt", seconds=79,
             sourcePath="Course Production/Course_01/Lesson_07/Final/AI_Advantage_C01_L07_Privacy_and_Common_Sense.mp4"),
}

out_courses, out_lessons = [], []
tot_prompts = tot_handouts = tot_downloads = tot_video = 0

for co in courses:
    cn = co["course_number"]
    cid = "c%02d" % cn
    cdesc, tier, ldesc = md[cn]
    ncount = 0
    course_prompts = 0
    course_resources = 0
    lessons = co["lessons"]
    last = len(lessons)
    for ln in lessons:
        n = ln["lesson_number"]
        lid = "%s-l%02d" % (cid, n)
        res = []
        if n == 1:
            h = COURSE_HANDOUT_SRC[cn]
            href = "/academy/handouts/" + slugpdf(h)
            res.append(dict(kind="handout", title=co["title"] + " — course handout", href=href,
                            bytes=size(href), format="PDF",
                            sourcePath="11_handouts_branded/pdf/" + h))
            if cn == 1:
                res.append(dict(kind="workbook", title="AI Advantage Student Workbook (50 pages)",
                                href="/academy/handouts/ai-advantage-student-workbook.pdf",
                                bytes=size("/academy/handouts/ai-advantage-student-workbook.pdf"),
                                format="PDF",
                                sourcePath="11_handouts_branded/workbook/AI_Advantage_Student_Workbook.pdf"))
                res.append(dict(kind="template", title="Realtor AI Starter Kit",
                                href="/academy/downloads/realtor-ai-starter-kit.zip",
                                bytes=size("/academy/downloads/realtor-ai-starter-kit.zip"), format="ZIP",
                                sourcePath="12_student_downloads/starter_kit/Realtor_AI_Starter_Kit.zip"))
        if n == last:
            e, etitle = COURSE_EXTRA_SRC[cn]
            href = "/academy/handouts/" + slugpdf(e)
            res.append(dict(kind="handout", title=etitle, href=href, bytes=size(href), format="PDF",
                            sourcePath="11_handouts_branded/pdf/" + e))
            if cn in COURSE_ZIP_SRC:
                z, ztitle = COURSE_ZIP_SRC[cn]
                href = "/academy/downloads/" + zipslug(z)
                res.append(dict(kind="download", title=ztitle, href=href, bytes=size(href), format="ZIP",
                                sourcePath="12_student_downloads/project_zips/" + z))
            if cn == 2:
                res.append(dict(kind="prompt-pack", title="AI Advantage Master Prompt Library (220 prompts)",
                                href="/academy/downloads/ai-advantage-master-prompt-library.md",
                                bytes=size("/academy/downloads/ai-advantage-master-prompt-library.md"), format="MD",
                                sourcePath="12_student_downloads/prompt_library/AI_Advantage_Master_Prompt_Library.md"))
            if cn == 4:
                res.append(dict(kind="prompt-pack", title="Local Authority Content Prompts",
                                href="/academy/downloads/local-authority-content-prompts.md",
                                bytes=size("/academy/downloads/local-authority-content-prompts.md"), format="MD",
                                sourcePath="12_student_downloads/prompt_library/Local_Authority_Content_Prompts.md"))
            if cn in (12, 13):
                res.append(dict(kind="download", title="Legal and Compliance Pack",
                                href="/academy/downloads/legal-and-compliance-pack.zip",
                                bytes=size("/academy/downloads/legal-and-compliance-pack.zip"), format="ZIP",
                                sourcePath="12_student_downloads/bundles/Legal_and_Compliance_Pack.zip"))
        pc = len(ln.get("prompts") or [])
        course_prompts += pc
        course_resources += len(res)
        tot_prompts += pc
        tot_handouts += sum(1 for r in res if r["kind"] in ("handout", "workbook"))
        tot_downloads += sum(1 for r in res if r["kind"] in ("download", "template", "prompt-pack"))
        v = VIDEO.get((cn, n))
        img = "/academy/cards/c%02d-l%02d.webp" % (cn, n)
        assert os.path.exists(os.path.join(PUB, img.lstrip("/"))), img
        lesson = dict(
            id=lid, courseId=cid, order=n, title=ln["lesson_title"],
            description=ldesc[n], status=("ready" if v else "in-production"),
            image=img, resources=res, promptCount=pc,
            sourcePath="AI_Advantage_RE_Agents_Master_Package/00_Master_Curriculum · %s / Lesson %d" % (co["folder"], n),
        )
        if v:
            tot_video += 1
            lesson["video"] = dict(src=v["src"], poster=img, captions=v["captions"], seconds=v["seconds"])
            lesson["videoSource"] = v["sourcePath"]
        out_lessons.append(lesson)
        ncount += 1
    cover = "/academy/covers/%s.webp" % COVER_SLUG[cn]
    assert os.path.exists(os.path.join(PUB, cover.lstrip("/"))), cover
    out_courses.append(dict(
        id=cid, order=cn, title=co["title"], slug=co["slug"].replace("_", "-"),
        description=co["course_goal"], level=LEVEL[cn], cover=cover,
        lessonCount=ncount, promptCount=course_prompts, resourceCount=course_resources,
        publicPreview=(cn in PUBLIC),
        sourcePath="AI_Advantage_RE_Agents_Master_Package/00_Master_Curriculum · " + co["folder"],
        tier=tier,
    ))

def ts(v, ind=0):
    sp = "  " * ind
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    if v is None: return "undefined"
    if isinstance(v, str):
        return "'" + v.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'"
    if isinstance(v, list):
        if not v: return "[]"
        return "[\n" + "".join(sp + "  " + ts(x, ind+1) + ",\n" for x in v) + sp + "]"
    if isinstance(v, dict):
        return "{\n" + "".join(sp + "  " + k + ": " + ts(x, ind+1) + ",\n" for k, x in v.items()) + sp + "}"
    raise TypeError(v)

# strip helper key not in the contract
for c in out_courses: c.pop("tier", None)
for l in out_lessons: l.pop("videoSource", None)

totals = dict(courses=len(out_courses), lessons=len(out_lessons), prompts=tot_prompts,
              handouts=tot_handouts, downloads=tot_downloads, lessonsWithVideo=tot_video)

# demo progress: course 1 complete, course 2 partway
completed = ["c01-l%02d" % i for i in range(1, 9)] + ["c02-l%02d" % i for i in range(1, 5)]

header = '''/**
 * RCRE Academy — real course data.
 *
 * GENERATED, NOT AUTHORED. Every title, description, prompt count, cover, and
 * resource below is read out of Jeremy's "AI Advantage for Real Estate Agents"
 * production workspace. Nothing here is invented. See
 * RCRE/training-assets/PROVENANCE.md for what was copied and what was not.
 *
 * Course and lesson text: 16_production_data/curriculum.json (the approved
 * curriculum, 14 courses / 181 lessons) plus the paste-ready Skool copy in
 * 13_skool_build/courses/, which carries the FULL lesson descriptions in
 * Jeremy's own words. (13_skool_build/lessons/ALL_LESSON_DESCRIPTIONS.md holds
 * the same descriptions truncated to fit a flat table; the source README says
 * do not shorten Jeremy's voice, so the untruncated copy is used here.)
 *
 * Video: the workspace README says nothing has been recorded or rendered. That
 * is true of 179 of the 181 lessons. Two lessons in Course 1 DO have finished
 * renders with captions under `Course Production/Course_01/.../Final/`, and
 * those two are the only lessons marked 'ready'. No other lesson gets a player.
 */

import type { AcademyIndex, AcademyProgress } from './academy-types'

'''

body = header
body += "export const academy: AcademyIndex = {\n"
body += "  courses: " + ts(out_courses, 1) + ",\n"
body += "  lessons: " + ts(out_lessons, 1) + ",\n"
body += "  totals: " + ts(totals, 1) + ",\n"
body += "}\n\n"
body += "/** Deterministic demo progress: Course 1 finished, Course 2 four lessons in. */\n"
body += "export const demoProgress: AcademyProgress = {\n"
body += "  completedLessonIds: " + ts(completed, 1) + ",\n"
body += "  lastViewedLessonId: 'c02-l05',\n"
body += "}\n\n"
body += "export default academy\n"

open(OUT, "w", encoding="utf-8").write(body)
print("wrote", OUT)
print(json.dumps(totals, indent=1))
print("public preview courses:", [c["id"] for c in out_courses if c["publicPreview"]])
