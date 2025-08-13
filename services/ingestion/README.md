# Data Ingestion Service

This module is responsible for fetching raw performance data from the Google Search Console (GSC) API and storing it in Firestore for further analysis.

## Components

-   `gsc-connector.ts`: The core service that connects to the GSC API, fetches data, and writes it to Firestore.
-   `url-normalizer.ts`: A utility module to clean and standardize URLs.
-   `../../api/ingestion/trigger.ts`: The API endpoint that initiates the ingestion process.

## Environment Variables

To use this service, you must configure the following environment variables in your Vercel project or `.env` file:

-   `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`: A base64-encoded string of your Google Service Account JSON key. This account needs access to the Google Search Console API and your Firebase project.
-   `FIREBASE_PROJECT_ID`: Your Firebase project ID (e.g., `my-seo-project-12345`).
-   `ADMIN_SHARED_SECRET`: A secret string used to protect the `trigger` endpoint. This should be a long, randomly generated secret.

## API Usage

To trigger the data ingestion process, make a `POST` request to the `/api/ingestion/trigger` endpoint.

### Request

-   **Method:** `POST`
-   **Headers:**
    -   `Content-Type: application/json`
    -   `x-admin-secret`: Your configured shared secret.
-   **Body:**

    ```json
    {
      "siteUrl": "sc-domain:your-site.com",
      "startDate": "2023-01-01",
      "endDate": "2023-01-31"
    }
    ```

### Success Response

-   **Status:** `200 OK`
-   **Body:**

    ```json
    {
      "message": "Ingestion job started successfully.",
      "jobId": "ingest-sc-domain:your-site.com-1675104000000"
    }
    ```

The ingestion process runs in the background. You can monitor your Vercel function logs and Firestore `gsc_raw` collection to see the progress.
