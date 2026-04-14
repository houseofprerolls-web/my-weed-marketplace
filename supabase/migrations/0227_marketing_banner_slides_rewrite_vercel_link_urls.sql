-- Click-through URLs on marketing slides were sometimes saved as full Vercel deployment origins.
-- Normalize those rows to the public production host (path, query string, and hash preserved).

update public.marketing_banner_slides
set
  link_url = regexp_replace(link_url, '^https?://[^/]+', 'https://www.datreehouse.com', 'i'),
  updated_at = now()
where link_url is not null
  and link_url ~* '^https?://[^/]*\.vercel\.app(/|\?|#|$)';
