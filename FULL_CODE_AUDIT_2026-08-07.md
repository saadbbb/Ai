> **تحديث 2026-08-07 (بعد التدقيق مباشرة):** تم إصلاح البنود الحرجة 1-5 أدناه (تصعيد صلاحيات Owner + ثغرات IDOR الأربع في Orders/Appointments/Notes/Tasks) بناءً على طلب المستخدم. البنود 6-8 (حقول Orders/Appointments الناقصة، ومحرك الأتمتة المتزامن) **لم تُصلَح بعد** — أُبقيت خارج النطاق بناءً على اختيار المستخدم ("الثغرات الأمنية الحرجة فقط"). التفاصيل في نهاية القسم 8.

# تدقيق شامل للمشروع (Full Project Audit) — 2026-08-07

تدقيق مستقل من الصفر، منفّذ بالفحص الفعلي للكود (وليس فقط أسماء الملفات)، عبر 7 عمليات تدقيق متوازية بالإضافة إلى تحقق مباشر (typecheck / lint / test / git). هذا التقرير **منفصل** عن `PROJECT_GAP_ANALYSIS.md` الموجود مسبقًا في المستودع (ذاك تقرير مطابقة-مواصفات؛ هذا تقرير جودة كود + أمان + bugs + جاهزية إطلاق، مبني من الصفر بناءً على طلب صريح).

**لم يتم تعديل أي ملف أثناء هذا التدقيق.** أي ملف يحتوي أسرارًا (`.env.local`, مفاتيح API) لم تُقرأ قيمه ولم تُعرض — فقط لوحظ وجوده والغرض منه.

---

## 0. خريطة المشروع (Project Map)

**التقنية:** Next.js 15 (App Router) + React 19 + TypeScript (strict) + Drizzle ORM + PostgreSQL + Supabase Auth + Tailwind. النشر على Vercel، البريد عبر Resend، الذكاء الاصطناعي عبر `@anthropic-ai/sdk` (Claude) فقط.

**بنية `src/`:**
```
src/
├── app/            # Next.js routes: (auth), dashboard/*, admin/*, api/*, store/[slug], onboarding
├── features/       # 20 معلم feature module (Clean/Feature-based Architecture)
│   ├── ads/ ai/ analytics/ appointments/ auth/ automation/ campaigns/ crm/
│   ├── dashboard/ i18n/ inbox/ integrations/ knowledge-base/ notifications/
│   └── onboarding/ orders/ platform-admin/ storefront/ support/ workspace/
├── db/             # schema/ (41 جدول), migrations/ (38 ملف SQL), seed/
├── lib/            # auth, errors, redis, email, rate-limit, supabase, cron
└── middleware.ts
```
كل feature يتبع نمط موحّد: `actions/ components/ repository/ services/ validation/` — مطبّق فعليًا لا شكليًا فقط (تم التحقق).

**حجم كل feature (عدد ملفات .ts/.tsx):** platform-admin 39، ai 40، crm 28، onboarding 26، automation 23، workspace 20، auth 19، integrations 17، inbox 16، knowledge-base 16، support 16، campaigns 12، ads 10، storefront 9، orders 9، analytics 9، appointments 7، notifications 5، dashboard 3، i18n 1.

**نقاط API:** 15 route، منها 2 عامّة غير مصادَق عليها بجلسة (تعتمد API Key): `/api/v1/contacts`, `/api/v1/leads`؛ 3 cron؛ 8 تقارير (`/api/reports/*`)؛ `health`.

**الاختبارات:** 34 ملف `*.test.ts`، 315 اختبار — **كلها ناجحة حاليًا**. `typecheck` نظيف تمامًا (صفر أخطاء)، `lint` نظيف (تحذيران فقط بخصوص `<img>` في `store/[slug]/page.tsx`، مقصودان وموثّقان). CI (`(github/workflows/ci.yml`)[.github/workflows/ci.yml] يشغّل typecheck+lint+test+build على كل push/PR لـ main. git tree نظيف، كل الكومنتات مدفوعة لـ `origin/main`.

**الحالة التشغيلية المعروفة (من `DEFERRED_TASSKS.md`، تم التحقق من تطابقها مع الكود):** Supabase Auth حيّ في الإنتاج (Google OAuth مبني لكن غير مفعّل من طرف Supabase بعد)، Resend في sandbox mode (بريد حقيقي لا يصل لغير حساب المطوّر)، Redis/Upstash غير مُزوَّد (النظام يعمل بدونه)، Meta OAuth (WhatsApp/Instagram) غير موجود (بانتظار حساب Meta Developer)، Sentry/PostHog غير مبنيَين إطلاقًا، بوابة دفع حقيقية غير موجودة (الاشتراك يُدار يدويًا من Super Admin)، Cloudflare R2 غير مُزوَّد (رفع الشعار حاليًا حقل URL نصي).

---

## 1. حالة اكتمال المشروع

تقييم لكل مجموعة هندسية من المواصفات (Groups 1-8 / Parts 1-17 + 13B)، بناءً على الفحص الفعلي:

