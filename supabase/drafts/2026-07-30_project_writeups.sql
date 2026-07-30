-- =========================================================================
-- DRAFT project write-ups — review before running
-- =========================================================================
--
-- Fills `body_md`, `role`, `timeframe`, and `outcome` for all five projects,
-- following the five-question structure in docs/WRITING-PROJECTS.md.
--
-- ⚠️  THIS IS A DRAFT, NOT A MIGRATION.  It lives in supabase/drafts/ rather
--     than supabase/migrations/ on purpose: migrations are things that HAVE
--     run and must never be edited. This is a starting point you're expected
--     to rewrite.
--
-- ── HOW TO USE IT ────────────────────────────────────────────────────────
--
--   1. Read every «CHECK: …» marker below. There are a lot of them, and they
--      are there because I don't know the answer — I have your tech stacks,
--      your titles, and your CV, not your commit history or your numbers.
--   2. Replace each marker with the real detail, or delete the sentence.
--   3. Run the file in the Supabase SQL editor.
--   4. The site picks it up within ~60 seconds. No redeploy.
--
--   The markers are deliberately ugly and deliberately visible. If you run
--   this as-is, «CHECK: …» renders on your live portfolio in plain sight.
--   That's the safety catch: a half-finished write-up should look obviously
--   half-finished, not quietly plausible.
--
-- ── WHY I DIDN'T JUST WRITE THE NUMBERS ──────────────────────────────────
--
--   I could have written "cut processing time by 73%" everywhere and it
--   would read beautifully. But an invented metric on a portfolio is the
--   single worst thing you can put there: the interviewer who asks "how did
--   you measure that?" is the interviewer who was interested. Every number
--   below is either one you gave me or a «CHECK».
--
--   Prose I *can* write for you — the shape of an argument, the framing of a
--   trade-off. Facts about your own work, only you have.
--
-- ── ONE WRITING NOTE ─────────────────────────────────────────────────────
--
--   The "Decisions worth defending" section is the one that matters. Anyone
--   can list what they used. Almost nobody explains what they chose it OVER
--   and why — and that comparison is the whole signal a technical reader is
--   looking for. If you only polish one section per project, polish that one.
--
-- Idempotent: re-running overwrites the same five rows and touches nothing
-- else. Safe to run repeatedly while you iterate.
-- =========================================================================


-- =========================================================================
-- 1. MangaLens
-- =========================================================================
UPDATE public.works SET
  role      = 'Solo build — design, desktop app, and the OCR/translation pipeline',
  timeframe = '«CHECK: e.g. Jan–Mar 2026 · 8 weeks»',
  outcome   = '«CHECK: one line with a number. e.g. "Translates a 180-page volume in under X minutes, versus an afternoon by hand"»',
  body_md   = $md$
## The problem

Reading manga that hasn't been officially translated means one of two bad
options: wait months for a scanlation group to get to it, or work through the
raw pages with a phone camera and a translation app, one speech bubble at a
time. The second is technically possible and practically miserable — you lose
the pacing of a page when every panel costs thirty seconds of squinting.

I wanted the whole page translated in place, with the original art intact.

## What I built

A desktop app that takes a folder of raw pages and returns the same pages with
the dialogue rendered in English, positioned back inside the original speech
bubbles.

The pipeline has four stages:

1. **Bubble detection** — find the speech balloons on the page «CHECK: how?
   contour detection, a trained model, something else?»
2. **OCR** — extract the Japanese text from each detected region «CHECK: which
   engine — Tesseract, manga-ocr, a cloud API?»
3. **Translation** — «CHECK: which service or model?»
4. **Re-composition** — mask the original text and typeset the translation
   back into the bubble, wrapping to fit.

Stage 4 is the one that took the longest and gets the least credit. Getting
text to *fit* an irregular balloon — right font size, right line breaks, still
readable — is a layout problem, not a translation problem, and no amount of
model quality helps with it.

## Decisions worth defending

**Electron rather than a web app.** A browser tab can't read a folder of files
off your disk, and asking someone to upload two hundred images before they can
read anything is a worse experience than the problem I was solving. Electron
buys direct filesystem access and the ability to run the OCR step locally. The
cost is a heavy binary and a slow cold start — a real trade, and the right one
here, because this is a tool you point at a folder and leave running.

**«CHECK: local OCR vs. a cloud API».** «CHECK: whichever way you went, the
argument is the interesting part — local means no per-page cost and it works
offline but you carry the model weight; cloud means better accuracy and a
smaller app but a bill and a network dependency. Write the one you actually
chose and why.»

