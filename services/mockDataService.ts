
import type { PageData, TrafficDeclineDiagnosis, AffectedPage, Editor, GscRawData } from '../types';

export const fetchPageData = (url: string): PageData => {
  // This is a mock function. In a real application, you would scrape the URL
  // and fetch actual data from GSC/GA APIs.
  // The returned data is always the same for this demo.
  console.log(`Fetching mock data for URL: ${url}`);
  
  return {
    page_title: 'How to Bake the Perfect Sourdough Bread',
    page_url: url,
    page_text_snippet: 'Baking sourdough can be a rewarding experience. This guide covers everything from creating your starter to the final bake. We will explore techniques like stretch and fold, bulk fermentation, and scoring to help you achieve a crispy crust and open crumb. Our method focuses on simple steps for beginners, ensuring your first loaf is a success. We also cover common issues like a flat loaf or a dense crumb.',
    top_queries: [
      { query: 'sourdough bread recipe', impressions: 15000 },
      { query: 'how to make sourdough starter', impressions: 12000 },
      { query: 'easy sourdough recipe for beginners', impressions: 9000 },
      { query: 'sourdough baking tips', impressions: 5500 },
    ],
    primary_query: "sourdough bread recipe",
    competitor_titles: [
      'The Ultimate Sourdough Bread Recipe - King Arthur Baking',
      'Perfect Sourdough Bread - The Clever Carrot',
      'No-Knead Sourdough Bread Recipe - Feasting at Home',
      'My Best Sourdough Recipe - The Perfect Loaf'
    ]
  };
};


export const fetchTrafficDeclineDiagnosis = (
  coreUpdateDate: string,
  comparisonWindow: number
): TrafficDeclineDiagnosis => {
  // Mock function to simulate a backend that analyzes GSC/GA data
  console.log(`Fetching mock traffic decline diagnosis for update on ${coreUpdateDate} with a ${comparisonWindow}-day window.`);

  const preEndDate = new Date(coreUpdateDate);
  preEndDate.setDate(preEndDate.getDate() - 1);
  const preStartDate = new Date(preEndDate);
  preStartDate.setDate(preStartDate.getDate() - (comparisonWindow - 1));

  const postStartDate = new Date(coreUpdateDate);
  const postEndDate = new Date(postStartDate);
  postEndDate.setDate(postEndDate.getDate() + (comparisonWindow - 1));

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const pages: AffectedPage[] = [
    {
      url: '/blog/advanced-sourdough-techniques',
      impressionLoss: 12000,
      clickLoss: 800,
      ctrChange: -0.25,
      causeCategory: 'Ranking Loss',
      priorityScore: 9.5,
    },
    {
      url: '/recipes/sourdough-pizza-crust',
      impressionLoss: 5000,
      clickLoss: 650,
      ctrChange: -0.55,
      causeCategory: 'CTR Drop',
      priorityScore: 8.8,
    },
    {
      url: '/sourdough-starter-guide',
      impressionLoss: 2500,
      clickLoss: 150,
      ctrChange: -0.10,
      causeCategory: 'Ranking Loss',
      priorityScore: 7.2,
    },
     {
      url: '/products/banneton-basket',
      impressionLoss: 800,
      clickLoss: 120,
      ctrChange: -0.05,
      causeCategory: 'Seasonal Decline',
      priorityScore: 5.0,
    },
     {
      url: '/about-us',
      impressionLoss: 100,
      clickLoss: 5,
      ctrChange: 0.02,
      causeCategory: 'Ranking Loss',
      priorityScore: 2.1,
    },
  ];

  return {
    summary: {
      impressionsChange: -0.35, // -35%
      clicksChange: -0.42, // -42%
      ctrChange: -0.10, // -10% relative change
      preUpdatePeriod: { start: formatDate(preStartDate), end: formatDate(preEndDate) },
      postUpdatePeriod: { start: formatDate(postStartDate), end: formatDate(postEndDate) },
    },
    affectedPages: pages.sort((a, b) => b.priorityScore - a.priorityScore),
  };
};

export const mockEditors: Editor[] = [
    { id: 'user_clara_uid', name: 'Clara' },
    { id: 'user_david_uid', name: 'David' },
    { id: 'user_emily_uid', name: 'Emily' },
];