| المجموعة | الحالة | % تقريبية | ملاحظة رئيسية |
|---|---|---|---|
| Part 1 — التأسيس/المعمارية | ✅ مكتمل | 100% | Repository Pattern و AI SDK abstraction مُنفّذان فعليًا (تم التحقق بـ grep شامل)، صفر انتهاكات |
| Part 2 — Stack/DB/Multi-tenant | 🟡 جزئي | ~80% | لا BullMQ (cron بدلاً منه)، لا بحث عام، لا caching للـ dashboard |
| Part 3 — Auth/Onboarding/Channels/Inbox | 🟡 جزئي | ~70% | Auth/Onboarding قويان؛ القنوات (WhatsApp/Instagram) ما زالت stub؛ الـ Inbox بلا فلاتر وبـ polling لا push |
| Part 4 — محرك الذكاء الاصطناعي | 🟡 جزئي | ~75% | Provider/Prompt/Tool-Calling ممتازة؛ الـ Router placeholder بمزوّد واحد بلا fallback؛ لا entity extraction منفصل |
| Part 5 — CRM والمبيعات | 🟡 جزئي | ~68% | Timeline ممتاز؛ **لكن IDOR أمني حرج + حقول أساسية ناقصة بالكامل (خصم/ضريبة/توصيل بالطلبات، موظف مسؤول/تذكير بالمواعيد)** |
| Part 6 — الأتمتة والمراسلة | 🟡 جزئي | ~75% | المحرك يعمل ومختبر جيدًا، **لكن التنفيذ متزامن (sync) داخل الطلب نفسه وليس عبر طابور — مخالفة معمارية صريحة للمواصفة** |
| Part 7 — Dashboard/Analytics | ✅ شبه مكتمل | ~90% | كل التقارير المطلوبة موجودة؛ لا caching (مؤجَّل بوعي) |
| Part 8 — Billing | 🔴 جزئي كبير | ~45% | Feature flags/plans تعمل؛ **دورة حياة الاشتراك بها 3 حالات فقط من 7، لا حدود استخدام، لا فواتير حقيقية** |
| Part 9 — Super Admin | ✅ شبه مكتمل | ~95% | تحكم وصول قوي جدًا، كل action يعيد التحقق بشكل مستقل |
| Parts 10-13 — معايير هندسية/بروتوكول/خطة تنفيذ/UX | ✅ ملتزم به | ~90% | انضباط تسمية/بنية غير معتاد، صفر TODO/dead code، معالجة أخطاء موحّدة |
| Part 13B — إعادة هيكلة التنقل (5 أقسام) | ✅ **منفّذ فعليًا الآن** | 100% | تم التحقق مباشرة من `src/app/dashboard/layout.tsx`: الشريط الجانبي HOME/INBOX/CUSTOMERS/AI EMPLOYEE/GROWTH فعلي، وTeam/Billing/Audit Log/Workspace Profile انتقلت لقائمة الحساب (WORKSPACE SETTINGS) — **هذا يصحّح ملاحظة كانت في تقرير سابق بأن التنقل لا يزال شريطًا مسطّحًا؛ لم يعد كذلك** |
| Part 14 — الموقع/المتجر | ✅ منفّذ (نطاق مُختزَل بوعي) | ~85% | متجر عام حقيقي يقرأ من الكتالوج الحي، لا نظام drag-and-drop عام (مقصود) |
| Part 15 — التكاملات | 🟡 جزئي | ~75% | API keys/HMAC webhooks حقيقية وسليمة؛ **لا rate limiting على الـ API العام** |
| Part 16 — التحليلات التنبؤية/الحملات | 🟡 جزئي | ~70% | حساب churn-risk سليم رياضيًا؛ **لا آلية unsubscribe/opt-out إطلاقًا** |
| Part 17 — إعلانات Meta | ✅ منفّذ ضمن الحدود المتاحة | ~80% | محرك الإسناد (attribution) صحيح رياضيًا؛ الاتصال الحي بـ Meta محجوب خارجيًا كما هو متوقّع |

**الخلاصة العامة:** الأساس المعماري قوي جدًا وموثّق بانضباط غير معتاد، لكن **يوجد نقص حقيقي في 3 مناطق تمنع اعتباره "مكتملًا": (أ) ثغرات أمنية حرجة في CRM/RBAC، (ب) حقول بيانات أساسية ناقصة في Orders/Appointments، (ج) محرك الأتمتة يعمل بشكل متزامن مخالف للمواصفة**. كل ما تبقى إما مؤجَّل بوعي وموثَّق (Meta، بوابة دفع، Sentry) أو نقص تحسيني (caching، بحث عام).

---

## 2. فحص هندسة المشروع (Architecture)

**مطابق للمواصفات في جوهره:**
- Feature-based Clean Architecture مطبّق حرفيًا على 20 feature، بنمط ملفات موحّد 100% (kebab-case: `x.service.ts`, `x.repository.ts`, `x.action.ts` — صفر تجاوزات).
- Repository Pattern حقيقي: تم فحص كامل الشجرة — كل استدعاء `db.select/insert/update/delete` (40 موقعًا) محصور داخل `*/repository/*` أو `*/seed/*`، صفر خرق.
- عزل مزوّد الذكاء الاصطناعي حقيقي: `@anthropic-ai/sdk` مستورد في ملف واحد فقط (`src/features/ai/providers/claude.provider.ts`).
- معالجة أخطاء موحّدة عبر `AppError`/`ActionResult` مستخدمة في 86 من 88 ملف `*.action.ts`.

