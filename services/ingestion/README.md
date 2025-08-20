# GSC (Google Search Console) Ingestion Service

This service is a Node.js/TypeScript module responsible for fetching daily performance data from the Google Search Console API, normalizing it, and loading it into a Firestore collection.

## Features

- Fetches data for a specified site property and date range.
- Handles GSC API pagination automatically to retrieve complete datasets.
- Implements a robust exponential backoff retry mechanism to handle transient API errors.
- Normalizes page URLs to ensure data consistency (lowercase, removes UTM parameters, handles trailing slashes).
- Writes data to Firestore efficiently using batched writes to stay within API limits.
- Includes detailed logging for monitoring and debugging.

## Configuration

To run this service, you must configure the following environment variable:

### `FIREBASE_ADMIN_SDK_JSON_BASE64`

This variable must contain the **Base64-encoded** string of your Google Cloud service account JSON key. The service account must have the following permissions:

1.  **Google Search Console API**: At least "Viewer" access to the GSC property you want to query.
2.  **Firestore**: "Cloud Datastore User" role or equivalent permissions to write to your database.

#### How to Generate the Base64 String

On macOS or Linux, you can generate the required string from your `service-account-key.json` file with this command:

```bash
cat /path/to/your/service-account-key.json | base64
```
On Windows, you can use PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("/path/to/your/service-account-key.json"))
```

## How to Use

The primary entry point for the service is the `ingestGSCData` function, which orchestrates the entire ETL process.

### Example

```typescript
import { ingestGSCData } from './gsc';

// --- Example Usage ---

const siteUrl = 'sc-domain:your-site.com'; // The GSC property to query
const startDate = '2023-10-01';             // Start date in YYYY-MM-DD format
const endDate = '2023-10-31';               // End date in YYYY-MM-DD format

ingestGSCData(siteUrl, startDate, endDate)
    .then(result => {
        if (result.success) {
            console.log(`Ingestion process finished successfully. Total rows written: ${result.totalRowsWritten}`);
        } else {
            console.log('Ingestion process finished with errors.');
        }
    })
    .catch(error => {
        console.error('A fatal error occurred during the ingestion process:', error);
    });
```

## Firestore Collection Details

The service writes all data into a single primary collection.

-   **Collection Path**: `ingestion/gsc/daily`

### Document Schema

Each document within the collection represents a unique combination of dimensions for a single day and has the following structure:

| Field             | Type      | Description                                                 |
| ----------------- | --------- | ----------------------------------------------------------- |
| `siteUrl`         | `string`  | The GSC property being queried (e.g., 'sc-domain:example.com'). |
| `normalizedUrl`   | `string`  | The canonical, normalized page URL.                         |
| `query`           | `string`  | The search query.                                           |
| `date`            | `string`  | The date of the metrics (Format: YYYY-MM-DD).               |
| `impressions`     | `number`  | Total impressions for the row's dimensions.                 |
| `clicks`          | `number`  | Total clicks for the row's dimensions.                      |
| `position`        | `number`  | Average ranking position.                                   |
| `ctr`             | `number`  | Click-through rate (clicks / impressions).                  |
| `device`          | `string`  | Device category (e.g., 'MOBILE', 'DESKTOP', 'TABLET').      |
| `country`         | `string`  | Three-letter country code (e.g., 'USA', 'GBR').             |
| `searchAppearance`| `string`  | The search appearance type (e.g., 'WEB_STORIES', 'NONE').   |
| `ingestedAt`      | `Timestamp`| The Firestore server timestamp of when the document was created.|
