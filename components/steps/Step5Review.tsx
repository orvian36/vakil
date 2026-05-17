"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Users, Calendar, List, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import PreActionLetterTab from '@/components/tabs/PreActionLetterTab';
import StatementOfClaimTab from '@/components/tabs/StatementOfClaimTab';
import WitnessStatementTab from '@/components/tabs/WitnessStatementTab';
import StatementOfDamagesTab from '@/components/tabs/StatementOfDamagesTab';
import WritOfSummonsTab from '@/components/tabs/WritOfSummonsTab';
import { Case } from "@/types/case";
import { TabsConfig } from "@/types/tabs";
import tabsConfig from '@/config/tabs.json';

const config = tabsConfig as TabsConfig;

interface Step5ReviewProps {
  caseId: string;
  caseData: Case;
  action?: string | null;
  generatedContent?: string | null;
  onGenerateContent?: (action: string) => void;
}

interface GeneratedContent {
  writOfSummons?: string;
  witnessStatement?: string;
  witnessStatementBengali?: string;
  statementOfClaim?: string;
  statementOfDamages?: string;
  preActionLetter?: string;
}

interface AgentStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

interface ServerEvent {
  type: string;
  message: string;
  timestamp: number;
  agentName?: string;
  progress?: {
    current: number;
    total: number;
  };
  outputVariable?: string;
}

