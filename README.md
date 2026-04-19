# Nabil's Portfolio — Next.js

A modern rebuild of my portfolio website, converted from plain HTML/CSS/JS to **Next.js 14 (App Router) + TypeScript + Tailwind CSS**.

## Getting started

Install dependencies (this creates `node_modules/`):

```bash
npm install
```

Run the dev server (hot-reload on save):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful scripts

| Command            | What it does                                      |
| ------------------ | ------------------------------------------------- |
| `npm run dev`      | Start dev server with hot reload                  |
| `npm run build`    | Build a production bundle in `.next/`             |
| `npm run start`    | Start the production server (after `build`)      |
| `npm run lint`     | Run ESLint (Next.js's recommended rules)         |
| `npm run typecheck`| Run TypeScript type checking (no emit)            |

## Project structure

```
app/
  layout.tsx      # Root layout — wraps every page. <html>/<body> live here.
  page.tsx        # The home route ("/"). Composes the sections.
  globals.css     # Tailwind directives + custom CSS (hero bg, glow effect).
components/
  Header.tsx      # Hero + navigation
  Navbar.tsx      # Nav bar (Client Component — needs state for the mobile menu)
  About.tsx       # About section with Skills / Experience / Education tabs
  Services.tsx    # Six service cards
  Portfolio.tsx   # Work showcase with hover overlay
  Contact.tsx     # Contact form (submits to the original Google Sheet endpoint)
  Footer.tsx      # Footer
public/
  images/         # Static assets — referenced as /images/foo.png
```

## Next.js concepts used here (quick tour)

- **App Router**: Files inside `app/` become routes. `page.tsx` = page, `layout.tsx` = wrapping layout.
- **Server Components by default**: Everything in `app/` and `components/` renders on the server unless the file starts with `"use client"`. Server Components ship less JS to the browser.
- **`"use client"`**: Added to components that need state, effects, or event handlers (`Navbar`, `About`, `Contact`).
- **`next/image`**: Auto-optimizes images — lazy loading, responsive sizing, modern formats (WebP/AVIF).
- **`next/font`**: Loads Google Fonts (Poppins) with zero layout shift, no external CSS links.
- **Metadata API**: `export const metadata` in `layout.tsx` replaces `<title>` / `<meta>` tags.
- **Tailwind**: Utility classes for styling. Custom design tokens (`accent`, `muted`, `card`) live in `tailwind.config.ts`.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [react-icons](https://react-icons.github.io/react-icons/) (replaces the old Font Awesome CDN)