**مشاكل معمارية حقيقية:**
1. **محرك الأتمتة متزامن (Critical معماريًا)** — `dispatch()` يُستدعى بـ `await` مباشرة داخل نفس طلب المستخدم (`crm.service.ts:81`, `order.service.ts:57`, `inbox.service.ts:64,68,94-95,160,183,215`)، رغم وجود Redis (`ioredis`) مُزوَّد بالفعل وغير مربوط بأي طابور مهام حقيقي (BullMQ غائب كليًا من `package.json`). أي إجراء `webhook_call` بطيء (حتى 5 ثوانٍ × محاولتين) يُبطئ استجابة العميل نفسها. هذا هو الانحراف المعماري الأهم في كامل المشروع.
2. **AI Router وهمي** — `router/ai-router.ts` مجرد تمرير مباشر لمزوّد واحد (Claude)، بلا fallback أو retry أو اختيار نموذج — موثّق بصدق في الكود نفسه كـ"موضع مستقبلي"، لكنه يعني نقطة فشل واحدة لكامل الذكاء الاصطناعي في المنصة.
3. **لا caching/aggregation في طبقة SQL** لـ Dashboard/Analytics — كل تحميل صفحة يجلب كل الصفوف (`findByWorkspaceId`) ويُصفّي في الذاكرة. موثَّق كقرار مؤجَّل بوعي في تعليقات الكود، لكنه لن يتحمّل نمو حجم البيانات.
4. **ازدواجية بنيوية خفيفة (ليست خطأ لكنها تستحق توحيدًا):** نمط `requireUser()+requireWorkspaceForUser()` مكرر في 68 من 88 ملف action؛ نمط `eq(table.workspaceId, workspaceId)` مكرر 115 مرة عبر المستودعات (Repositories)؛ منطق pagination يُعاد اختراعه في 32 ملف مستودع بلا helper مشترك.
5. **لا تحكم تفرّع/تزامن (concurrency control) على تنفيذ الـ workflows المؤجّلة** — `processDueRuns()` يقرأ ثم يعالج ثم يحذف بلا "claiming" (لا `FOR UPDATE SKIP LOCKED` ولا عمود حالة/إيجار)، فإذا استُدعي الـ cron endpoint بتزامن (إعادة محاولة، تداخل استدعاءات Vercel) يمكن تنفيذ نفس الـ pending run مرتين.

**Patterns مفقودة أو ناقصة:**
- لا Optimistic Concurrency Control على أي كيان قابل للتعديل المتزامن (طلبات، مواعيد، عملاء) — آخر كتابة تفوز بصمت.
- لا Idempotency key على أي مسار كتابة خارجي (webhook، API عام).
- لا transition-guard (آلة حالة صريحة) لحالات الطلبات/المواعيد/الـ leads — أي انتقال حالة مقبول حاليًا (`Cancelled → Confirmed` ممكن فعليًا).

---

## 3. فحص البرمجة (Bugs / Security / Performance / Concurrency)

هذا القسم يجمع أهم ما وجدته الـ 7 عمليات تدقيق (التفاصيل الكاملة مع الملفات في القسم 8 "قائمة الأولويات").

### 🔴 ثغرات أمنية حرجة (Critical)
1. **تصعيد صلاحيات إلى Owner (Privilege Escalation)** — `src/features/workspace/services/team.service.ts` (`inviteMember`/`updateMemberRole`) لا يرفض إسناد دور "Owner" لعضو آخر. أي Admin أو حتى Manager يملك صلاحية دعوة الأعضاء يمكنه استدعاء الـ action مباشرة بمعرف دور "owner" وترقية نفسه/غيره لمالك مشترك غير مصرَّح به. الحماية الحالية (منع تغيير/حذف المالك الحالي) لا تمنع **الترقية إلى** مالك.
2. **IDOR عبر المستأجرين (Cross-Tenant) في 4 مسارات** — `order.service.ts:createOrder`، `appointment.service.ts:createAppointment`، `note.service.ts:createNote`، `task.service.ts:createTask` تُدرج `contactId` القادم من العميل **دون التحقق من انتمائه لنفس الـ workspace**. مع أن الـ join في `order.repository.ts:findByWorkspaceId` يُصفّي بـ `orders.workspaceId` فقط وليس `contacts.workspaceId`، يمكن لمستخدم في Workspace A إنشاء طلب/موعد/ملاحظة مرتبطة بعميل ينتمي فعليًا لـ Workspace B — وسيظهر اسم/هاتف/بريد ذلك العميل الأجنبي داخل بيانات Workspace A.

### 🟠 أمان عالي الخطورة (High)
- **لا فحص صلاحيات (RBAC) على أفعال CRM/الطلبات/المواعيد** — تُستخدم فقط `requireUser`/`requireWorkspaceForUser` (أي: هل هو عضو؟) وليس `requireWorkspacePermission`، بينما دور "Viewer" لا يملك أي صلاحية طلبات/مواعيد/leads في الـ seed — النتيجة: Viewer يستطيع فعليًا تعديل بيانات رغم أن دوره يُفترض أنه للقراءة فقط.
- **لا rate limiting على الـ API العام** (`/api/v1/contacts`, `/api/v1/leads`) — مفتاح API مسرّب/مخمَّن يمكن استخدامه لإغراق النظام بطلبات إنشاء leads بلا أي تقييد.
- **لا آلية إلغاء اشتراك (unsubscribe/opt-out)** في حملات البريد (`campaign.service.ts`) — كل جهة اتصال تُرسَل لها رسالة بلا فحص قائمة استبعاد ولا رأس `List-Unsubscribe` — مخالفة حقيقية لسياسات مكافحة السبام تذكرها المواصفة صراحة.
- **Race condition في وسوم العملاء** — `contactRepository.addTag`/`removeTag` قراءة-تعديل-كتابة بلا قفل؛ إضافتان متزامنتان تُفقِد إحداهما بصمت.
- **تقييد المعدّل مبني على البريد فقط لا الـ IP** في تسجيل الدخول/OTP — إمكانية هجوم موزّع عبر حسابات مختلفة بلا رصد.
- **لا تسجيل أحداث مصادقة (auth audit log)** — تسجيل الدخول/الفشل/إعادة تعيين كلمة المرور غير مسجّلة رغم أن المواصفة تطلبها صراحة.

