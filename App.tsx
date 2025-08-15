
import React, { useState, useCallback } from 'react';
import { SeoAiCompanion } from './components/SeoAiCompanion';
import { TrafficDeclineDiagnosis } from './components/TrafficDeclineDiagnosis';
import { RegexTopicGenerator } from './components/RegexTopicGenerator';
import { GoogleStoriesAnalyzer } from './components/GoogleStoriesAnalyzer';
import { DiscoverNewsAnalyzer } from './components/DiscoverNewsAnalyzer';
import { AiChat } from './components/AiChat';
import { Header } from './components/Header';
import { getSeoSuggestions, getWorkflowSuggestions, generateTopicsFromRegex, analyzeStoriesEffectiveness, analyzeDiscoverNewsPerformance, getChatResponse } from './services/geminiService';
import { fetchPageData, fetchTrafficDeclineDiagnosis, mockEditors, mockGscRawData } from './services/mockDataService';
import type { SeoSuggestion, PageData, TrafficDeclineDiagnosis as DiagnosisData, Task, TopicCluster, StoriesAnalysis, DiscoverNewsAnalysis, ChatMessage } from './types';
import { db } from './services/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { LightBulbIcon } from './components/icons/LightBulbIcon';
import { ArrowTrendingDownIcon } from './components/icons/ArrowTrendingDownIcon';
import { CodeBracketSquareIcon } from './components/icons/CodeBracketSquareIcon';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { NewspaperIcon } from './components/icons/NewspaperIcon';
import { ChatBubbleLeftRightIcon } from './components/icons/ChatBubbleLeftRightIcon';


type ActiveTab = 'chat' | 'companion' | 'diagnosis' | 'regex' | 'stories' | 'discover';

