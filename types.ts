
export interface Query {
  query: string;
  impressions: number;
}

export interface PageData {
  page_title: string;
  page_url: string;
  page_text_snippet: string;
  top_queries: Query[];
  competitor_titles: string[];
  primary_query: string;
}

export interface SeoSuggestion {
  title: string;
  meta_description: string;
  summary: string;
  h2_suggestions: string[];
  seo_checklist: string[];
  confidence: number;
}

export interface TrafficDeclineSummary {
  impressionsChange: number;
  clicksChange: number;
  ctrChange: number;
  preUpdatePeriod: { start: string; end: string };
  postUpdatePeriod: { start: string; end: string };
  declineType?: 'Widespread' | 'Isolated';
}

export interface AffectedPage {
  url: string;
  impressionLoss: number;
  clickLoss: number;
  ctrChange: number;
  causeCategory: 'Ranking Loss' | 'CTR Drop' | 'Seasonal Decline';
  priorityScore: number;
  root_cause_hypothesis?: string;
}

export interface VisualizationData {
    timeSeries: {
        date: string;
        period: 'before' | 'after';
        clicks: number;
        impressions: number;
    }[];
    clickLossByCategory: { category: string; loss: number }[];
    clickLossByDevice: { device: string; loss: number }[];
}

export interface TrafficDeclineDiagnosis {
  summary: TrafficDeclineSummary;
  affectedPages: AffectedPage[];
  visualizationData: VisualizationData;
}

export interface Editor {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  pageId: string;
  pageUrl: string;
  action: string;
  items: string[];
  assignee: string;
  assigneeName: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: number;
  createdAt: string;
}

export interface GscRawData {
    siteUrl: string;
    date: string;
    query: string;
    url: string;
    country: string;
    device: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    searchAppearance?: 'web_stories' | 'web' | 'discover' | 'google_news_showcase';
}

export interface TopicCluster {
    topic_name: string;
    matched_queries: string[];
    total_volume: number;
    trend_score: number;
    suggested_action: string;
}

export interface StoryPerformance {
    url: string;
    impressions: number;
    clicks: number;
    ctr: number;
    performance_vs_average: string;
}

export interface TopicSuggestion {
    suggested_title: string;
    reasoning: string;
}

export interface FormatGuideline {
    guideline: string;
    reasoning: string;
}

export interface StoriesAnalysis {
    top_performing_stories: StoryPerformance[];
    topic_plan: TopicSuggestion[];
    format_guidelines: FormatGuideline[];
}

export interface PatternReport {
    successful_topics: string[];
    headline_styles: string[];
    media_usage: string[];
}

export interface ContentIdea {
    suggested_headline: string;
    target_topic: string;
    justification: string;
}

export interface DiscoverNewsAnalysis {
    pattern_report: PatternReport;
    content_plan: ContentIdea[];
}

// Interfaces for AI Chat Module
export interface ChatVisualizationData {
    type: 'bar_chart';
    title: string;
    data: { label: string; value: number }[];
}

export interface ChatResponse {
    answer_text: string;
    data_source: string[];
    visualization_data?: ChatVisualizationData;
}

export type ChatMessageContent = string | ChatResponse;

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: ChatMessageContent;
}