### 🟡 Concurrency / Async
- **لا قفل/idempotency على ردود الذكاء الاصطناعي** — رسالتان متزامنتان على نفس المحادثة (مثل تكرار تسليم webhook، سلوك معروف عن Meta) يمكن أن تُنتجا ردَّين منفصلين من الـ AI؛ لا عمود `externalId/providerMessageId` في جدول الرسائل أصلًا لمنع التكرار مستقبلًا — **يجب إصلاحه قبل ربط WhatsApp/Instagram الحقيقي**.
- **تنفيذ الأتمتة متزامن** (مذكور في القسم 2) — يحوّل مشكلة معمارية إلى مشكلة أداء/تجاوب فعلية تحت الحمل.
- **لا "claiming" على صفوف الـ workflow المؤجّلة** — احتمال تنفيذ مزدوج عند تداخل استدعاءات الـ cron.

### 🟢 الأداء (Performance)
- استعلامات غير محدودة (`unbounded`, بلا `LIMIT`) على: قائمة الـ leads الكاملة، `GET /api/v1/contacts`، قوائم الـ admin (workspaces، AI usage) — مقبول بالحجم الحالي، لن يتحمّل النمو.
- Prompt Builder يُدرج كل الـ FAQ/المنتجات/الخدمات بلا حدّ أقصى — استهلاك tokens/تكلفة غير محكوم لأي عمل به كتالوج كبير.
- لا caching في Dashboard/Analytics (مذكور أعلاه).

### ⚪ أخطاء منطقية (Logic errors)
- لا حراسة انتقال حالة (state machine) لأي من: حالة الطلب، حالة الموعد، مرحلة الـ lead — أي قيمة enum مقبولة كهدف بغض النظر عن الحالة الحالية.
- ساعات العمل (`working-hours.ts`) محسوبة فعليًا وتُستخدم في شروط الأتمتة، **لكنها لا تُمرَّر إلى الـ AI system prompt إطلاقًا** — الذكاء الاصطناعي يرد 24/7 بلا وعي بساعات العمل رغم أن الـ onboarding يجمعها.
- محفّزات التصعيد للبشري (Human Handover) تعتمد كليًا على قرار النموذج نفسه — لا نظام احتياطي (keyword/regex) يلتقط حالة تصعيد واضحة (تهديد قانوني، طلب صريح) إن أخطأ النموذج.

---

## 4. فحص كل Feature

### AI Employee Engine (Part 4)
| القدرة | الحالة | الملفات | المشاكل |
|---|---|---|---|
| Provider Layer | ✅ 100% | `ai/providers/claude.provider.ts` | لا شيء |
| AI Router / Smart Mode | 🔴 10% | `ai/router/ai-router.ts` | placeholder صريح، مزوّد واحد بلا fallback |
| Prompt Builder | ✅ 95% | `ai/prompt/prompt-builder.ts` | لا حدّ لحجم الكتالوج المُدرَج؛ ساعات العمل غير مربوطة |
| الذاكرة (Memory) | 🟡 70% | `ai.service.ts`, `contacts.aiSummary` | لا ذاكرة عمل هيكلية أثناء المحادثة، فقط تلخيص بعد التحويل |
| محرك المعرفة | ✅ 90% | prompt-builder + tools | يمنع الاختلاق فعليًا (يتحقق من السعر/الاسم في طبقة الأداة) |
| استخراج الكيانات/النية | 🟡 40% | لا يوجد ملف مخصص | متروك ضمنيًا لحكم النموذج، لا مخرجات منظّمة قابلة للتدقيق |
| Action Engine / Tool Calling | ✅ 100% (الأقوى في التدقيق) | `ai/tools/registry.ts` | Zod validation + تدقيق كامل + حدّ تكرار (4) |
| Human Handover | 🟡 75% | `ai/tools/request-human-handover.tool.ts` | بلا شبكة أمان حتمية احتياطية |
| Safety Layer | 🟡 80% | prompt-builder | لا تنقية ثانية (post-generation) لمخرجات النموذج |
| تتبّع التكلفة | ✅ 100% | `db/schema/ai-usage.ts` | لا تقدير دولاري (قرار مقصود) |
| قاعدة "No AI Terminology" | ✅ محترمة بالكامل | — | تم التحقق: صفر تسريب في الواجهات وملفات الترجمة |

