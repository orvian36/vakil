'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Clock, FolderOpen, Eye, CheckCircle } from 'lucide-react';
import { Case } from '@/types/case';

// Import all step components
import Step1Evidence from '@/components/steps/Step1Evidence';
import Step2Process from '@/components/steps/Step2Process';
import Step3Particulars from '@/components/steps/Step3Particulars';
import Step4Chronology from '@/components/steps/Step4Chronology';
import Step5Review from '@/components/steps/Step5Review';


const steps = [
  { number: 1, title: 'Evidence', icon: FolderOpen },
  { number: 2, title: 'Process', icon: CheckCircle },
  { number: 3, title: 'Particulars', icon: FileText },
  { number: 4, title: 'Chronology', icon: Clock },
  { number: 5, title: 'Review', icon: Eye },
];

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.case_id as string;
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [generatedContent, setGeneratedContent] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPendingUploads, setHasPendingUploads] = useState(false);
  const [hasIncompleteFiles, setHasIncompleteFiles] = useState(false);
  const [hasProcessingFiles, setHasProcessingFiles] = useState(false);
  const [hasFailedFiles, setHasFailedFiles] = useState(false);
  const [generatingAction, setGeneratingAction] = useState<string | null>(null);
  const [isEditingParticulars, setIsEditingParticulars] = useState(false);
  const [isEditingChronology, setIsEditingChronology] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);

  // Handle pending uploads state from Step1Evidence
  const handlePendingUploadsChange = (hasPending: boolean) => {
    setHasPendingUploads(hasPending);
  };

  // Handle file status states from Step2Process
  const handleIncompleteFilesChange = (hasIncomplete: boolean, hasProcessing: boolean, hasFailed: boolean) => {
    setHasIncompleteFiles(hasIncomplete);
    setHasProcessingFiles(hasProcessing);
    setHasFailedFiles(hasFailed);
  };

  // Handle editing state from Step3Particulars
  const handleEditingStateChange = (isEditing: boolean) => {
    setIsEditingParticulars(isEditing);
  };

  // Handle editing state from Step4Chronology
  const handleChronologyEditingStateChange = (isEditing: boolean) => {
    setIsEditingChronology(isEditing);
  };

  // Simple navigation logic based on current step
  const isPreviousDisabled = () => {
    // First check if step is loading
    if (isStepLoading) return true;
    
    // Then check current step
    if (currentStep === 1) return true;
    
    // Then check blocking states
    return isGenerating || isEditingParticulars || isEditingChronology;
  };

  const isNextDisabled = () => {
    // First check if step is loading
    if (isStepLoading) return true;
    
    // Then check current step
    if (currentStep >= steps.length) return true;
    
    // Then check blocking states based on current step
    if (currentStep === 1) {
      return hasPendingUploads;
    }
    
    if (currentStep === 2) {
      // return hasIncompleteFiles || hasProcessingFiles;
      return hasProcessingFiles;
    }
    
    if (currentStep === 3) {
      return isGenerating || isEditingParticulars;
    }
    
    if (currentStep === 4) {
      return isGenerating || isEditingChronology;
    }
    
    return false;
  };

  const getNextButtonText = () => {
    // First check if step is loading
    if (isStepLoading) return 'Loading...';
    
    // Then check current step
    if (currentStep >= steps.length) return 'Complete';
    
    // Then check states based on current step
    if (currentStep === 1) {
      if (hasPendingUploads) return 'Uploading...';
      return 'Next';
    }
    
    if (currentStep === 2) {
      if (hasProcessingFiles) return 'Processing...';
      // if (hasFailedFiles) return 'Files Failed';
      // if (hasIncompleteFiles) return 'Complete Files First';
      return 'Next';
    }
    
    if (currentStep === 3) {
      if (isGenerating) return 'Generating...';
      if (isEditingParticulars) return 'Editing...';
      return 'Next';
    }
    
    if (currentStep === 4) {
      if (isGenerating) return 'Generating...';
      if (isEditingChronology) return 'Editing...';
      return 'Next';
    }
    
    return 'Next';
  };

  const handleBackClick = () => {
    router.push('/');
  };

  const handleStepChange = (newStep: number) => {
    setIsStepLoading(true);
    setCurrentStep(newStep);
    
    // Reset loading state after a short delay to allow step content to mount
    setTimeout(() => {
      setIsStepLoading(false);
    }, 500);
  };


  
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}`);
        if (response.ok) {
          const data = await response.json();
          const filteredData = {
            ...data,
            files: data.files.map((file: any) => ({
              id: file.id,
              type: file.type,
              fileName: file.fileName,
              status: file.status,
              entities: file.entities,
              documentDate: file.documentDate
            }))
          };
          
          setCaseData(filteredData);
        } else {
          console.error('Failed to fetch case:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching case:', error);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchCase();
    }
  }, [caseId]);




  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading case details...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case not found</h2>
          <p className="text-gray-600 mb-4">The requested case could not be found.</p>
          <button
            onClick={handleBackClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{caseData.title}</h1>
              <p className="text-gray-600 mt-1">
                { `Upload documents for ${caseData.caseType.replace('_', ' ')} case`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {caseData.status && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                caseData.status === 'completed' ? 'bg-green-100 text-green-800' :
                caseData.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative flex items-center justify-between">
            {/* Individual connecting lines between circles */}
            {steps.map((step, index) => {
              if (index === steps.length - 1) return null; // No line after the last step
              
              const isLineCompleted = currentStep > step.number;
              // Each step takes up 1/5 of the width, so lines are positioned between them
              const stepWidth = 100 / steps.length; // 20% for each step
              const lineStart = (index + 1) * stepWidth - stepWidth / 2; // Start at center of current circle
              const lineEnd = (index + 2) * stepWidth - stepWidth / 2; // End at center of next circle
              const lineWidth = lineEnd - lineStart; // Width of the line
              
              return (
                <div
                  key={`line-${index}`}
                  className="absolute top-7 h-1 rounded-full transition-all duration-500"
                  style={{
                    left: `${lineStart}%`,
                    width: `${lineWidth}%`,
                    backgroundColor: isLineCompleted ? '#16a34a' : '#e5e7eb', // green-600 or gray-200
                  }}
                />
              );
            })}
            
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              const isPending = currentStep < step.number;
              
              return (
                <div key={step.number} className="flex flex-col items-center flex-1 relative z-10">
                  {/* Step Circle with Icon */}
                  <div
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                        : isCompleted
                        ? 'bg-green-600 text-white shadow-md shadow-green-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <IconComponent className="w-6 h-6" />
                    )}
                    
                    {/* Step Number Badge */}
                    <div
                      className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? 'bg-white text-blue-600'
                          : isCompleted
                          ? 'bg-white text-green-600'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {step.number}
                    </div>
                  </div>
                  
                  {/* Step Title */}
                  <div className="mt-3 text-center max-w-24">
                    <div
                      className={`text-xs font-medium leading-tight ${
                        isCurrent
                          ? 'text-blue-600'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            {currentStep === 1 && (
              <Step1Evidence 
                caseData={caseData}
                onPendingUploadsChange={handlePendingUploadsChange}
              />
            )}
            {currentStep === 2 && (
              <Step2Process 
                caseId={caseId} 
                generatedContent={generatedContent}
                  onGenerateContent={() => {}}
                  onGeneratingStateChange={() => {}}
                  hasPendingUploads={hasPendingUploads}
                  generatingAction={generatingAction}
                  onOcrStateReset={() => {}}
                  onIncompleteFilesChange={handleIncompleteFilesChange}
              />
            )}
            { currentStep === 3 && (
              <Step3Particulars 
                caseId={caseId}  
                generatedContent={generatedContent}
                onGeneratingStateChange={setIsGenerating}
                onEditingStateChange={handleEditingStateChange}
                onNextStep={() => setCurrentStep(4)}
              />
            )}
            {currentStep === 4 && (
              <Step4Chronology 
                caseId={caseId} 
                generatedContent={generatedContent}
                onGeneratingStateChange={setIsGenerating}
                onEditingStateChange={handleChronologyEditingStateChange}
                onNextStep={() => setCurrentStep(5)}
              />
            )}
            {currentStep === 5 && (
              <Step5Review 
                caseId={caseId} 
                caseData={caseData}
              />
            )} 
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between">
          <button
            onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
            disabled={isPreviousDisabled()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 1 
                ? 'invisible' 
                : isPreviousDisabled()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          
          {currentStep < steps.length && (
            <button
              onClick={() => handleStepChange(Math.min(steps.length, currentStep + 1))}
              disabled={isNextDisabled()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isNextDisabled()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {getNextButtonText()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
