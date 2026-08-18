const INTERNAL_PAGE_PREFIX = "/pages/";
const PAGE_SLUG_PATTERN = /^[a-z0-9가-힣-]{1,200}$/u;

function pageSlugFromHref(href: string): string | null {
  if (!href.startsWith(INTERNAL_PAGE_PREFIX) || href.startsWith("//")) return null;
  const rawSlug = href.slice(INTERNAL_PAGE_PREFIX.length).split(/[?#]/, 1)[0] ?? "";
  if (!rawSlug || rawSlug.includes("/")) return null;

  try {
    const slug = decodeURIComponent(rawSlug);
    return PAGE_SLUG_PATTERN.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

export function extractInternalPageSlugs(content: unknown): string[] {
  const slugs = new Set<string>();
  const visited = new WeakSet<object>();

  function visit(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    if (!Array.isArray(value)) {
      const candidate = value as Record<string, unknown>;
      if (candidate.type === "link" && typeof candidate.href === "string") {
        const slug = pageSlugFromHref(candidate.href);
        if (slug) slugs.add(slug);
      }
    }

    for (const nested of Array.isArray(value) ? value : Object.values(value)) visit(nested);
  }

  visit(content);
  return [...slugs];
}