### CRM & Sales Engine (Part 5)
| Feature | الحالة | % | الملفات | المشاكل |
|---|---|---|---|---|
| Contacts | 🟡 جزئي | 80% | `crm/repository`, `inbox/repository/contact.repository.ts` | لا timezone، لا LTV محسوب، race على الوسوم |
| Leads/Pipeline | 🟡 جزئي | 75% | `crm/services/crm.service.ts`, `lead.repository.ts` | لا حراسة انتقال مرحلة، استعلام غير محدود |
| Orders | 🔴 ناقص جوهريًا | 55% | `orders/**` | **لا خصم/ضريبة/توصيل/دفع إطلاقًا، IDOR حرج، لا حراسة حالة** |
| Appointments | 🔴 ناقص جوهريًا | 50% | `appointments/**` | **لا موظف مسؤول، لا تذكير إطلاقًا، نفس IDOR** |
| كتالوج المنتجات/الخدمات | 🟡 جزئي | 65% | `knowledge-base/**` | لا variants، لا معرض صور، لا خصم، لا علم "AI visibility" منفصل |
| Timeline | ✅ الأقوى في هذا الجزء | 100% | `crm/lib/timeline.ts` | لا pagination فقط (منخفض الأهمية) |
| Tags/Notes/Tasks | 🟡 جزئي | 70% | `crm/services/{note,task}.service.ts` | نفس IDOR على `contactId` |

### Automation & Messaging (Part 6)
| القدرة | الحالة | الملاحظة |
|---|---|---|
| Triggers | 🟡 جزئي (11 نوع) | لا trigger منفصل لـ order_paid/lead_won كأحداث مستقلة |
| Conditions | 🟡 جزئي | لا تجميعات متداخلة AND/OR، قائمة مسطّحة فقط |
| Actions | 🟡 جزئي (15 نوع) | لا "إرسال بريد/واتساب مباشر لجهة اتصال" كفعل مستقل |
| Delay | 🟡 جزئي | مثابر عبر إعادة التشغيل (جيد) لكن granularity بالأيام فقط + cron يومي = تأخير حتى 24 ساعة |
| Human Approval | 🟡 بديل عملي | ليس pause/resume حقيقي، بل تشغيل workflow ثانٍ منفصل عند الموافقة |
| AI Workflow Generator | ✅ مكتمل | يعمل ومختبر |
| محرك التنفيذ | 🔴 مخالفة معمارية | **متزامن وليس عبر طابور (BullMQ غائب)** — انظر القسم 2/3 |
| الصلاحيات على الـ workflows | ✅ مُصلَح بالكامل | تم التحقق مباشرة: كل action يفرض `automation.workflows.manage` |
| SSRF (webhook_call) | ✅ ممتاز | فحص https + حجب نطاقات IP خاصة/داخلية + منع إعادة توجيه |

### Inbox / Channels (Part 3)
| القدرة | الحالة | الملاحظة |
|---|---|---|
| صندوق وارد موحّد | 🟡 جزئي | يدمج القنوات لكن **بلا أي فلاتر** (غير مقروء/مُسنَد/أولوية...) |
| Real-time | 🟡 Polling وليس Push | كل 4-5 ثوانٍ، وظيفي لكن ليس كما تصف المواصفة |
| اقتراحات ردود AI / ملاحظات داخلية | 🔴 غير موجود | لا واجهة "اقترح ردًا ليوافق عليه الوكيل"؛ الملاحظات موجودة في CRM لكن غير مربوطة بواجهة المحادثة |
| اتصال القنوات (WhatsApp/Instagram) | 🔴 Stub فقط | بلا Meta OAuth — **محجوب خارجيًا (حساب Meta Developer)، ليس تقصيرًا برمجيًا** |
| Webhooks واردة | 🔴 غير موجود | نتيجة طبيعية لعدم وجود اتصال Meta حي |

### Business Operations (Parts 7-9)
| Feature | الحالة | % | ملاحظة |
|---|---|---|---|
| Dashboard/Analytics | ✅ | 90% | أدوار صحيحة، Business Health Score سليم منطقيًا، لا caching |
| Billing/Subscription | 🔴 | 45% | **3 حالات فقط من 7، لا حدود استخدام، لا فواتير** — لكن هذا موثَّق كقرار مؤجَّل بانتظار بوابة دفع |
| Super Admin | ✅ | 95% | تحقق صلاحيات مستقل في كل action، تدقيق شامل، انتحال هوية للقراءة فقط |

### Growth Modules (Parts 14-17)
| Feature | الحالة | % | ملاحظة |
|---|---|---|---|
| Website/Store | ✅ | 85% | نموذج قالب واحد حقيقي وليس drag-and-drop عام (قرار مقصود موثَّق) |
| Integrations/API | 🟡 | 75% | HMAC/SSRF سليمان؛ **لا rate limiting على API العام** |
| Campaigns/Predictive | 🟡 | 70% | churn-score سليم رياضيًا؛ **لا unsubscribe** |
| Ads | ✅ | 80% | محرك الإسناد صحيح رياضيًا (تم التحقق من الـ SQL join)؛ الاتصال بـ Meta محجوب كما متوقّع |

---

## 5. فحص جودة الكود

