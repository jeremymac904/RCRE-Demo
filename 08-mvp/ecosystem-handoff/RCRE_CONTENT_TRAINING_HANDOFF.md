# RCRE content, community and AI Academy handoff

Documentation audit 2026-09-17. Canonical application: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE/apps/rcre-demo`, verified by `scripts/local.mjs`. Shared root/remote/branch/baseline and local working-tree caveat are in the repository manifest and portal handoff. Baseline GitHub locator: https://github.com/jeremymac904/RCRE-Demo/tree/d4ae90d8f40edcff3a2e5996ab0267e6c56c8966 . This task did not change source, content, original assets or external projects.

All paths below are RCRE-root-relative; `src/` means `apps/rcre-demo/src/` and `tests/` means `apps/rcre-demo/tests/`. Important absolute roots: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE/training-assets/protected` and `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE/runtime/academy-uploads`. These are controlled resources, not an authorized redistribution bundle.

## Source of truth and evidence

The actual import is `src/data/academy.ts`; its contract is `src/data/academy-types.ts`. Sanitized presentation/access derivation is `src/lib/academy.ts`; durable feature state is `src/lib/academy-service.ts`. The latter persists through the shared PostgreSQL/isolated-test store. The old types comment saying progress is demo-local and the September 8 register's SQLite heading are stale descriptions of persistence; current service and launcher are authoritative.

`08-mvp/academy-build-register.md` records 14 real imported courses, 181 lessons, 220 prompts, 29 handouts, 16 downloads, 243 unique referenced resources, two final MP4s with two VTT tracks and 179 lessons without final video. `08-mvp/academy-source-integrity.json` records targeted original checksums/sizes/mtimes. No unprovided recording may be replaced with a pretend player or claimed as produced. Import totals describe curriculum/resources, not 181 finished videos.

Existing evidence: `runtime/academy-browser-evidence/result.json`, `authoring-result.json`, `lesson-desktop-light.png`, `lesson-mobile-dark.png`, `community-mobile.png`, `academy-manager-desktop.png`, `custom-course-assignment.png`; verifier source `apps/rcre-demo/scripts/verify-academy-assets.mjs`, `verify-academy-http.py`. Private runtime artifacts are local evidence and must not be copied wholesale into a public handoff. This audit did not rerun these checks. The latest consolidated report is `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md`; individual regression source remains useful for reproduction.

## Capability inventory

