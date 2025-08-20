import { normalizeRow } from './gsc';

describe('normalizeRow', () => {
    const mockRawRow = {
        clicks: 10,
        impressions: 100,
        ctr: 0.1,
        position: 1,
    };
    const siteUrl = 'sc-domain:example.com';
    const date = '2023-01-01';

    test('should remove all utm_* tracking parameters', () => {
        const rawRow = { ...mockRawRow, keys: ['https://example.com/page?utm_source=google&utm_medium=cpc&other=param', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://example.com/page?other=param');
    });

    test('should convert URL to lowercase', () => {
        const rawRow = { ...mockRawRow, keys: ['https://EXAMPLE.com/PAGE', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://example.com/page');
    });

    test('should remove trailing slash from URL path', () => {
        const rawRow = { ...mockRawRow, keys: ['https://example.com/page/', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://example.com/page');
    });

    test('should not remove trailing slash from root URL', () => {
        const rawRow = { ...mockRawRow, keys: ['https://example.com/', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        // new URL('https://example.com/').pathname is '/', so after slice(0, -1) it becomes '', which is not what we want for root.
        // My implementation correctly handles this. The path is `/`, length is 1, so the slice is not executed.
        // but `normalizedUrl = `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;` will result in `https://example.com/`
        // The current implementation is slightly different from what I thought. Let's check `gsc.ts`
        // `if (path.length > 1 && path.endsWith('/')) { path = path.slice(0, -1); }`
        // So for 'https://example.com/', path is '/', length is 1. The condition is false. The path remains '/'.
        // `normalizedUrl` will be `https://example.com/`
        // But for `https://example.com/page/`, path is `/page/`, length is 6. The condition is true. path becomes `/page`.
        // `normalizedUrl` will be `https://example.com/page`.
        // This seems correct. Let's adjust the test to expect `https://example.com/`.
        // Ah, wait. The code is: `normalizedUrl = `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;`
        // Let's trace `new URL('https://example.com/')`. `protocol` is `https:`, `hostname` is `example.com`, `pathname` is `/`.
        // My code does `path = url.pathname`, so `path` is `/`. `path.length > 1` is false.
        // `normalizedUrl` becomes `https://example.com/`. This seems to be an issue. It should be `https://example.com`.
        // Let's re-read the requirement: "Ensure a consistent trailing slash policy (e.g., always remove it)."
        // So `https://example.com/` should become `https://example.com`.
        // Let's fix the implementation in `gsc.ts` first.
        // No, I should not fix it now. I should write the test that fails, then fix the code.
        // So the test should expect `https://example.com`.
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://example.com');
    });

    test('should handle URL with no path', () => {
        const rawRow = { ...mockRawRow, keys: ['https://example.com', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://example.com');
    });

    test('should handle complex URL with mixed case, utm params, and trailing slash', () => {
        const rawRow = { ...mockRawRow, keys: ['https://WWW.Example.Com/Some/Path/?utm_campaign=test&id=123', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://www.example.com/some/path?id=123');
    });

    test('should return "INVALID_URL" for a malformed URL string', () => {
        const rawRow = { ...mockRawRow, keys: ['not a valid url', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('INVALID_URL');
    });

    test('should handle url with multiple query params and utm params', () => {
        const rawRow = { ...mockRawRow, keys: ['https://example.com/page?a=1&utm_source=google&b=2&utm_medium=cpc', 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe('https://example.com/page?a=1&b=2');
    });

    test('should not affect a URL that is already normalized', () => {
        const url = 'https://www.example.com/path/to/resource?param=value';
        const rawRow = { ...mockRawRow, keys: [url, 'query', 'device', 'country', 'search'] };
        const result = normalizeRow(rawRow, siteUrl, date);
        expect(result.normalizedUrl).toBe(url);
    });
});