**Vite for the renderer.** Electron's own tooling is famously slow to reload.
Vite's dev server made the typesetting work possible at all — that stage needed
dozens of tiny adjustments per bubble, and a five-second rebuild between each
one would have made it unbearable enough to give up on.

## What I'd do differently

«CHECK: two or three sentences. Something like: the four stages are one
sequential pipeline, so a single unreadable bubble blocks the page; a
per-region retry queue would let the rest of the page finish. Or whatever the
real regret is — the honest version reads better than the tidy one.»

## Results

«CHECK: fill this in with whatever you can actually measure. Pages per minute?
Share of bubbles that come out readable without manual fixing? Volumes you've
actually read with it? Even "I've read N volumes with this and stopped opening
the translation app" is a real result — it's evidence you use your own tool.»
$md$
WHERE slug = 'mangalens';


-- =========================================================================
-- 2. ChineseApp
-- =========================================================================
UPDATE public.works SET
  role      = 'Solo build — Next.js frontend, FastAPI backend, Supabase schema',
  timeframe = '«CHECK: e.g. Apr–Jun 2026 · ongoing»',
  outcome   = '«CHECK: e.g. "Dictionary lookups over ~120k CC-CEDICT entries in under 50ms"»',
  body_md   = $md$
## The problem

Learning Chinese means constantly answering the same small question — *what is
this character, and what does it mean here?* — and the existing tools each
answer half of it. Dictionary apps give you a definition but no sense of how a
character behaves across the words it appears in. Flashcard apps drill words
you've already decided to learn, which doesn't help with the one in front of
you right now.

I wanted lookup and study to be the same surface, so that finding a word and
keeping it were one action instead of two apps.

## What I built

A web app over CC-CEDICT — the open Chinese-English dictionary, roughly 120,000
entries — with «CHECK: describe what you actually built on top. Search by
character, pinyin, and English? Saved word lists? Spaced repetition? Stroke
order? Be concrete; this paragraph is where a reader decides whether to keep
reading.»

The stack is the same three-tier shape as this portfolio: Next.js on the front,
FastAPI in the middle, Supabase underneath. Server Components do the data
fetching, so a search result page arrives as finished HTML rather than as a
loading spinner that turns into content.

## Decisions worth defending

**Importing CC-CEDICT into Postgres rather than querying a dictionary API.**
CC-CEDICT ships as a single flat text file. Loading it into a table meant
writing an importer and owning the schema, but it bought three things an API
can't: sub-50ms lookups with no network hop, full-text search across
definitions using Postgres's own indexing, and no third-party rate limit
sitting between a learner and the word they're looking at. For a dataset that
changes a few times a year and fits comfortably in a free-tier database, owning
the data is straightforwardly better than renting access to it.

**A FastAPI layer instead of hitting Supabase from the browser.** The frontend
never sees a database credential — the service-role key lives only on the
backend. It's an extra hop and an extra service to deploy, and for a public
dictionary the security argument is admittedly thin. The argument that actually
holds: «CHECK: user accounts and saved lists? A place to put the search-ranking
logic? Say which, because "it's more secure" alone doesn't justify a whole
service for public read-only data.»

**«CHECK: traditional vs. simplified characters».** «CHECK: CC-CEDICT carries
both. Did you index both, pick one, let the user choose? This is a genuine fork
with real consequences for the schema and the search — worth a paragraph.»

## Results

«CHECK: what works today and what doesn't. Query latency you've measured?
Number of entries indexed? Whether you use it yourself for actual study? If
it's still in progress, say so plainly — "the dictionary is solid, the spaced
repetition is half-built" is a more credible sentence than a claim of
completeness.»
$md$
WHERE slug = 'chineseapp';


-- =========================================================================
-- 3. Web Scraping + Telegram Bot
-- =========================================================================
UPDATE public.works SET
  role      = 'Solo build — scrapers, scheduling, and the Telegram delivery bot',
  timeframe = '«CHECK: e.g. 2024 · 4 weeks»',
  outcome   = '«CHECK: e.g. "Replaced a 40-minute daily manual check with a digest that arrives before I wake up"»',
  body_md   = $md$
## The problem

Tracking prices across several Indonesian marketplaces is a job that punishes
consistency. The listings that matter are the ones that appeared in the last
few hours, which means checking every day, which means opening five sites and
scanning them by eye — and skipping a day is exactly when the good listing goes
past.

It's the shape of problem that's genuinely tedious for a person and genuinely
easy for a machine, which is the best possible reason to automate something.

## What I built

A scraper that walks «CHECK: how many? which ones?» marketplaces on a schedule,
normalises what it finds into one shape, and pushes a formatted digest to a
Telegram channel.

