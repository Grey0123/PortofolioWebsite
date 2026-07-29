# Writing a project case study

How to fill in a `/projects/[slug]` page. All of this is **data**, edited in
the Supabase dashboard — no commit, no redeploy. Changes appear on the live
site within ~60 seconds (the ISR `revalidate` window).

The one exception is **images**, which are files and do need a commit.

---

## Where to edit

Supabase Dashboard → **Table Editor** → `works` → click a row → the side panel
lets you edit each column. For `body_md` use the expand icon to get a proper
multi-line box.

---

## The columns you fill in

| Column | Shows up as | Notes |
| --- | --- | --- |
| `description` | The lead paragraph under the title | Already filled. Also used for the card and for link previews when the URL is shared. Keep it one or two sentences. |
| `role` | "Role" in the context strip | e.g. `Solo build`, `Data analyst, team of 4` |
| `timeframe` | "Timeframe" | e.g. `Mar–May 2024 · 6 weeks` |
| `outcome` | "Outcome" | One line, ideally with a number. `Cut manual triage from 4h/wk to 20min` |
| `body_md` | The long write-up | Markdown. See below. |
| `slug` | The URL | Change it only before you've shared the link anywhere. |

`role`, `timeframe`, and `outcome` are optional and independent — the context
strip only renders if at least one has a value, and it lays out whichever ones
are filled. A half-filled project degrades gracefully rather than showing
blanks.

---

## Structure that works

From `TODO.md` item 7, and it holds up: a case study answers five questions in
order.

```markdown
## The problem

What was broken, slow, or manual before you showed up. Be concrete about the
pain — "the team pulled 40 listings by hand every morning" beats "the process
was inefficient".

## What I built

The shape of the thing. One paragraph of prose, then specifics.

## Decisions worth defending

Two or three real forks in the road, each with the reasoning. This is the
section that separates a portfolio from a résumé — anyone can list what they
used, almost nobody explains why they chose it over the alternative.

## Results

Numbers if you have them. Honest qualitative outcomes if you don't. Never
invent a metric; an interviewer WILL ask how you measured it.

## What I'd do differently

Not false modesty — evidence that you kept thinking after you shipped. This is
the section experienced interviewers skip ahead to.
```

**Start headings at `##`, not `#`.** The page already renders the project
title as the one and only `<h1>`; a second one breaks the document outline
that screen readers and search engines use.

---

## Markdown you can use

Standard markdown plus GitHub Flavored Markdown, all styled to match the site:

- `## Heading` and `### Subheading`
- `**bold**` — renders brighter than body text, use it for emphasis not decoration
- Bulleted and numbered lists
- `` `inline code` `` and fenced code blocks with a language tag
- `> blockquote` — rendered with an accent left-border
- `[link text](https://example.com)` — external links open in a new tab automatically; a link starting with `/` stays in-app
- Tables — genuinely useful for before/after comparisons
- `---` horizontal rules

Code blocks:

````markdown
```python
def fetch_listings(page: int) -> list[Listing]:
    ...
```
````

Syntax highlighting isn't wired up yet, so blocks render in a clean mono style
without colour. Keep snippets to ~15 lines — a well-chosen fragment reads; a
whole file gets skipped.

**Raw HTML does not render.** It'll show as visible text. That's deliberate:
it means nothing in the database can inject scripts into the page.

---

## Images

Two steps, because the file needs to exist before a row can point at it.

**1. Add the file** to `public/images/projects/<slug>/`:

```
public/images/projects/mangalens/dashboard.png
```

Then commit and push — this part *does* need a deploy, because the file ships
with the frontend.

**2. Add a row** to `project_images` (Table Editor → `project_images` → Insert):

| Column | Value |
| --- | --- |
| `work_id` | the `id` of the project (copy it from the `works` table) |
| `image_path` | `/images/projects/mangalens/dashboard.png` |
| `alt` | Required. Describe what the image *shows*, not that it's a screenshot. |
| `caption` | Optional, displays under the image |
| `sort_order` | `0`, `1`, `2` … controls gallery order |

Or via SQL, which avoids hunting for the UUID:

```sql
insert into project_images (work_id, image_path, alt, caption, sort_order)
select id, '/images/projects/mangalens/dashboard.png',
       'The MangaLens reading dashboard showing tracked series',
       'The main view', 0
from works where slug = 'mangalens';
```

> **Note:** the gallery UI isn't built yet — rows added now are served by the
> API but not yet displayed. That's step 6 of `docs/ROADMAP.md`.

`image_path` also accepts a full `https://` URL, so moving to Supabase Storage
later is a data change rather than a code change.

---

## Checking your work

Live site updates within ~60s. If it doesn't:

1. **Hard refresh** — you may be seeing a cached page.
2. **Check the backend is awake.** Render's free tier sleeps after 15 minutes
   idle; the first request takes 30–60s. If the page shows "Couldn't load this
   project", that's what happened — hit *Try again*.
3. **"No such project"** means the API returned a 404. Either the slug is
   wrong, or the backend is running old code. Check the Vercel function logs:
   a body of `{"detail":"Not Found"}` means the route is missing (redeploy
   Render), while `{"detail":"No project with slug '...'"}` means the row
   genuinely isn't there.

---

## A word on the writing itself

The failure mode for these pages isn't bad markdown, it's generic prose. From
the code review in `TODO.md`: *"Write it in your own words first, even if
messy. Don't let AI polish it back into the same cadence."*

Specifics are what make a case study credible. "Scraped 6 Indonesian
e-commerce sites, ~2,000 listings/day, deduped on a normalized title hash"
tells a reader more than three paragraphs about your passion for clean data.