const App: React.FC = () => {
  // State for SEO Companion
  const [isCompanionLoading, setIsCompanionLoading] = useState<boolean>(false);
  const [companionError, setCompanionError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SeoSuggestion | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');

  // State for Traffic Diagnosis
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState<boolean>(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  
  // State for Workflow Planner
  const [isWorkflowLoading, setIsWorkflowLoading] = useState<boolean>(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [createdTasks, setCreatedTasks] = useState<Task[] | null>(null);

  // State for Regex Topic Generator
  const [isRegexProcessing, setIsRegexProcessing] = useState<boolean>(false);
  const [regexProcessingError, setRegexProcessingError] = useState<string | null>(null);
  const [topicClusters, setTopicClusters] = useState<TopicCluster[] | null>(null);

  // State for Google Stories Analyzer
  const [isStoriesLoading, setIsStoriesLoading] = useState<boolean>(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [storiesAnalysis, setStoriesAnalysis] = useState<StoriesAnalysis | null>(null);

  // State for Discover & News Analyzer
  const [isDiscoverLoading, setIsDiscoverLoading] = useState<boolean>(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverAnalysis, setDiscoverAnalysis] = useState<DiscoverNewsAnalysis | null>(null);

  // State for AI Chat
  const [isChatResponding, setIsChatResponding] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: {
        answer_text: "Hello! I'm your AI SEO Companion. I have access to all the analysis modules. How can I help you today? You can ask things like 'What are my top 5 pages with the biggest impression loss?' or 'Suggest a new topic based on my regex analysis.'",
        data_source: ['AI Companion System'],
      }
    }
  ]);

  // App-level state
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');


  const handleAnalysis = useCallback(async (url: string) => {
    if (!url) {
      setCompanionError('Please enter a valid URL.');
      return;
    }
    setIsCompanionLoading(true);
    setCompanionError(null);
    setSuggestions(null);
    setPageUrl(url);

    try {
      const pageData: PageData = fetchPageData(url);
      const result = await getSeoSuggestions(pageData);
      setSuggestions(result);
    } catch (err) {
      console.error(err);
      setCompanionError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsCompanionLoading(false);
    }
  }, []);

  const handleDiagnosis = useCallback(async (coreUpdateDate: string, comparisonWindow: number) => {
    setIsDiagnosisLoading(true);
    setDiagnosisError(null);
    setDiagnosis(null);
    setCreatedTasks(null);
    setWorkflowError(null);

    try {
      // 1. Trigger the backend diagnosis job
      const response = await fetch('/api/diagnosis/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The secret should be stored in a Vite env var
          'x-admin-secret': import.meta.env.VITE_ADMIN_SHARED_SECRET || '',
        },
        body: JSON.stringify({ coreUpdateDate, comparisonWindow }),
      });

      if (response.status !== 202) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start diagnosis job.');
      }

      // 2. Listen for the results in real-time from Firestore
      const diagnosisId = `diag_${coreUpdateDate}_${comparisonWindow}`;
      const docRef = doc(db, "traffic_diagnostics", diagnosisId);

      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          console.log("Diagnosis data received from Firestore:", docSnap.data());
          setDiagnosis(docSnap.data() as DiagnosisData);
          setIsDiagnosisLoading(false);
          unsubscribe(); // Stop listening once we have the data
        } else {
          console.log("Waiting for diagnosis results...");
        }
      }, (error) => {
        console.error("Error listening for diagnosis results:", error);
        setDiagnosisError("Failed to fetch diagnosis results from the database.");
        setIsDiagnosisLoading(false);
        unsubscribe();
      });

      // Set a timeout in case the results never arrive
      setTimeout(() => {
        unsubscribe();
        if (isDiagnosisLoading) {
            setIsDiagnosisLoading(false);
            setDiagnosisError("Diagnosis timed out. The process may be taking longer than expected on the server. Please check the database later.");
        }
      }, 90000); // 90-second timeout

    } catch (err) {
      console.error(err);
      setDiagnosisError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsDiagnosisLoading(false);
    }
  }, [isDiagnosisLoading]); // isDiagnosisLoading dependency to prevent race conditions on timeout

  const handleCreateWorkflow = useCallback(async (diagnosisData: DiagnosisData) => {
    setIsWorkflowLoading(true);
    setWorkflowError(null);
    setCreatedTasks(null);

    try {
      const tasks = await getWorkflowSuggestions(diagnosisData, mockEditors);
      setCreatedTasks(tasks);
    } catch (err) {
       console.error(err);
       setWorkflowError(err instanceof Error ? err.message : 'An unknown error occurred during workflow creation.');
    } finally {
        setIsWorkflowLoading(false);
    }
  }, []);
  
  const handleRegexAnalysis = useCallback(async (file: File) => {
    setIsRegexProcessing(true);
    setRegexProcessingError(null);
    setTopicClusters(null);

    try {
        const fileContent = await file.text();
        const regexPatterns = fileContent.split('\n').filter(p => p.trim() !== '');

        if (regexPatterns.length === 0) throw new Error("The uploaded file is empty or contains no valid regex patterns.");

        const matchedQueries = mockGscRawData.filter(row => regexPatterns.some(pattern => {
          try { return new RegExp(pattern, 'i').test(row.query); }
          catch (e) { console.warn(`Invalid regex: ${pattern}`); return false; }
        }));

        if (matchedQueries.length === 0) { setTopicClusters([]); return; }

        const clusters = await generateTopicsFromRegex(matchedQueries);
        setTopicClusters(clusters);
        
    } catch (err) {
        console.error(err);
        setRegexProcessingError(err instanceof Error ? err.message : 'An unknown error occurred during regex processing.');
    } finally {
        setIsRegexProcessing(false);
    }
  }, []);

  const handleAnalyzeStories = useCallback(async () => {
    setIsStoriesLoading(true);
    setStoriesError(null);
    setStoriesAnalysis(null);

    try {
        const storiesData = mockGscRawData.filter(row => row.searchAppearance === 'web_stories' || row.url?.includes('/stories/'));
        if (storiesData.length === 0) throw new Error("No Google Stories data found to analyze.");

        const totalImpressions = mockGscRawData.reduce((sum, row) => sum + row.impressions, 0);
        const totalClicks = mockGscRawData.reduce((sum, row) => sum + (row.clicks ?? 0), 0);
        const siteAvgCtr = totalClicks / totalImpressions;

        const analysis = await analyzeStoriesEffectiveness(storiesData, siteAvgCtr);
        setStoriesAnalysis(analysis);

    } catch (err) {
        console.error(err);
        setStoriesError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsStoriesLoading(false);
    }
  }, []);

  const handleAnalyzeDiscover = useCallback(async () => {
    setIsDiscoverLoading(true);
    setDiscoverError(null);
    setDiscoverAnalysis(null);
    
    try {
        const discoverData = mockGscRawData.filter(row => row.searchAppearance === 'discover' || row.searchAppearance === 'google_news_showcase');
        if (discoverData.length === 0) throw new Error("No Google Discover or News data found to analyze.");
        
        const analysis = await analyzeDiscoverNewsPerformance(discoverData);
        setDiscoverAnalysis(analysis);

    } catch (err) {
        console.error(err);
        setDiscoverError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsDiscoverLoading(false);
    }
  }, []);

  const handleSendMessage = useCallback(async (query: string) => {
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsChatResponding(true);

    try {
      const fullContext = {
        traffic_decline_diagnosis: diagnosis,
        workflow_plan: createdTasks,
        regex_topic_clusters: topicClusters,
        google_stories_analysis: storiesAnalysis,
        discover_news_analysis: discoverAnalysis,
      };

      const responseContent = await getChatResponse(query, fullContext);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: {
          answer_text: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          data_source: ['Error Handler'],
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatResponding(false);
    }
  }, [diagnosis, createdTasks, topicClusters, storiesAnalysis, discoverAnalysis]);


  const TabButton: React.FC<{ tabId: ActiveTab; children: React.ReactNode; }> = ({ tabId, children }) => {
    const isActive = activeTab === tabId;
    return (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {children}
        </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 p-1 bg-gray-800 rounded-lg flex flex-wrap items-center justify-start gap-1" role="tablist" aria-label="Feature tabs">
             <TabButton tabId="chat">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                AI Chat
             </TabButton>
             <TabButton tabId="diagnosis">
                <ArrowTrendingDownIcon className="w-5 h-5" />
                Traffic Diagnosis
             </TabButton>
              <TabButton tabId="regex">
                <CodeBracketSquareIcon className="w-5 h-5" />
                Regex Topics
             </TabButton>
             <TabButton tabId="stories">
                <BookOpenIcon className="w-5 h-5" />
                Google Stories
             </TabButton>
             <TabButton tabId="discover">
                <NewspaperIcon className="w-5 h-5" />
                Discover & News
             </TabButton>
             <TabButton tabId="companion">
                <LightBulbIcon className="w-5 h-5" />
                SEO Companion
             </TabButton>
          </div>

          <div role="tabpanel" hidden={activeTab !== 'chat'}>
              <AiChat
                messages={messages}
                isResponding={isChatResponding}
                onSendMessage={handleSendMessage}
              />
          </div>
          
          <div role="tabpanel" hidden={activeTab !== 'companion'}>
            <SeoAiCompanion 
              isLoading={isCompanionLoading}
              error={companionError}
              suggestions={suggestions}
              onAnalyze={handleAnalysis}
              pageUrl={pageUrl}
            />
          </div>

          <div role="tabpanel" hidden={activeTab !== 'diagnosis'}>
            <TrafficDeclineDiagnosis
                isLoading={isDiagnosisLoading}
                error={diagnosisError}
                diagnosis={diagnosis}
                onDiagnose={handleDiagnosis}
                isWorkflowLoading={isWorkflowLoading}
                workflowError={workflowError}
                createdTasks={createdTasks}
                onCreateWorkflow={handleCreateWorkflow}
            />
          </div>

          <div role="tabpanel" hidden={activeTab !== 'regex'}>
            <RegexTopicGenerator
                isLoading={isRegexProcessing}
                error={regexProcessingError}
                topicClusters={topicClusters}
                onAnalyze={handleRegexAnalysis}
            />
          </div>

          <div role="tabpanel" hidden={activeTab !== 'stories'}>
            <GoogleStoriesAnalyzer
                isLoading={isStoriesLoading}
                error={storiesError}
                analysis={storiesAnalysis}
                onAnalyze={handleAnalyzeStories}
            />
          </div>
          
          <div role="tabpanel" hidden={activeTab !== 'discover'}>
            <DiscoverNewsAnalyzer
                isLoading={isDiscoverLoading}
                error={discoverError}
                analysis={discoverAnalysis}
                onAnalyze={handleAnalyzeDiscover}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
