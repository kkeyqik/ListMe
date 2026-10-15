/**
 * Serialises structured data for a `<script type="application/ld+json">` tag.
 * Escapes `<`, `>` and `&` so user-supplied text (listing titles, descriptions)
 * cannot close the script tag and inject HTML.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
