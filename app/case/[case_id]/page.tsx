'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Case } from '@/types/case';
import { Loader2 } from 'lucide-react';

import { CaseShell } from '@/components/wizard/CaseShell';
import Step1Evidence from '@/components/steps/Step1Evidence';
import Step2Process from '@/components/steps/Step2Process';
import Step3Particulars from '@/components/steps/Step3Particulars';
import Step4Chronology from '@/components/steps/Step4Chronology';
import Step5Review from '@/components/steps/Step5Review';

const STEPS = [
  { number: 1, title: 'Evidence' },
  { number: 2, title: 'Process' },
  { number: 3, title: 'Particulars' },
  { number: 4, title: 'Chronology' },
  { number: 5, title: 'Review' },
];

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.case_id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedContent] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPendingUploads, setHasPendingUploads] = useState(false);
  const [hasIncompleteFiles, setHasIncompleteFiles] = useState(false);
  const [hasProcessingFiles, setHasProcessingFiles] = useState(false);
  const [hasFailedFiles, setHasFailedFiles] = useState(false);
  const [generatingAction] = useState<string | null>(null);
  const [isEditingParticulars, setIsEditingParticulars] = useState(false);
  const [isEditingChronology, setIsEditingChronology] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);

  const handlePendingUploadsChange = (hasPending: boolean) => setHasPendingUploads(hasPending);
  const handleIncompleteFilesChange = (hasIncomplete: boolean, hasProcessing: boolean, hasFailed: boolean) => {
    setHasIncompleteFiles(hasIncomplete);
    setHasProcessingFiles(hasProcessing);
    setHasFailedFiles(hasFailed);
  };
  const handleEditingStateChange = (isEditing: boolean) => setIsEditingParticulars(isEditing);
  const handleChronologyEditingStateChange = (isEditing: boolean) => setIsEditingChronology(isEditing);

  const isPreviousDisabled = () => {
    if (isStepLoading) return true;
    if (currentStep === 1) return true;
    return isGenerating || isEditingParticulars || isEditingChronology;
  };

  const isNextDisabled = () => {
    if (isStepLoading) return true;
    if (currentStep >= STEPS.length) return true;
    if (currentStep === 1) return hasPendingUploads;
    if (currentStep === 2) return hasProcessingFiles;
    if (currentStep === 3) return isGenerating || isEditingParticulars;
    if (currentStep === 4) return isGenerating || isEditingChronology;
    return false;
  };

  const getNextButtonText = () => {
    if (isStepLoading) return 'Loading…';
    if (currentStep >= STEPS.length) return 'Complete';
    if (currentStep === 1) return hasPendingUploads ? 'Uploading…' : 'Next';
    if (currentStep === 2) return hasProcessingFiles ? 'Processing…' : 'Next';
    if (currentStep === 3) {
      if (isGenerating) return 'Generating…';
      if (isEditingParticulars) return 'Editing…';
      return 'Next';
    }
    if (currentStep === 4) {
      if (isGenerating) return 'Generating…';
      if (isEditingChronology) return 'Editing…';
      return 'Next';
    }
    return 'Next';
  };

  const handleBackClick = () => router.push('/');

  const handleStepChange = (newStep: number) => {
    setIsStepLoading(true);
    setCurrentStep(newStep);
    setTimeout(() => setIsStepLoading(false), 500);
  };

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}`);
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        setCaseData({
          ...data,
          files: data.files.map((file: any) => ({
            id: file.id,
            type: file.type,
            fileName: file.fileName,
            status: file.status,
            entities: file.entities,
            documentDate: file.documentDate,
          })),
        });
      } catch (error) {
        console.error('Error fetching case:', error);
      } finally {
        setLoading(false);
      }
    };
    if (caseId) fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-display text-ink-100 mb-2">Case not found</h2>
          <p className="text-ink-400">The requested case could not be found.</p>
        </div>
      </div>
    );
  }

  const stepsWithMeta = STEPS.map((s) => ({
    ...s,
    meta:
      s.number === 1 && caseData.files?.length
        ? `${caseData.files.length} file${caseData.files.length === 1 ? '' : 's'}`
        : undefined,
  }));

  return (
    <CaseShell
      caseData={caseData}
      steps={stepsWithMeta}
      currentStep={currentStep}
      previousDisabled={isPreviousDisabled()}
      nextDisabled={isNextDisabled()}
      nextLabel={getNextButtonText()}
      onBack={handleBackClick}
      onStepClick={(n) => {
        if (n < currentStep) handleStepChange(n);
      }}
      onPrevious={() => handleStepChange(Math.max(1, currentStep - 1))}
      onNext={() => handleStepChange(Math.min(STEPS.length, currentStep + 1))}
    >
      {currentStep === 1 && (
        <Step1Evidence caseData={caseData} onPendingUploadsChange={handlePendingUploadsChange} />
      )}
      {currentStep === 2 && (
        <Step2Process
          caseId={caseId}
          generatedContent={generatedContent as any}
          onGenerateContent={() => {}}
          onGeneratingStateChange={() => {}}
          hasPendingUploads={hasPendingUploads}
          generatingAction={generatingAction}
          onOcrStateReset={() => {}}
          onIncompleteFilesChange={handleIncompleteFilesChange}
        />
      )}
      {currentStep === 3 && (
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
      {currentStep === 5 && <Step5Review caseId={caseId} caseData={caseData} />}
    </CaseShell>
  );
}
