import { writeToFirestoreInBatches } from './gsc';
import { GscFirestoreDoc } from './gsc'; // Assuming GscFirestoreDoc is exported from gsc.ts

// Mocking the Firestore client and its chained methods
const mockSet = jest.fn();
const mockCommit = jest.fn().mockResolvedValue(null); // Default to success
const mockDoc = jest.fn(() => ({ set: mockSet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockBatch = jest.fn(() => ({
    set: mockSet,
    commit: mockCommit,
}));

// The mock Firestore instance that will be passed to our function
const mockDb = {
    batch: mockBatch,
    collection: mockCollection,
} as any; // Using 'any' to simplify the mock setup

describe('writeToFirestoreInBatches', () => {

    beforeEach(() => {
        // Clear the history of all mocks before each test
        jest.clearAllMocks();
    });

    // Helper to generate mock documents
    const generateDocs = (count: number): GscFirestoreDoc[] => {
        return Array(count).fill({
            siteUrl: 'site',
            normalizedUrl: 'url',
            query: 'query',
            date: '2023-01-01',
            impressions: 1, clicks: 1, position: 1, ctr: 1,
            device: 'd', country: 'c', searchAppearance: 's',
            ingestedAt: {} as any, // Mock FieldValue
        });
    };

    test('should write a payload smaller than the batch size in a single batch', async () => {
        const documents = generateDocs(100);
        await writeToFirestoreInBatches(mockDb, 'test-collection', documents);

        expect(mockBatch).toHaveBeenCalledTimes(1);
        expect(mockCommit).toHaveBeenCalledTimes(1);
        expect(mockCollection).toHaveBeenCalledWith('test-collection');
        expect(mockDoc).toHaveBeenCalledTimes(100);
        expect(mockSet).toHaveBeenCalledTimes(100);
    });

    test('should split a large payload into multiple batches', async () => {
        // Implementation batch size is 500
        const documents = generateDocs(1200);
        await writeToFirestoreInBatches(mockDb, 'test-collection', documents);

        // 1200 docs should be split into 3 batches (500, 500, 200)
        expect(mockBatch).toHaveBeenCalledTimes(3);
        expect(mockCommit).toHaveBeenCalledTimes(3);
        expect(mockDoc).toHaveBeenCalledTimes(1200);
        expect(mockSet).toHaveBeenCalledTimes(1200);
    });

    test('should handle a payload that is an exact multiple of the batch size', async () => {
        // 2 batches of 500
        const documents = generateDocs(1000);
        await writeToFirestoreInBatches(mockDb, 'test-collection', documents);

        expect(mockBatch).toHaveBeenCalledTimes(2);
        expect(mockCommit).toHaveBeenCalledTimes(2);
        expect(mockDoc).toHaveBeenCalledTimes(1000);
    });

    test('should not perform any writes for an empty document array', async () => {
        const documents = generateDocs(0);
        await writeToFirestoreInBatches(mockDb, 'test-collection', documents);

        expect(mockBatch).not.toHaveBeenCalled();
        expect(mockCommit).not.toHaveBeenCalled();
        expect(mockCollection).not.toHaveBeenCalled();
    });

    test('should throw an error if a batch commit fails', async () => {
        const documents = generateDocs(10);
        const commitError = new Error('Firestore commit failed: permission denied.');

        // Make the first commit call fail
        mockCommit.mockRejectedValueOnce(commitError);

        // We expect the function to throw the same error it received
        await expect(writeToFirestoreInBatches(mockDb, 'test-collection', documents))
            .rejects.toThrow(commitError);

        // It should have still attempted to commit the first batch
        expect(mockBatch).toHaveBeenCalledTimes(1);
        expect(mockCommit).toHaveBeenCalledTimes(1);
        // No further batches should be attempted
    });
});

// Minimal export to satisfy the import in the test file.
// In a real scenario, you'd export your types from a central file.
export interface GscFirestoreDoc {
    siteUrl: string;
    normalizedUrl: string;
    query: string;
    date: string;
    impressions: number;
    clicks: number;
    position: number;
    ctr: number;
    device: string;
    country: string;
    searchAppearance: string;
    ingestedAt: any;
}
