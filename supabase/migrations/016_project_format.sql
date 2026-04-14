-- Add a content-format tag to projects (Carousel / Text Post / Reel).
-- Nullable so legacy rows keep working.
alter table projects add column if not exists format text
  check (format in ('carousel', 'text', 'reel'));
