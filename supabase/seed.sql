-- =========================================================================
-- Seed data — run this ONCE after schema.sql to populate the initial three
-- projects. Re-running will duplicate rows, so delete old rows first or
-- only run this on a fresh project.
--
-- To add a new project later, you have two easy options:
--   1. Supabase Dashboard → Table Editor → works → Insert row.
--   2. Append an INSERT statement to this file and run it.
-- Either way, the portfolio grid updates automatically on the next page load.
-- =========================================================================

INSERT INTO public.works (title, description, category, tech, year, image, featured)
VALUES
  (
    'Web Scraping + Telegram Bot',
    'Scrapes live car listings across Indonesian e-commerce sites and pushes a daily price summary to a Telegram channel.',
    'automation',
    ARRAY['Python', 'BeautifulSoup', 'Telegram API'],
    2024,
    '/images/work-1.png',
    true
  ),
  (
    'Multi-Platform Product Comparison',
    'Aggregates product listings from multiple marketplaces so shoppers can compare price, stock, and seller reliability side-by-side.',
    'data',
    ARRAY['Python', 'Pandas', 'Streamlit'],
    2024,
    '/images/work-2.png',
    false
  ),
  (
    'AML Reporting System',
    'Oracle-backed Anti-Money-Laundering XML reporting pipeline that flags suspicious transactions and generates regulator-ready files.',
    'data',
    ARRAY['Oracle', 'PL/SQL', 'XML'],
    2023,
    '/images/work-3.png',
    false
  );