| Capability | Status | Concrete source-backed behavior and evidence |
|---|---|---|
| Classroom/catalog/course/lesson navigation | PROVEN LOCAL | `/training`, `/training/classroom`, course/lesson routes; `src/lib/academy.ts`, `src/components/Academy{CatalogCard,LessonNavigator,LessonStage}.tsx`; real imported text/resources, search/order/filter, resume and honest missing-video states. Academy register + browser screenshots |
| Imported final lesson videos and captions | PROVEN LOCAL | Two actual MP4s/two VTTs with byte-range playback, not animation stand-ins. `src/components/AcademyVideo.tsx`, `src/lib/academy-media.ts`, direct media API; register records actual playback advancing |
| Remaining lesson video production | BLOCKED EXTERNAL DEPENDENCY | 179 missing finals require original recordings/production and approval. Import metadata/register; absence is not a software delivery claim |
| Lesson resources/prompt library | PROVEN LOCAL | Authenticated PDF/ZIP/MD/other registered references, prompt read/copy, protected download delivery; `src/components/Academy{ResourceList,LessonTools}.tsx`, `src/app/api/academy/media/[...asset]/route.ts`, `src/app/training/classroom/[courseId]/[lessonId]/page.tsx` (server-projected prompt text); asset/HTTP verifiers |
| Progress/bookmarks/resume | PROVEN LOCAL | `academy_progress` keyed organization+owner; completion/undo, positions and last-viewed persist on server, course access enforced on update. `src/lib/academy-service.ts`, `src/components/AcademyProgressProvider.tsx`, progress API; `tests/academy-functional.test.ts` |
| Assignments/reminders/exemptions | PROVEN LOCAL | Trainer/owner assigns published courses to all/agent/role/market/office/team/lead-source targets, due date and exemption; reminders produce local notifications honoring quiet hours/preferences. `manageAcademy`, `assignmentsFor`, `assignmentMatches`; authoring evidence + academy tests. No email delivery |
| Authoring/revisions/publication review | PROVEN LOCAL | `AcademyManager`, manage API: custom course text/resources/order/imported prerequisite; draft/review/published/archive, optimistic version, revision snapshots. Latest editor/submitter cannot self-publish; exact title/body/order/prerequisite/resources remain bound. `tests/unit/academy-review-regressions.test.ts`, `academy-review-queue.test.ts` |
| Private authored resources | PROVEN LOCAL | `src/lib/academy-uploads.ts`, upload/resource APIs: PDF/images/MP4/VTT/plain text with limits/signature checks, scope/enrollment/prerequisite/publication checks and media ranges. Authoring browser evidence |
| Course entitlements/public preview | PROVEN LOCAL | Role policy applies to course content and direct assets. Public preview requires both source-marked Free course and explicit organization opt-in. Protected workbooks/resource bundles remain private. `courseAllowed`, `publicCourseAllowed`, media API, `TrainingAccess`; academy tests/HTTP register |
| Organization community | PROVEN LOCAL | `/training/community`; create/edit own post, drafts, comments, reactions, trainer/owner pin/delete moderation and category controls. `src/lib/academy-community.ts`; `CommunityFeed`; academy-functional/browser evidence |
| Community private attachments | PROVEN LOCAL | `src/lib/academy-attachments.ts`: PDF/PNG/JPEG up to 5 MB, signature/type checks; uploader or eligible published-post viewers only. Attachment API, community browser upload evidence |
| Malware scanning and automatic moderation/compliance certification | BLOCKED EXTERNAL DEPENDENCY | Signature/size checks and human moderation do not supply scanning or legal approval; explicit register limitation |
| Consent-based recruiting learning evidence | PROVEN LOCAL | `src/lib/platform/recruiting.ts`: learner opt-in required to link profile/derive completion/public post/preview counts; revoked consent hides projection. `tests/unit/recruiting-access.test.ts`; no secret reading of private drafts |
| Agent/team onboarding through course assignment | PROVEN LOCAL | Targeted assignments plus local onboarding/invitation state can guide onboarding. `academy-service.ts`, `src/lib/platform/access.ts`, `recruiting.ts`; no claim of externally delivered invitations |
| AI education catalog | PROVEN LOCAL | Actual imported AI curriculum/prompt resources; no generated replacement curriculum. `src/data/academy.ts`, source integrity manifest |
| AI tutoring, automatic grading, certifications, SCORM/LTI | NOT IMPLEMENTED | Inspected academy contracts have lesson completion/progress and authored text, not assessments, verified credentials, LMS interoperability or autonomous tutoring |
| Universal brokerage knowledge ingestion/RAG | NOT IMPLEMENTED | Course/prompt rendering is not a general document ingestion, vector index or retrieval-permission system. Academy source boundary and data contracts demonstrate this distinction |
| AI Realtor Pro reusable Academy product | PLANNED | Architecture is an extraction candidate; this task does not move content, build tenant onboarding, create a Skill or modify AI Realtor Pro |

No `PROVEN AUTHORIZED SANDBOX` entry is supported for this domain. Existing imported real content is not simulated, but demonstration learner identities/progress used in tests are **SIMULATED**; never advertise test completion as real agent training performance.

## Contracts and scopes