export default function Step5Review({ 
  caseId, 
  caseData,
  action, 
  generatedContent: propGeneratedContent, 
  onGenerateContent, 
}: Step5ReviewProps) {
  const [activeTab, setActiveTab] = useState(config.defaultTab);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [serverEvents, setServerEvents] = useState<ServerEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const hasInitiatedGeneration = useRef(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setError(null);
  };

  const handleRetryGeneration = () => {
    setShowErrorModal(false);
    setError(null);
    hasInitiatedGeneration.current = false;
    generateContent();
  };

  // Load content from localStorage on mount and decide whether to generate
  useEffect(() => {
    const loadCachedContent = () => {
      const cacheKey = `orchestration_content_${caseId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setGeneratedContent(parsed);
          console.log('Loaded cached content:', parsed);
          return true; // Content found in cache
        } catch (error) {
          console.error('Error parsing cached content:', error);
          return false;
        }
      }
      return false; // No content in cache
    };

    // Reset generation flag when caseId changes
    hasInitiatedGeneration.current = false;
    
    // Load cached content first
    const hasCachedContent = loadCachedContent();
    
    // Only generate if no cached content and not already generating
    if (!hasCachedContent && !isGenerating && !hasInitiatedGeneration.current) {
      hasInitiatedGeneration.current = true;
      generateContent();
    }
  }, [caseId]);

  // Generate content using orchestration API
  const generateContent = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setAgentStatuses([]);
    setServerEvents([]);

    try {
      // Verify token balance first
      const verifyTokenResponse = await fetch('/api/tokens/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estimateTokens: 1 })
      });
      const result = await verifyTokenResponse.json();  
      console.log("verifyTokenResponse", result);
      if (!result.is_enough_balance) {
        setShowInsufficientBalanceModal(true);
        return;
      }

      const response = await fetch('/api/orchestration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamData(data);
            } catch (error) {
              console.error('Error parsing stream data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsGenerating(false);
    }
  }, [caseId]);

  const handleStreamData = (data: any) => {
    // Add event to server events list
    const event: ServerEvent = {
      type: data.type,
      message: data.message || '',
      timestamp: Date.now(),
      agentName: data.agentName,
      progress: data.progress,
      outputVariable: data.outputVariable
    };
    
    setServerEvents(prev => [...prev, event]);

    switch (data.type) {
      case 'start':
        console.log('Orchestration started');
        break;
      
      case 'agent_registered':
        setAgentStatuses(prev => [...prev, {
          name: data.agentName,
          status: 'pending',
          message: data.message
        }]);
        break;
      
      case 'agent_started':
        setAgentStatuses(prev => prev.map(agent => 
          agent.name === data.agentName 
            ? { ...agent, status: 'running', message: data.message }
            : agent
        ));
        break;
      
      case 'agent_completed':
        setAgentStatuses(prev => prev.map(agent => 
          agent.name === data.agentName 
            ? { ...agent, status: 'completed', message: data.message }
            : agent
        ));
        break;
      
      case 'agent_error':
        setAgentStatuses(prev => prev.map(agent => 
          agent.name === data.agentName 
            ? { ...agent, status: 'error', message: data.message }
            : agent
        ));
        break;
      
      case 'complete':
        // Extract the 5 document types from the final result
        if (data.result) {
          const newContent: GeneratedContent = {
            writOfSummons: data.result.writ_of_summons || '',
            witnessStatement: data.result.witness_statement || '',
            witnessStatementBengali: data.result.witness_statement_bengali || data.result.witnessStatementBengali || '',
            statementOfClaim: data.result.statement_of_claim || '',
            statementOfDamages: data.result.statement_of_damages || '',
            preActionLetter: data.result.pre_action_letter || ''
          };
          
          setGeneratedContent(newContent);
          
          // Cache the generated content
          const cacheKey = `orchestration_content_${caseId}`;
          localStorage.setItem(cacheKey, JSON.stringify(newContent));
          console.log('Content cached successfully:', newContent);
        }
        break;
      
      case 'error':
        const errorMessage = data.message || 'Unknown error occurred';
        setError(errorMessage);
        setShowErrorModal(true);
        break;
    }
  };


  // Icon mapping for tabs
  const iconMap = {
    'FileText': FileText,
    'Users': Users,
    'Calendar': Calendar,
    'List': List,
  };

  // Tab component mapping
  const getTabComponent = (tabId: string) => {
    switch (tabId) {
      case 'writ-of-summons':
        return WritOfSummonsTab;
      case 'witness-statement':
        return WitnessStatementTab;
      case 'statement-of-claim':
        return StatementOfClaimTab;
      case 'statement-of-damages':
        return StatementOfDamagesTab;
      case 'pre-action-letter':
        return PreActionLetterTab;
      default:
        return WitnessStatementTab; // fallback
    }
  };

  // Render agent status during generation
  if (isGenerating) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white  rounded-lg p-6">
          <div className="text-center mb-6">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--color-saffron-600)]" />
            <h2 className="text-2xl font-bold text-[var(--color-ink-950)] mb-2">Generating Documents</h2>
            <p className="text-[var(--color-ink-500)]">AI agents are processing your case data...</p>
          </div>

          {/* Latest Server Event */}
          {serverEvents.length > 0 && (
            <div className="mt-6">
              <div className="bg-[var(--color-cream-50)] rounded-lg p-4">
                {(() => {
                  const latestEvent = serverEvents[serverEvents.length - 1];
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                          <span className="text-sm text-[var(--color-ink-500)] capitalize">
                            {latestEvent.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--color-ink-300)]">
                          {new Date(latestEvent.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div>
                        {/* Message with inline spinner */}
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-ink-800)] text-sm">
                            {latestEvent.message}
                          </span>
                          <Loader2 className="w-4 h-4 text-[var(--color-saffron-600)] animate-spin flex-shrink-0" />
                        </div>
                        
                        {/* Progress bar */}
                        {latestEvent.progress && (
                          <div className="space-y-1 mt-2">
                            <div className="flex justify-between text-xs text-[var(--color-ink-500)]">
                              <span>Progress</span>
                              {/* <span>{latestEvent.progress.current}/{latestEvent.progress.total}</span> */}
                            </div>
                            <div className="w-full bg-[var(--color-cream-200)] rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-gray-600 h-1 rounded-full transition-all duration-500 ease-out"
                                style={{ 
                                  width: `${(latestEvent.progress.current / latestEvent.progress.total) * 100}%`,
                                  animation: 'pulse 2s ease-in-out infinite'
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-[var(--color-rose-500)]/10 border border-[var(--color-rose-500)]/30 rounded-lg">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-[var(--color-rose-500)] mr-2" />
                <span className="text-[var(--color-rose-500)]">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-[var(--color-rose-500)] mr-3" />
              <h3 className="text-lg font-semibold text-[var(--color-ink-950)]">Generation Failed</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-[var(--color-ink-500)] mb-3">
                There was an error while generating your documents:
              </p>
              <div className="bg-[var(--color-rose-500)]/10 border border-[var(--color-rose-500)]/30 rounded-lg p-3">
                <p className="text-[var(--color-rose-500)] text-sm font-mono break-words">
                  {error}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCloseErrorModal}
                className="px-4 py-2 text-[var(--color-ink-500)] bg-[var(--color-cream-100)] rounded-lg hover:bg-[var(--color-cream-200)] transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRetryGeneration}
                className="px-4 py-2 bg-[var(--color-saffron-500)] text-white rounded-lg hover:bg-[var(--color-saffron-600)] transition-colors"
              >
                Retry Generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-[var(--color-saffron-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-[var(--color-ink-950)]">
                  Insufficient Balance
                </h3>
              </div>
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="text-[var(--color-ink-300)] hover:text-[var(--color-ink-500)] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-[var(--color-ink-500)] mb-4">
                You don't have enough tokens to generate documents. Please top up your account to continue.
              </p>
              <div className="bg-[var(--color-saffron-500)]/10 border border-[var(--color-saffron-500)]/30 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-[var(--color-saffron-600)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--color-saffron-600)]">
                    <strong>Need more tokens?</strong> Visit your account settings to purchase additional tokens.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] bg-white border border-[var(--color-line-strong)] rounded-lg hover:bg-[var(--color-cream-50)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  // Top-up flow is not part of Vakil — left as a no-op.
                }}
                className="px-4 py-2 bg-[var(--color-saffron-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-saffron-600)] transition-colors"
              >
                Top Up Account
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink-950)]">Document Review</h1>
          <p className="text-[var(--color-ink-500)] mt-1">Review and edit AI-generated documents</p>
        </div>
        <button
          onClick={() => {
            hasInitiatedGeneration.current = false;
            generateContent();
          }}
          disabled={isGenerating}
          className="px-4 py-2 bg-[var(--color-saffron-500)] text-white rounded-lg hover:bg-[var(--color-saffron-600)] disabled:bg-[var(--color-saffron-400)] disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Regenerate All'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-[var(--color-line)]">
          <nav className="-mb-px flex space-x-8">
            {config.tabs.map((tab) => {
              const IconComponent = iconMap[tab.icon as keyof typeof iconMap];
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[var(--color-saffron-500)] text-[var(--color-saffron-600)]'
                      : 'border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)] hover:border-[var(--color-line-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {IconComponent && <IconComponent className="w-4 h-4" />}
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content - Pass generated content as props */}
      {config.tabs.map((tab) => {
        const TabComponent = getTabComponent(tab.id);
        
        // Map tab IDs to the correct content keys
        let contentKey: keyof GeneratedContent;
        let bengaliContentKey: keyof GeneratedContent | null = null;
        
        switch (tab.id) {
          case 'writ-of-summons':
            contentKey = 'writOfSummons';
            break;
          case 'witness-statement':
            contentKey = 'witnessStatement';
            bengaliContentKey = 'witnessStatementBengali';
            break;
          case 'statement-of-claim':
            contentKey = 'statementOfClaim';
            break;
          case 'statement-of-damages':
            contentKey = 'statementOfDamages';
            break;
          case 'pre-action-letter':
            contentKey = 'preActionLetter';
            break;
          default:
            contentKey = 'witnessStatement';
        }
        
        const content = generatedContent[contentKey] || '';
        const bengaliContent = bengaliContentKey ? generatedContent[bengaliContentKey] || '' : '';
        
        return (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            <TabComponent 
              caseId={caseId} 
              caseData={caseData}
              content={content}
              bengaliContent={bengaliContent}
              isGenerating={isGenerating}
            />
          </div>
        );
      })}
      </div>
    </>
  );
}