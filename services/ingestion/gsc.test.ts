import { searchconsole_v1 } from '@googleapis/searchconsole';
import { fetchGSCDataForDate } from './gsc';

// We are mocking the entire GSC client that is passed to the function
const mockQuery = jest.fn();
const mockGscClient = {
    searchanalytics: {
        query: mockQuery,
    },
} as unknown as searchconsole_v1.Searchconsole;

describe('fetchGSCDataForDate', () => {

    beforeEach(() => {
        // Reset the mock's history before each test
        mockQuery.mockClear();
        // Restore real timers if a test failed and didn't clean up
        jest.useRealTimers();
    });

    test('should handle API pagination correctly', async () => {
        const siteUrl = 'sc-domain:example.com';
        const date = '2023-01-01';
        const rowLimit = 25000; // This must match the limit in the implementation

        // Mock response for the first page (full)
        mockQuery.mockResolvedValueOnce({
            data: {
                rows: Array(rowLimit).fill({ keys: ['page1.html'], clicks: 1, impressions: 10 }),
            },
        });

        // Mock response for the second page (not full)
        mockQuery.mockResolvedValueOnce({
            data: {
                rows: Array(100).fill({ keys: ['page2.html'], clicks: 2, impressions: 20 }),
            },
        });

        const results = await fetchGSCDataForDate(mockGscClient, siteUrl, date);

        // Should have made two calls to the API
        expect(mockQuery).toHaveBeenCalledTimes(2);

        // Verify the `startRow` parameter was updated for the second call
        expect(mockQuery.mock.calls[0][0].requestBody.startRow).toBe(0);
        expect(mockQuery.mock.calls[1][0].requestBody.startRow).toBe(rowLimit);

        // Verify the total number of rows returned is correct
        expect(results.length).toBe(rowLimit + 100);
        expect(results[0].clicks).toBe(1);
        expect(results[rowLimit].clicks).toBe(2);
    });

    test('should retry on transient API errors and eventually succeed', async () => {
        const siteUrl = 'sc-domain:example.com';
        const date = '2023-01-01';

        // Mock API to fail twice then succeed
        mockQuery
            .mockRejectedValueOnce(new Error('API rate limit exceeded'))
            .mockRejectedValueOnce(new Error('Server error 503'))
            .mockResolvedValueOnce({
                data: {
                    rows: [{ keys: ['final-page.html'], clicks: 100, impressions: 1000 }],
                },
            });

        // Use fake timers to avoid waiting for real backoff delays
        jest.useFakeTimers();

        const promise = fetchGSCDataForDate(mockGscClient, siteUrl, date);

        // Fast-forward time to trigger all retries
        await jest.advanceTimersByTimeAsync(15000); // Enough time for a few retries

        const results = await promise;

        // Should have been called 3 times (initial call + 2 retries)
        expect(mockQuery).toHaveBeenCalledTimes(3);

        // Should have eventually returned the successful result
        expect(results.length).toBe(1);
        expect(results[0].clicks).toBe(100);

        // Restore real timers
        jest.useRealTimers();
    });

    test('should throw an error after max retries are exceeded', async () => {
        const siteUrl = 'sc-domain:example.com';
        const date = '2023-01-01';
        const maxRetries = 5; // Must match the implementation

        // Mock the API to always fail
        mockQuery.mockRejectedValue(new Error('Persistent API error'));

        jest.useFakeTimers();

        const promise = fetchGSCDataForDate(mockGscClient, siteUrl, date);

        // Advance time enough for all retries to have occurred
        await jest.advanceTimersByTimeAsync(60000);

        // The function should reject with a specific error message
        await expect(promise).rejects.toThrow(
            `Failed to fetch GSC data for ${date} after ${maxRetries} attempts.`
        );

        // Should have been called 'maxRetries' + 1 times
        expect(mockQuery).toHaveBeenCalledTimes(maxRetries);

        jest.useRealTimers();
    });
});
