```markdown
# Master Specification - Organic Traffic Recovery & AI Companion Platform

[cite_start]This document serves as the single source of truth for the Organic Traffic Recovery & AI Companion Platform. [cite: 1]

## Project Goal

[cite_start]To diagnose and recover organic traffic after a Google core update by providing editors and strategists with AI-driven, data-backed workflows to fix, refresh, and create content that resonates with US audiences. [cite: 4] [cite_start]The development philosophy is to ship fast, iterate, and scale. [cite: 5]

## 1. High-Level Objectives

1.  [cite_start]**Traffic Recovery:** Identify the precise reasons for organic traffic decline using Google Search Console (GSC), Google Analytics (GA), and uploaded regex-based search term datasets. [cite: 7]
2.  [cite_start]**Editorial Workflow:** Provide editors with prioritized and measurable tasks for content improvement. [cite: 8]
3.  [cite_start]**AI Companion:** Deliver actionable and auditable recommendations without hallucinations. [cite: 9]
4.  [cite_start]**Regex Keyword Insights:** Analyze uploaded regex keyword lists from GSC and merge them with analytics data to generate topic and content suggestions. [cite: 10]
5.  [cite_start]**Google Stories Analysis:** Evaluate story performance to create content and topic plans for improved engagement. [cite: 11]
6.  [cite_start]**Google Discover & News Optimization:** Pinpoint content types that perform well in Discover and News and produce editorial plans to target them. [cite: 12]

## 2. Core Features & Modules

### 2.1 Data Ingestion

* **GSC Data Upload:**
    * [cite_start]Accepts CSV/XLSX file uploads. [cite: 16]
    * [cite_start]Automatically parses clicks, impressions, CTR, position, queries, and pages. [cite: 17]
* **GA Data Upload:**
    * [cite_start]Accepts CSV/XLSX file uploads. [cite: 19]
    * [cite_start]Parses sessions, bounce rate, engagement metrics, and conversions. [cite: 20]
* **Regex Keyword Upload:**
    * [cite_start]Supports .txt/.csv files with regex patterns. [cite: 22]
    * [cite_start]Matches queries within the GSC dataset for segmentation. [cite: 23]
* **Automated API Sync (Phase 2):**
    * [cite_start]Integration with GSC and GA4 APIs. [cite: 25, 26]
    * [cite_start]Scheduled for daily synchronization. [cite: 27]

### 2.2 AI Companion

* **Context-Aware Analysis:**
    * [cite_start]Utilizes all uploaded and synced datasets. [cite: 30]
    * [cite_start]Outputs include causes for traffic drops, a priority list of content to update, and content gap opportunities. [cite: 32, 33, 34]
* **Hallucination Control:**
    * [cite_start]Recommendations are based only on the provided data. [cite: 36]
    * [cite_start]Displays references to the data sources. [cite: 37]
* **Actionable Outputs:**
    * [cite_start]Generates a "Fix This Now" list. [cite: 39]
    * [cite_start]Suggests headlines, meta descriptions, and related keyword clusters. [cite: 40, 41]

### 2.3 Editorial Workflow Dashboard

* **Content Prioritization:**
    * [cite_start]Sorts content by the highest potential for traffic gain. [cite: 44]
    * [cite_start]Includes filters for topic, category, last updated date, CTR, and position. [cite: 45]
* **Task Tracking:**
    * [cite_start]Allows for assigning tasks to editors. [cite: 47]
    * [cite_start]Tracks task completion and the impact after a re-crawl. [cite: 48]
* **Performance Feedback:**
    * [cite_start]Provides before and after metrics. [cite: 50]

### 2.4 Regex Search Term Module

* **Regex Matching Engine:**
    * [cite_start]Finds matching queries from the uploaded GSC data. [cite: 53]
    * [cite_start]Outputs grouped topics and search intents. [cite: 54]
* **Content Suggestions:**
    * [cite_start]The AI generates new topics based on matched queries and traffic trends. [cite: 56]
* **Trend Alerts:**
    * [cite_start]Identifies rising queries in the matched segments. [cite: 58]

### 2.5 Google Stories Optimization Module

* [cite_start]**Performance Breakdown:** Analyzes story views, CTR, and engagement time. [cite: 61]
* [cite_start]**Topic Insights:** Determines which local USA culture stories perform best. [cite: 63]
* [cite_start]**Story Plan Generator:** The AI suggests titles, image concepts, and posting schedules. [cite: 65]

### 2.6 Google Discover & News Audit Module

* [cite_start]**Content Type Analysis:** Identifies which content formats are successful in Discover and News. [cite: 68]
* [cite_start]**Historical Performance:** Reviews engagement metrics from GA and GSC Discover data. [cite: 70]
* [cite_start]**Editorial Guidance:** Provides content frameworks and suggestions for posting frequency and timing. [cite: 72, 73]

## 3. Technical Architecture

### 3.1 Stack

* [cite_start]**Frontend:** Next.js (React) [cite: 76]
* [cite_start]**Backend:** Node.js (API routes within Next.js) [cite: 77]
* [cite_start]**Database:** Firebase Firestore [cite: 78]
* [cite_start]**File Storage:** Firebase Storage [cite: 79]
* [cite_start]**Authentication:** Firebase Auth (Google OAuth, Email/Password) [cite: 80]
* [cite_start]**AI Processing:** OpenAI API (GPT-4o/GPT-5) [cite: 81]
* [cite_start]**Data Parsing:** Papaparse / SheetJS [cite: 82]
* [cite_start]**Charts & Visualization:** Recharts or Chart.js [cite: 83]

### 3.2 Key Flows

1.  [cite_start]**Upload Data:** Parse data and store it in Firestore. [cite: 85, 86]
2.  [cite_start]**Run Analysis:** The AI Companion uses context from the data in Firestore. [cite: 87, 88]
3.  [cite_start]**Display Insights:** Showcase information through interactive dashboards. [cite: 89]
4.  [cite_start]**Create Tasks:** Assign tasks to editors. [cite: 90]
5.  [cite_start]**Measure Impact:** Pull updated metrics after a re-crawl. [cite: 91]

## 4. Phase 1 Deliverables

* [cite_start]GSC/GA/Regex file upload and parsing functionality. [cite: 93]
* An MVP of the AI Companion featuring:
    * [cite_start]Traffic drop cause analysis. [cite: 95]
    * [cite_start]A priority content list. [cite: 96]
    * [cite_start]Basic topic suggestions. [cite: 97]
* [cite_start]An editorial dashboard. [cite: 98]
* [cite_start]An MVP for Stories and Discover analysis. [cite: 99]

## 5. Phase 2 Roadmap

* [cite_start]API-based automated data synchronization. [cite: 101]
* [cite_start]More detailed Discover and News optimization. [cite: 102]
* [cite_start]Real-time trend alerts. [cite: 103]
* [cite_start]Tools for team collaboration. [cite: 104]
* [cite_start]Export functionality to Google Sheets. [cite: 105]

## 6. Non-Functional Requirements

* [cite_start]**Speed:** Core workflows must load in under 2 seconds. [cite: 107]
* [cite_start]**Data Security:** Data will be stored securely in Firebase. [cite: 108]
* [cite_start]**Accuracy:** No fabricated data; all insights must cite the dataset source. [cite: 109]
* [cite_start]**Scalability:** The system must handle datasets with up to 100,000 rows. [cite: 110]

## 7. Deployment

* [cite_start]**Code Repository:** GitHub [cite: 112]
* [cite_start]**Deployment Platform:** Vercel [cite: 113]
* [cite_start]**Backend Services:** A Firebase project will be connected for the database, authentication, and storage. [cite: 114]

## 8. Initial AI Prompting Rules

When prompting the AI for coding assistance:
1.  [cite_start]Provide one module at a time. [cite: 117]
2.  [cite_start]Include a sample dataset in the prompt to prevent misinterpretation. [cite: 118]
3.  [cite_start]Reference this Master Spec so the AI follows the defined scope. [cite: 119]
4.  [cite_start]Review the output for any missing features before merging. [cite: 120]
5.  [cite_start]Keep the UI minimal and functional in Phase 1. [cite: 121]
```