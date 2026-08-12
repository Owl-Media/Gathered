import type { MetadataRoute } from "next";

/**
 * Spec 5.3 / 15.10.Event pages must not be indexed, and there is no public
 * directory or sitemap. Individual pages also send `noindex` metadata; this is
 * the belt to that pair of braces, and deliberately no `sitemap` is declared.
 */
export default function robots(): MetadataRoute. Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
