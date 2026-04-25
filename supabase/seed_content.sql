-- =========================================================================
-- Seed data for the content tables (everything that used to be hardcoded
-- in components/About.tsx, Services.tsx, StatsStrip.tsx, Contact.tsx,
-- TechMarquee.tsx, hero/RotatingRole.tsx).
--
-- Run this ONCE, after schema.sql and seed.sql.
-- =========================================================================


-- ---------- HERO: rotating roles ----------
INSERT INTO public.rotating_roles (label, sort_order) VALUES
  ('Data Analyst',                 0),
  ('Software Engineer in Test',    1),
  ('Java Developer',               2),
  ('Business Analyst',             3),
  ('AI Engineer',                  4);


-- ---------- HERO: stats strip ----------
INSERT INTO public.stats (icon, label, value_number, value_text, suffix, sort_order) VALUES
  ('FaBriefcase',     'Years in tech',     3,   NULL,        '+', 0),
  ('FaProjectDiagram','Projects shipped',  12,  NULL,        '+', 1),
  ('FaUserTie',       'Roles held',        4,   NULL,        NULL, 2),
  ('FaMapMarkerAlt',  'Based in',          NULL,'Indonesia', NULL, 3);


-- ---------- ABOUT: skills ----------
INSERT INTO public.skills (title, detail, sort_order) VALUES
  ('Data Analyst',           'Designing dashboards & analyzing key data points', 0),
  ('Quality Assurance',      'Automation frameworks, CI pipelines, DB verification', 1),
  ('Artificial Intelligence','Models, recommendations, intelligent systems', 2),
  ('Web Design',             'UI/UX for web and mobile apps', 3);


-- ---------- ABOUT: timeline (experience + education) ----------
INSERT INTO public.timeline (kind, period, title, org, detail, sort_order) VALUES
  (
    'experience',
    '2024 – 2025',
    'Java Developer · Data Analytics · Business Analyst',
    'Cygnet Pericon',
    'Multi-hat role spanning Java services, analytics work, and business analysis. Designed queries and reporting pipelines alongside product-facing work.',
    0
  ),
  (
    'experience',
    '2023 – 2024',
    'Software Engineer in Test',
    'Blibli.com',
    'Built robust automation with Selenium, Cucumber, and Playwright (Java). Contributed to a parallel Jenkins pipeline and DB-verification layer for e-commerce flows.',
    1
  ),
  (
    'education',
    '2020 – 2023',
    'Bachelor of Computer Science',
    'Bina Nusantara University',
    'Focus on software engineering, data structures, and intelligent systems.',
    0
  );


-- ---------- SERVICES grid ----------
INSERT INTO public.services (icon, title, tagline, description, color, tech, sort_order) VALUES
  (
    'FaDatabase',
    'Data Analytics',
    'Turning raw data into decisions.',
    'I design dashboards, write optimized queries, and build reporting pipelines that surface the insights driving business decisions. Comfortable in both operational reporting and exploratory analysis.',
    '#00b7ff',
    ARRAY['SQL','Oracle','SSMS','Excel','Power BI'],
    0
  ),
  (
    'FaRobot',
    'Artificial Intelligence',
    'Smarter systems, personalized outcomes.',
    'I build AI-driven features — product recommendations, automated data processing, and intelligent decision layers — that bring measurable lift to e-commerce and SaaS experiences.',
    '#ff30ff',
    ARRAY['Python','TensorFlow','Scikit-learn','LLMs','Vector DBs'],
    1
  ),
  (
    'FaMicroscope',
    'Quality Assurance',
    'Shipping with confidence, every release.',
    'I write test cases, build robust automation frameworks, and wire up parallel CI pipelines. Deep experience in UI, API, and database verification for complex e-commerce platforms.',
    '#43b02a',
    ARRAY['Selenium','Playwright','Cucumber','Jenkins','Java'],
    2
  ),
  (
    'FaCode',
    'Web Development',
    'Fast, responsive, production-ready.',
    'I build modern web apps with React and Next.js — clean component architectures, smooth UX, and solid performance. From marketing sites to authenticated dashboards and everything between.',
    '#ff004f',
    ARRAY['React','Next.js','TypeScript','Tailwind','REST APIs'],
    3
  ),
  (
    'FaMobileAlt',
    'App Development',
    'Native-feeling experiences on any device.',
    'I build cross-platform mobile apps with thoughtful UX and reliable performance — touch-first interactions, offline-friendly flows, and clean API integrations.',
    '#f89820',
    ARRAY['React Native','Expo','Flutter','Firebase'],
    4
  ),
  (
    'FaGamepad',
    'Game Development',
    'Play-first mechanics and interactive systems.',
    'Exploring game mechanics, interactive systems, and engaging loops for players — from gameplay prototyping to level design experiments.',
    '#f7df1e',
    ARRAY['Unity','C#','Godot','Game Design'],
    5
  );