- **Duplication:** منخفض نسبيًا لكن حقيقي — `requireUser()+requireWorkspaceForUser()` مكرر 68 مرة، `eq(workspaceId,...)` مكرر 115 مرة، pagination boilerplate في 32 ملفًا، Zod primitives مكررة (~20 موضعًا). لا شيء منها خطأ وظيفي، لكنها فرصة لتقليل ~150+ سطر بمساعدات مشتركة.
- **Naming:** **لا مشاكل** — انضباط تام: 100% kebab-case، صفر ملفات class-based مختلطة مع الأسلوب الوظيفي.
- **Dead code:** **لم يُعثر على أي كود ميت** — تم فحص عيّنات من كل الـ features (بما فيها الأحدث: ads, storefront, support, notifications, knowledge-base) عبر تتبّع استخدام كل تصدير عبر كامل الشجرة.
- **TODO/FIXME/HACK:** **صفر** في كامل `src/`. `@ts-ignore`: صفر. `@ts-expect-error`: موضع واحد فقط، موثَّق ومبرَّر. `eslint-disable`: موضع واحد فقط (workflow-canvas)، موثَّق ومبرَّر. هذا مستوى انضباط غير معتاد لمشروع بهذا الحجم.
- **Maintainability:** جيدة جدًا بفضل البنية الموحّدة، لكن غياب coverage measurement وغياب caching/queue الآن سيصبحان عبئًا حقيقيًا مع النمو.

---

## 6. فحص الاختبارات

- **315 اختبار عبر 34 ملفًا — كلها ناجحة حاليًا.** لا إعداد coverage في `vitest.config.ts` ولا في `package.json` — **التغطية غير مقاسة إطلاقًا**، فلا طريقة موضوعية لمعرفة النسبة الفعلية.
- **الاختبارات الموجودة ذات قيمة حقيقية** (تم فحص عينات عشوائية): تختبر منطق نقاط الصلاحية، حساب lead-score، RBAC short-circuit، rate-limiting — وليست CRUD سطحيًا فقط.
- **فجوة حقيقية: 7 من 20 مجلد feature بلا أي اختبار إطلاقًا:** `appointments`, `auth`, `i18n`, `inbox`, `knowledge-base`, `notifications`, `onboarding`. الأخطر من الناحية الأمنية/الوظيفية: **`auth`** (تسجيل الدخول/OTP/الجلسات) و **`inbox`** (منطق محادثات العملاء الفعلي) — كلاهما بصفر اختبارات رغم حساسيتهما.
- ثغرة الـ IDOR وثغرة تصعيد الصلاحيات (القسم 3) **لم تكن لتُكتشف من الاختبارات الحالية** — لا اختبار واحد يتحقق من رفض `contactId` من workspace آخر أو رفض ترقية لدور Owner.
- CI يشغّل الاختبارات على كل push/PR (جيد كحد أدنى)، لكن بلا بوابة فشل عند انخفاض التغطية (لأنها غير مقاسة أصلًا).

**التوصية:** إضافة اختبارات لثغرتي القسم 3 الحرجتين أولًا (كتوثيق تراجع/regression)، ثم تغطية أساسية لـ `auth` و `inbox`.

---

## 7. جاهزية الإطلاق

### 🟡 التصنيف: **Needs fixes قبل أي إطلاق حقيقي لعملاء**

**السبب:** الأساس تقني ممتاز (typecheck/lint/tests/CI نظيفة تمامًا، معمارية منضبطة، صفر ديون كود واضحة) — **لكن يوجد ثغرتان أمنيتان حقيقيتان قابلتان للاستغلال (Critical)** يجب إغلاقهما قبل قبول أي مستخدم حقيقي متعدد المستأجرين، بالإضافة إلى نقص بيانات جوهري في Orders/Appointments يجعل هاتين الوحدتين غير صالحتين تجاريًا بشكلهما الحالي لأي عمل يحتاج فوترة حقيقية.

**ليس "Not ready"** لأن: لا شيء مما سبق يحتاج إعادة تصميم — كل إصلاح مذكور محصور في دالة/ملف واحد أو حقلين إضافيين في schema، ولا يمس المعمارية العامة.

**ليس "Ready"** لأن: ثغرة تصعيد الصلاحيات وثغرة IDOR كلتاهما قابلتان للاستغلال اليوم بحساب مستخدم عادي (Admin/Manager) عبر واجهة الـ Server Actions مباشرة، بدون الحاجة لأي اختراق متقدم.

> **تحديث بعد الإصلاح:** الثغرتان الأمنيتان الحرجتان (تصعيد الصلاحيات + IDOR الرباعي) تم إصلاحهما فعليًا (انظر القسم 8). **البندان 6-7 (حقول Orders/Appointments الناقصة) والبند 8 (محرك الأتمتة المتزامن) ما زالا مفتوحين بقرار من المستخدم** (تم اختيار نطاق "الثغرات الأمنية فقط"). لذلك التصنيف الدقيق الآن: **الثغرات الأمنية القابلة للاستغلال أُغلقت، لكن المشروع لا يزال "Needs fixes" من ناحية اكتمال بيانات Orders/Appointments وأداء محرك الأتمتة تحت الحمل** قبل اعتباره جاهزًا تجاريًا بالكامل.

**الحواجز الخارجية المعروفة** (WhatsApp/Instagram الحيّة، بوابة دفع، Sentry/PostHog، Redis، R2) **موثَّقة بوضوح في `DEFERRED_TASKS.md` وليست جزءًا من تقييم الجاهزية البرمجية** — هذه قرارات عمل/حسابات خارجية بانتظار المستخدم، لا نواقص هندسية.

---

## 8. قائمة الأولويات

### 🔴 Critical (يجب إصلاحها قبل أي إطلاق)