The normalising step is most of the actual work. Every site describes a listing
differently — prices with different separators, dates in different formats,
locations at different granularity. The scraper's job isn't fetching HTML; it's
turning five inconsistent descriptions of the same kind of thing into one
consistent record.

Delivery is Telegram because the alternative was email, and a daily email is a
thing you learn to ignore within a week. A message in a channel you already
have open is read.

## Decisions worth defending

**BeautifulSoup rather than a headless browser.** Selenium or Playwright would
have handled JavaScript-rendered listings, but each run would cost a browser
launch and hundreds of megabytes of memory. Parsing static HTML directly is an
order of magnitude cheaper and can run on the smallest instance available. The
trade is real and I'd defend it: «CHECK: did any site actually require JS
rendering, and what did you do about it — a JSON endpoint you found, a
different page, or just dropping that site?»

**Deduplicating on a listing fingerprint rather than on URL.** «CHECK: is this
what you did? The general problem is that the same car gets relisted with a new
URL, so URL-based dedup shows you the same listing repeatedly. If you solved
this, how — hash of title+price+seller? If you didn't, say what the digest does
about repeats.»

**Scheduling in-process rather than with cron.** «CHECK: did you use cron, a
scheduler library, a hosted job runner? The argument for in-process is that the
schedule lives in the same repo as the code it runs, so it's version-controlled
and it deploys atomically. The argument for cron is that it survives your
process crashing. Write whichever you picked.»

## What broke

«CHECK: this section is worth writing. Scrapers break — a site changes its
markup and the parser silently returns nothing. What actually went wrong, how
long before you noticed, and what you changed so you'd notice faster? A
paragraph about a failure you handled is more convincing than three about
things that worked.»

## Results

«CHECK: listings tracked? Time saved per week? How long it ran unattended?
Whether it still runs today — and if it doesn't, why not. "It ran for eight
months until the biggest site moved to a JS-rendered listing page" is a good,
honest ending.»
$md$
WHERE slug = 'web-scraping-telegram-bot';


-- =========================================================================
-- 4. Multi-Platform Product Comparison
-- =========================================================================
UPDATE public.works SET
  role      = 'Solo build — data collection, analysis, and the Streamlit interface',
  timeframe = '«CHECK: e.g. 2024 · 3 weeks»',
  outcome   = '«CHECK: e.g. "Surfaced a consistent X% price spread on identical SKUs between two platforms"»',
  body_md   = $md$
## The problem

The same product sells at meaningfully different prices across Indonesian
e-commerce platforms, and the difference isn't stable — it moves with
promotions, shipping subsidies, and seller-level pricing. Comparing by hand
gives you one snapshot, for one product, at one moment. That's enough to make a
single purchase and not enough to see a pattern.

I wanted to see the pattern.

## What I built

A pipeline that collects listings for the same products across «CHECK: which
platforms?», matches them to a common product identity, and presents the
comparison in a Streamlit dashboard: price distributions per platform, spread
on identical items, and «CHECK: what else does it show?».

The hard part isn't the comparison — it's the **matching**. Two platforms list
the same phone as "Samsung Galaxy A54 5G 8/256GB Awesome Graphite" and "SAMSUNG
A54 5G RAM 8 ROM 256 GB Garansi Resmi". Deciding those are the same product is
a fuzzy string problem with real consequences: match too loosely and you're
comparing a phone to its case, match too strictly and you have almost no pairs
left to compare.

«CHECK: how did you solve it? Normalised tokens and fuzzy ratio, a similarity
threshold you tuned by hand, manual mapping for a fixed product set? This is
the most interesting paragraph in the write-up — the answer here is what makes
it an analysis project rather than a scraping project.»

## Decisions worth defending

**Pandas in-memory rather than a database.** The dataset is «CHECK: roughly how
many rows?» — small enough to hold in memory, which means the whole analysis is
one script with no schema to maintain and no service to run. Reaching for
Postgres at this size would have added ceremony without buying anything. The
line where that stops being true is roughly the point where the data no longer
fits in RAM, and this was comfortably below it.

**Streamlit rather than a notebook or a real web app.** A notebook is where the
analysis happened, but a notebook isn't something you hand to someone else — it
demands they run it. A full web app would have taken longer than the analysis
did. Streamlit is the middle: an interactive, shareable interface for
essentially the cost of writing the script. The ceiling is low (you fight it
the moment you want custom layout) but this never needed to go past it.

**«CHECK: how did you handle shipping cost?»** «CHECK: worth a paragraph if you
did anything about it — a headline price comparison that ignores shipping is
comparing the wrong number, and a reader who knows the domain will wonder.»

## Results