- `AcademyCourse`: id/order/title/slug/description/level/cover/lessonCount/promptCount/resourceCount/publicPreview; `sourcePath` is maintainer-only provenance.
- `AcademyLesson`: id/courseId/order/title/description/status, optional actual video/src/captions/duration, image, resources and promptCount. Optional media is deliberate.
- `AcademyResource`: kind/title/href/bytes/format and private sourcePath; route through entitlement checks rather than converting private delivery into public asset paths.
- `Progress`: organizationId/ownerId, completedLessonIds, bookmarks, positions, lastViewedLessonId, updatedAt. Completion is user-recorded, not proof of comprehension or attendance.
- `AcademyDraft`: owner/organization, current version, title/body/resources/order/prerequisite, status, lastEditedBy/submittedBy/reviewedBy and revisions. Authored courses currently use one course-text unit as their completion ID; this is not a full nested multi-lesson authoring studio.
- `Assignment`: courseId/targetType/target/due/exemptions/remindedAt and owner/organization. Assignment targeting and enrollment authorization are separate concerns; an assignment does not override a denied course role policy.
- `CoursePolicy`: organization-scoped roles and publicPreview. Imported config stores course order and community categories.
- `Post`: organization/author/category/title/body/lesson link, draft/pinned flags, likes, comments and attachment references. Private drafts are author-only. Moderator is trainer/owner, not any role with a generic leadership capability string.

Every role may learn and participate subject to course policy. Only trainer and broker_owner author/manage/moderate. Managers can see organization learning progress for assignment administration. Recruiting receives only explicitly consented projections. Do not turn organizational manager access into a public progress feed or an AI-provider export.

## Rights and nonredistribution

Reusable implementation code and permission patterns are separate from permission to redistribute curriculum. The source describes Jeremy's existing “AI Advantage for Real Estate Agents” curriculum. That provenance is not an open-source content license, transfer of student assets, or authority to publish paid lessons through AI Realtor Pro. Preserve originals and attribution; obtain explicit course/resource/publication rights for each new tenant/destination.

Do not include protected media, prompt packs, workbooks, downloaded ZIPs, student uploads, community attachments, private posts, learner records or source workspace paths in a generic Skill/package/public GitHub demo. PublicPreview is an entitlement setting constrained by source designation, not evidence of rights for all materials. Student-facing projection strips sourcePath; maintain that boundary. Preserve the known original checksums rather than re-encoding or rewriting source during extraction.

The website ecosystem should first reproduce the system using a tiny synthetic course with original text, a clearly synthetic video/resource and synthetic learners. Separately authorize any migration of real curriculum. Marketing rights declarations and instructor-upload signatures do not certify content ownership.

## Extraction recommendation and gates

Candidate Skill: `realtor-ai-academy-builder` limited to catalog, protected resource delivery, durable progress, assignments and reviewed text-course authoring. Candidate community module belongs with the same entitlement/auth adapter. Source candidates counted in the portal handoff: AcademyManager, AcademyProgressProvider, AcademyLessonStage and CommunityFeed; related renderer components are dependencies, not separately counted products.

Inputs: tenant identity/brand, approved curriculum manifest, source-rights/public-preview declarations, course-role policy, assignment vocabulary, authors/reviewers, resource storage root/provider, limits/scanning policy and notification preferences. Keep RCRE-specific people, source directories, curriculum bytes and operating policy outside generic implementation.

Required reproduction checks: all seven learner roles, foreign-organization denial, role-restricted custom text and media denial, direct resource traversal/ranges, unauthorized prompt access, no public paid resources, private draft/attachment access, progress persistence and isolation, latest-editor independent review and exact publication fields, stale revisions, prerequisite behavior, assignment target/exemptions, quiet-hour reminders, learner consent withdrawal, real media playback and both-theme/mobile accessibility. Add concurrent write/conflict tests for progress/community changes before claiming high-concurrency SaaS readiness; current service uses read-modify-write arrays without universal optimistic concurrency.

AI Realtor Pro positioning: **DEMO ONLY** for a synthetic Academy walkthrough; **NEEDS EXTRACTION** for repeatable customized training portals; **NEEDS MORE DEVELOPMENT** for broad hosted LMS/tenant administration; proprietary course availability remains separately rights-gated. A walkthrough may show the local functions, but must not imply all lesson videos exist, completion certifies expertise, or external LMS/AI tutors are connected.