| # | الملف / الموقع | المشكلة | السبب | الحل المقترح | الحالة |
|---|---|---|---|---|---|
| 1 | `src/features/workspace/services/team.service.ts` (`inviteMember`, `updateMemberRole`) | يمكن لأي Admin/Manager ترقية عضو (أو نفسه) لدور Owner | لا تحقق من أن الدور الهدف ليس "owner" | رفض أي طلب يستهدف `role.key === "owner"` | ✅ **تم الإصلاح 2026-08-07** — يرفض الآن أي `roleId` يُحلّ إلى `key === "owner"` في كلا الدالتين، مع اختبارات `team.service.test.ts` |
| 2 | `src/features/orders/services/order.service.ts` (`createOrder`) | إدراج `contactId` بلا تحقق من انتمائه للـ workspace | Cross-tenant IDOR | استدعاء `contactRepository.findById(contactId, workspaceId)` وإرجاع 404 عند الفشل، قبل الإدراج | ✅ **تم الإصلاح 2026-08-07** — مع اختبار `order.service.test.ts` |
| 3 | `src/features/appointments/services/appointment.service.ts` (`createAppointment`) | نفس نمط IDOR | نفس السبب | نفس الحل | ✅ **تم الإصلاح 2026-08-07** — مع اختبار `appointment.service.test.ts` |
| 4 | `src/features/crm/services/note.service.ts` (`createNote`) | نفس نمط IDOR | نفس السبب | نفس الحل | ✅ **تم الإصلاح 2026-08-07** — مع اختبار إضافي في `note.service.test.ts` |
| 5 | `src/features/crm/services/task.service.ts` (`createTask`) | نفس نمط IDOR | نفس السبب | نفس الحل | ✅ **تم الإصلاح 2026-08-07** — مع اختبار إضافي في `task.service.test.ts` |
| 6 | `src/db/schema/orders.ts` + `validation/schemas.ts` | لا حقول خصم/ضريبة/توصيل/طريقة دفع | فجوة مواصفات جوهرية، ليست bug برمجي | إضافة الحقول + migration + تحديث `order-total.ts` | ⏸️ **لم يُصلَح بعد** — خارج نطاق "الثغرات الأمنية الحرجة فقط" الذي اختاره المستخدم |
| 7 | `src/db/schema/appointments.ts` | لا حقل موظف مسؤول، لا آلية تذكير إطلاقًا | فجوة مواصفات جوهرية | إضافة `assignedToUserId` + مهمة cron/تذكير جديدة | ⏸️ **لم يُصلَح بعد** — نفس السبب |
| 8 | `automation.service.ts` + كل نقاط `dispatch()` (`crm.service.ts:81`, `order.service.ts:57`, `inbox.service.ts:64...`) | تنفيذ الأتمتة متزامن داخل طلب المستخدم، يشمل webhook حتى 5 ثوانٍ × محاولتين | مخالفة معمارية صريحة تُبطئ/تُعرقل مسارات حرجة (رسالة عميل، إنشاء طلب) تحت الحمل | ربط Redis الموجود فعليًا بطابور حقيقي (BullMQ) وتحويل `dispatch()` لاستدعاء غير حاجب (enqueue فقط) | ⏸️ **لم يُصلَح بعد** — يحتاج قرار بنية تحتية (worker منفصل)، خارج النطاق المختار |

**التحقق بعد الإصلاح (2026-08-07):** `tsc --noEmit` نظيف، `eslint` نظيف (نفس التحذيرين المعروفين فقط)، `next build` ناجح، **334/334 اختبار ناجح** (315 الأصلية + 19 اختبار انحدار جديد يغطي مسارات القبول والرفض لكل من البنود الخمسة). لم يُعدَّل أي شيء خارج الملفات الخمسة المذكورة وملفات اختباراتها.

### 🟠 High