-- ---------- CONTACT info (single row) ----------
INSERT INTO public.contact_info (email, phone, cv_url) VALUES
  (
    'nabilgaharu@gmail.com',
    '+62 812 8998 870',
    '/images/CV_Nabil Ananta Satria Gaharu_Updated 2025.pdf'
  );


-- ---------- CONTACT social links ----------
INSERT INTO public.social_links (platform, url, icon, sort_order) VALUES
  ('Facebook',  '#',                                                    'FaFacebook',       0),
  ('Twitter',   '#',                                                    'FaTwitterSquare',  1),
  ('Instagram', 'https://instagram.com/nabilgaharu',                    'FaInstagram',      2),
  ('LinkedIn',  'https://www.linkedin.com/in/nabil-gaharu-601535215/',  'FaLinkedin',       3);


-- ---------- ORBIT SERVICES (TechMarquee 3D hub) ----------
-- Insert services first; tools below join back to them via the unique
-- `slug` column to discover the auto-generated UUID.

INSERT INTO public.orbit_services (slug, name, short_name, tagline, color, icon, sort_order) VALUES
  ('backend',  'Backend Development', 'Backend',  'Scalable APIs & services',     '#00b7ff', 'FaServer',     0),
  ('ai',       'AI & Automation',     'AI',       'Intelligent systems & agents', '#ff30ff', 'FaBrain',      1),
  ('data',     'Data Engineering',    'Data',     'Reliable pipelines & insights','#43b02a', 'FaChartLine',  2),
  ('scraping', 'Web Scraping',        'Scraping', 'Collect data at scale',        '#f89820', 'FaSpider',     3),
  ('frontend', 'Web & Mobile',        'Frontend', 'Elegant user experiences',     '#ff004f', 'FaCode',       4),
  ('api',      'API Integration',     'APIs',     'Plug systems together',        '#2496ed', 'FaPlug',       5),
  ('infra',    'Database & Infra',    'Infra',    'Containers, storage, ops',     '#14b8a6', 'FaDatabase',   6);


INSERT INTO public.orbit_tools (orbit_service_id, name, icon, sort_order)
SELECT s.id, t.name, t.icon, t.sort_order
FROM public.orbit_services s
JOIN (VALUES
  -- backend
  ('backend',  'Java',          'FaJava',        0),
  ('backend',  'Spring Boot',   'SiSpring',      1),
  ('backend',  'Node.js',       'SiNodedotjs',   2),
  ('backend',  'FastAPI',       'SiFastapi',     3),
  ('backend',  'GraphQL',       'SiGraphql',     4),
  ('backend',  'Redis',         'SiRedis',       5),
  -- ai
  ('ai',       'Python',        'SiPython',      0),
  ('ai',       'TensorFlow',    'SiTensorflow',  1),
  ('ai',       'LLMs',          'FaRobot',       2),
  ('ai',       'OpenAI',        'SiOpenai',      3),
  ('ai',       'LangChain',     'SiLangchain',   4),
  ('ai',       'Vector DB',     'FaDatabase',    5),
  -- data
  ('data',     'PostgreSQL',    'SiPostgresql',  0),
  ('data',     'MySQL',         'SiMysql',       1),
  ('data',     'MongoDB',       'SiMongodb',     2),
  ('data',     'Oracle',        'FaDatabase',    3),
  ('data',     'Python',        'SiPython',      4),
  ('data',     'SQL',           NULL,            5),
  -- scraping
  ('scraping', 'Playwright',    NULL,            0),
  ('scraping', 'Selenium',      'SiSelenium',    1),
  ('scraping', 'Python',        'SiPython',      2),
  ('scraping', 'BeautifulSoup', NULL,            3),
  ('scraping', 'Scrapy',        NULL,            4),
  ('scraping', 'Puppeteer',     NULL,            5),
  -- frontend
  ('frontend', 'React',         'SiReact',       0),
  ('frontend', 'Next.js',       'SiNextdotjs',   1),
  ('frontend', 'TypeScript',    'SiTypescript',  2),
  ('frontend', 'Flutter',       'SiFlutter',     3),
  ('frontend', 'Tailwind',      'SiTailwindcss', 4),
  ('frontend', 'Firebase',      'SiFirebase',    5),
  -- api
  ('api',      'Binance API',   NULL,            0),
  ('api',      'Bybit API',     NULL,            1),
  ('api',      'Stripe',        NULL,            2),
  ('api',      'REST',          'FaSatelliteDish', 3),
  ('api',      'GraphQL',       'SiGraphql',     4),
  ('api',      'Webhooks',      NULL,            5),
  -- infra
  ('infra',    'Docker',        'SiDocker',      0),
  ('infra',    'Git',           'SiGit',         1),
  ('infra',    'PostgreSQL',    'SiPostgresql',  2),
  ('infra',    'Redis',         'SiRedis',       3),
  ('infra',    'MongoDB',       'SiMongodb',     4)
) AS t(slug, name, icon, sort_order)
ON s.slug = t.slug;