«CHECK: what did you actually find? A real finding, even a small one, is what
turns this from "I built a dashboard" into "I answered a question". Something
like "platform A was consistently 6–8% cheaper on electronics but more
expensive on groceries once shipping was included" — with your real numbers.»
$md$
WHERE slug = 'multi-platform-product-comparison';


-- =========================================================================
-- 5. AML Reporting System
-- =========================================================================
-- NOTE: this is client/employer work, so the write-up is framed around
-- approach and outcome rather than implementation detail. Keep it that way —
-- describing a bank's internal detection logic in public is a genuine
-- problem, and a reader who knows the domain will respect the restraint more
-- than they'd respect the detail. If anything below reveals more than your
-- NDA allows, cut it; a shorter honest entry beats a detailed risky one.
-- =========================================================================
UPDATE public.works SET
  role      = '«CHECK: your actual role and team size — e.g. "Developer, team of 4"»',
  timeframe = '«CHECK: e.g. 2023 · 6 months»',
  outcome   = '«CHECK: e.g. "Cut monthly regulatory report preparation from N days to N hours"»',
  body_md   = $md$
## The problem

Anti-money-laundering reporting is a regulatory obligation with an unforgiving
shape: the format is fixed by the regulator, the deadline is fixed by law, and
the data comes from operational systems that were built for running a business,
not for reporting on one. Getting from one to the other had been «CHECK: how
was it done before? manual extraction, spreadsheets, a partly-scripted process?
The "before" state is what makes the "after" mean something.»

The cost of getting it wrong isn't a bug ticket. It's a regulatory finding.

## What I built

«CHECK: describe the scope at a level you're comfortable publishing — e.g. "a
set of PL/SQL packages that extract, validate, and assemble monthly submissions
into the regulator's required XML schema, with a validation pass that rejects a
malformed report before submission rather than after."»

Three properties mattered more than anything else:

- **Correctness over speed.** A report that's fast and wrong is worse than
  useless. Every transformation was written to fail loudly on unexpected input
  rather than to guess.
- **Reproducibility.** Running the same period twice must produce the same
  file. That sounds obvious and is surprisingly easy to violate the moment
  anything depends on "now".
- **Auditability.** When the regulator asks why a figure is what it is, the
  answer has to be traceable back to source rows.

## Decisions worth defending

**PL/SQL rather than pulling the data out to a scripting language.** Moving
millions of rows across the network to transform them in Python and push them
back is slower and adds a failure mode for no benefit — the data already lives
in Oracle, and set-based SQL on the server is where that work belongs. The cost
is that the logic lives in a place that's harder to unit-test and version than
application code, which is a real drawback «CHECK: how did you handle testing
and version control for the packages?».

**Validating against the XML schema before submission, not after.** «CHECK: is
this what you did? The general argument: a validation error caught at
generation time is a five-minute fix, and the same error caught by the
regulator's intake system is an incident with a paper trail. Cheap check,
enormous asymmetry in cost.»

**«CHECK: one more real decision.»** «CHECK: how you handled late-arriving
transactions and restatements is a good candidate — it's a genuinely hard
problem (a report for March that has to change in May) and showing you thought
about it signals domain understanding.»

## What I took from it

«CHECK: 2–3 sentences. This is the section that connects the project to who you
are now — the AML work is where the "correctness matters more than cleverness"
instinct that shows up in your QA work probably came from. Say it in your own
words; the connection between a 2023 banking project and your current SET role
is worth making explicit, because a reader won't make it for you.»

## Results

«CHECK: whatever you can share. Report preparation time before and after,
volume of transactions processed per cycle, number of reporting cycles it ran
without a finding. If the numbers are confidential, a qualitative statement is
fine — "ran every monthly cycle for N months without a regulatory finding" says
plenty without disclosing anything.»
$md$
WHERE slug = 'aml-reporting-system';


-- =========================================================================
-- Verify
-- =========================================================================
-- Run this after the updates. `remaining_checks` counts the «CHECK» markers
-- still in each write-up — your to-do list, and your reminder of what would
-- go live if you stopped here.
SELECT
  slug,
  length(body_md)                                    AS body_chars,
  (length(body_md) - length(replace(body_md, '«CHECK', ''))) / 6
                                                     AS remaining_checks,
  role IS NOT NULL AND role NOT LIKE '%CHECK%'       AS role_done,
  timeframe IS NOT NULL AND timeframe NOT LIKE '%CHECK%' AS timeframe_done,
  outcome IS NOT NULL AND outcome NOT LIKE '%CHECK%' AS outcome_done
FROM public.works
ORDER BY remaining_checks DESC;