| # | الملف | المشكلة | الحل المقترح |
|---|---|---|---|
| 9 | `order.service.ts`, `appointment.service.ts`, وأفعالها | لا `requireWorkspacePermission` — دور Viewer يستطيع التعديل فعليًا | إضافة فحص صلاحية مطابق لما هو مطبّق في الأتمتة |
| 10 | `order.repository.ts` (`updateOrderStatus`), `appointment.repository.ts`, `lead.repository.ts` (`updateStage`) | لا حراسة انتقال حالة — أي enum مقبول من أي حالة | جدول انتقالات صريح يُرفض عنده أي انتقال غير منطقي |
| 11 | `src/lib/rate-limit` + `require-api-key.ts` | لا rate limiting على `/api/v1/contacts` و `/api/v1/leads` | ربط `checkRateLimit` بمعرف مفتاح API قبل/بعد المصادقة |
| 12 | `campaign.service.ts` + `emailService` | لا آلية unsubscribe/opt-out على حملات البريد | حقل `contacts.emailOptOut` + رأس `List-Unsubscribe` + رابط إلغاء اشتراك |
| 13 | `contactRepository.addTag`/`removeTag` | Race condition (قراءة-تعديل-كتابة بلا قفل) | استخدام تحديث ذري على مستوى SQL (مثل `jsonb` array append ذري) بدل قراءة كامل المصفوفة ثم كتابتها |
| 14 | `src/lib/rate-limit/rate-limit.ts` | التقييد بالبريد فقط لا الـ IP | إضافة مفتاح تقييد ثانوي بالـ IP |
| 15 | `src/features/auth/services/auth.service.ts` | لا تسجيل أحداث مصادقة (login/logout/فشل/إعادة تعيين) | كتابة لجدول تدقيق مخصص أو `workspaceAuditLogs` |
| 16 | `src/db/schema/workspaces.ts` (`subscriptionStatusEnum`) | 3 حالات فقط بدل 7 المطلوبة | توسيع الـ enum ومنطق `subscription-check.service.ts` عند توفر بوابة دفع |
| 17 | `src/db/schema/plans.ts` | لا حدود استخدام رقمية، لا تتبع استخدام، لا تحذيرات عتبة، لا فواتير | إضافة جداول عدّادات استخدام وحقول حدود على `plans` |
| 18 | `src/features/ai/router/ai-router.ts` | مزوّد وحيد بلا fallback — نقطة فشل واحدة لكل الذكاء الاصطناعي بالمنصة | تنفيذ مزوّد احتياطي حقيقي قبل تسويقه كـ"Smart Mode" |
| 19 | `src/features/inbox/services/inbox.service.ts` (`triggerAiReply`) + جدول `messages` | لا قفل/idempotency لردود AI متزامنة، لا عمود `externalId` لمنع تكرار رسائل webhook | إضافة قيد فريد على معرف الرسالة الخارجي + قفل استشاري لكل محادثة، **قبل** ربط WhatsApp/Instagram الحقيقي |
| 20 | `src/app/dashboard/inbox` | لا فلاتر على قائمة المحادثات (غير مقروء/مُسنَد/أولوية) | إضافة فلاتر أساسية على مستوى الاستعلام والواجهة |

### 🟡 Medium

- `automation.service.ts` — الشروط لا تدعم تجميعات متداخلة AND/OR (قائمة مسطّحة فقط).
- `automation-delays` cron — granularity بالأيام فقط + سحب يومي = تأخير فعلي حتى 24 ساعة لأي تأخير مُجدوَل.
- `processDueRuns()` — لا "claiming" على صفوف الأتمتة المؤجّلة، احتمال تنفيذ مزدوج عند تداخل الاستدعاءات.
- `dashboard.service.ts`, `analytics.service.ts` — لا caching/SQL aggregation، فحص كامل للصفوف في الذاكرة على كل تحميل.
- `GET /api/v1/contacts` — بلا pagination، يُرجع كامل قائمة العملاء دفعة واحدة.
- `campaign.service.ts` (حلقة الإرسال) — بلا batching/تأخير، خطر تجاوز حدود مزوّد البريد.
- `knowledge-base` (منتجات/خدمات) — لا variants، لا معرض صور، لا خصم، لا علم "AI visibility" منفصل عن `isActive`.
- `prompt-builder.ts` — لا حدّ أقصى لعدد عناصر الكتالوج المُدرَجة في الـ prompt.
- `working-hours.ts` — محسوب لكن غير مربوط بـ system prompt الخاص بالـ AI.
- `src/app/api/v1/*`, `src/app/api/reports/*` — لا `try/catch` موحّد، خطأ غير متوقع يُرجع استجابة غير منظّمة بدل JSON متسق.
- 7 مجلدات features بصفر اختبارات: `appointments`, `auth`, `i18n`, `inbox`, `knowledge-base`, `notifications`, `onboarding`.

### ⚪ Low

- CSRF يعتمد كليًا على حماية Next.js الافتراضية للـ Server Actions بلا توثيق صريح لهذا القرار.
- `contacts` — لا حقل timezone منفصل، لا Lifetime Value محسوب ومخزَّن.
- `crm/lib/timeline.ts` — لا pagination على الجدول الزمني لعميل نشط لفترة طويلة.
- `ad-campaign.repository.ts` — تصادم محتمل إذا تشارك حملتان نفس وسم `utmCampaign` (حافة نادرة).
- `integration.service.ts` (`createWebhookSubscription`) — فحص SSRF عند الإنشاء أقل صرامة من فحصه عند التسليم الفعلي (غير قابل للاستغلال، فجوة ملاحظة فقط).
- تكرارات بسيطة قابلة للتوحيد: `requireUser+requireWorkspaceForUser` (×68)، `eq(workspaceId,...)` (×115)، pagination boilerplate (×32 ملف)، Zod primitives (×20).
- لا `vitest` coverage configuration — التغطية غير مقاسة إطلاقًا.
- لا اختبار مباشر على مستوى الـ route/action لحارس `requirePlatformAdmin` (التغطية تتوقف عند طبقة الـ service).

---

## ملاحظة ختامية

الانطباع العام من الفحص الفعلي (لا من أسماء الملفات): هذا كود مُدار بانضباط هندسي حقيقي — بنية موحّدة، صفر ديون تقنية واضحة (TODO/dead code/تسمية)، اختبارات ذات معنى حيث وُجدت، ومعالجة أخطاء متسقة. المشكلة ليست "كود سيء"، بل **مسارات كتابة معينة (CRM، الصلاحيات) لم تُطبَّق عليها نفس الانضباط الأمني المُطبَّق على بقية المشروع** (الأتمتة والـ Super Admin، مثلًا، يطبّقان RBAC وworkspace-scoping بدقة عالية جدًا). إصلاح البنود الـ 8 الحرجة أعلاه يرفع المشروع فعليًا لحالة "Ready" من ناحية الجاهزية البرمجية البحتة.
