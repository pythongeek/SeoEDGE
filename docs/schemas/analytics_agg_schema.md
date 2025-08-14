# Analytics Aggregates Schema

This document outlines the JSON schema for the documents stored in the daily analytics collections located at `analytics_agg/daily_{YYYYMMDD}/results`.

The job produces two types of documents: `site_summary` and `page_summary`.

---

## 1. Site Summary (`site_summary`)

This document type provides a daily summary of performance metrics for a specific combination of `site`, `country`, and `device`.

**Document ID:** `site_{siteUrl}_{country}_{device}`

### Fields

| Field Name | Type | Description | Example |
|---|---|---|---|
| `type` | String | The type of the document. Always `"site_summary"`. | `"site_summary"` |
| `siteUrl` | String | The domain of the site being analyzed. | `"sc-domain:your-site.com"` |
| `country` | String | The three-letter country code (ISO 3166-1 alpha-3). | `"USA"` |
| `device` | String | The device category. | `"DESKTOP"` |
| `clicks` | Number | The total number of clicks for this combination. | `1520` |
| `impressions` | Number | The total number of impressions for this combination. | `45800` |

### Example JSON

```json
{
  "type": "site_summary",
  "siteUrl": "sc-domain:your-site.com",
  "country": "USA",
  "device": "DESKTOP",
  "clicks": 1520,
  "impressions": 45800
}
```

---

## 2. Page Summary (`page_summary`)

This document type provides a daily summary of performance metrics for a specific canonical URL.

**Document ID:** `page_{base64_hash_of_url}`

### Fields

| Field Name | Type | Description | Example |
|---|---|---|---|
| `type` | String | The type of the document. Always `"page_summary"`. | `"page_summary"` |
| `url` | String | The canonical URL of the page. | `"https://your-site.com/blog/my-post"` |
| `clicks` | Number | The total number of clicks for this page. | `85` |
| `impressions` | Number | The total number of impressions for this page. | `1250` |

### Example JSON

```json
{
  "type": "page_summary",
  "url": "https://your-site.com/blog/my-post",
  "clicks": 85,
  "impressions": 1250
}
```