export const mockGscRawData: GscRawData[] = [
    // Standard Web
    { url: '/blog/sourdough-basics', query: 'how to make sourdough starter from scratch', impressions: 8500, clicks: 400, ctr: 0.047, searchAppearance: 'web' },
    { url: '/blog/sourdough-flour-types', query: 'what is the best flour for sourdough', impressions: 6200, clicks: 350, ctr: 0.056, searchAppearance: 'web' },
    { url: '/blog/troubleshooting-starter', query: 'why is my sourdough starter not bubbling', impressions: 4100, clicks: 250, ctr: 0.061, searchAppearance: 'web' },
    { url: '/blog/feeding-schedule', query: 'sourdough starter feeding schedule', impressions: 3800, clicks: 200, ctr: 0.053, searchAppearance: 'web' },
    { url: '/blog/common-bread-problems', query: 'common sourdough bread problems', impressions: 3500, clicks: 180, ctr: 0.051, searchAppearance: 'web' },
    { url: '/blog/troubleshooting-flat-loaf', query: 'troubleshooting flat sourdough bread', impressions: 3300, clicks: 190, ctr: 0.058, searchAppearance: 'web' },
    
    // Google Stories
    { url: '/stories/how-to-shape-a-boule', query: 'how to get an open crumb in sourdough', impressions: 9800, clicks: 950, ctr: 0.097, searchAppearance: 'web_stories' },
    { url: '/stories/quick-sourdough-tips', query: 'is sourdough bread healthy', impressions: 11500, clicks: 1200, ctr: 0.104, searchAppearance: 'web_stories' },
    { url: '/stories/discard-cracker-recipe', query: 'easy sourdough discard crackers recipe', impressions: 7500, clicks: 800, ctr: 0.107, searchAppearance: 'web_stories' },

    // Discover & News
    { url: '/news/baking-championship-winner-announced', query: 'national baking championship 2024 winner', impressions: 25000, clicks: 1800, ctr: 0.072, searchAppearance: 'google_news_showcase' },
    { url: '/discover/surprising-uses-for-stale-bread', query: 'uses for stale bread', impressions: 32000, clicks: 2500, ctr: 0.078, searchAppearance: 'discover' },
    { url: '/discover/is-your-kitchen-hiding-this-superfood', query: 'sourdough gut health', impressions: 45000, clicks: 3500, ctr: 0.077, searchAppearance: 'discover' },
    { url: '/news/new-study-links-whole-grains-to-longevity', query: 'whole grain study', impressions: 18000, clicks: 1200, ctr: 0.067, searchAppearance: 'google_news_showcase' },
    { url: '/discover/5-common-baking-myths-debunked', query: 'baking myths', impressions: 28000, clicks: 2100, ctr: 0.075, searchAppearance: 'discover' },

    // More standard web
    { url: '/blog/fermentation-temps', query: 'best temperature for sourdough fermentation', impressions: 2500, clicks: 130, ctr: 0.052, searchAppearance: 'web' },
    { url: '/blog/sourdough-vs-yeast', query: 'sourdough vs commercial yeast', impressions: 2200, clicks: 110, ctr: 0.05, searchAppearance: 'web' },
    { url: '/recipes/sourdough-discard-ideas', query: 'sourdough discard recipes', impressions: 5100, clicks: 300, ctr: 0.059, searchAppearance: 'web' },
    { url: '/recipes/what-to-do-with-discard', query: 'what to do with sourdough discard', impressions: 4800, clicks: 280, ctr: 0.058, searchAppearance: 'web' },
    { url: '/blog/nutrition-comparison', query: 'sourdough vs white bread nutrition', impressions: 1200, clicks: 60, ctr: 0.05, searchAppearance: 'web' },
    { url: '/blog/sourdough-vs-whole-wheat', query: 'compare sourdough and whole wheat bread', impressions: 950, clicks: 50, ctr: 0.053, searchAppearance: 'web' },
    { url: '/reviews/best-dutch-ovens', query: 'best dutch oven for sourdough', impressions: 7000, clicks: 400, ctr: 0.057, searchAppearance: 'web' },
    { url: '/reviews/dutch-oven-alternatives', query: 'what is a good alternative to a dutch oven for bread', impressions: 1500, clicks: 80, ctr: 0.053, searchAppearance: 'web' },
    { url: '/reviews/best-baking-stones', query: 'best baking stone for pizza', impressions: 3200, clicks: 170, ctr: 0.053, searchAppearance: 'web' },
];
