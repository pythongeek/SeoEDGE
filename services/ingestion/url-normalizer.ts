/**
 * Normalizes a given URL string according to specific SEO rules.
 * - Enforces a lowercase hostname.
 * - Strips all UTM tracking parameters (`utm_*`).
 * - Removes trailing slashes from the path (e.g., `/page/` becomes `/page`).
 *
 * @param urlString The raw URL string to be normalized.
 * @returns A normalized URL string. Returns the original string if it's invalid.
 */
export function normalizeUrl(urlString: string): string {
  try {
    // Handle protocol-relative URLs by adding a dummy base
    if (urlString.startsWith('//')) {
      urlString = 'https:' + urlString;
    }

    const url = new URL(urlString);

    // 1. Enforce a lowercase hostname.
    url.hostname = url.hostname.toLowerCase();

    // 2. Strip all UTM parameters.
    const searchParams = new URLSearchParams(url.search);
    const keysToDelete: string[] = [];
    for (const key of searchParams.keys()) {
      if (key.startsWith('utm_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => searchParams.delete(key));
    url.search = searchParams.toString();

    // 3. Resolve trailing slashes to a consistent format (remove them).
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch (error) {
    // If URL parsing fails, return the original string.
    // This can happen with malformed URLs like 'http://'.
    console.warn(`Could not normalize invalid URL: "${urlString}"`);
    return urlString;
  }
}
