"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { CaseParty } from "@/types/case";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (caseData: CaseData) => void;
  initialData?: Partial<CaseData>;
  isEditMode?: boolean;
}

interface CaseData {
  title: string;
  caseType: 'SOC' | 'DEFENCE';
  status?: 'draft' | 'processing' | 'completed';
  parties: CaseParty[];
  summary: string;
  court?: string;
  caseNumber?: string;
}

export default function CreateCaseModal({ isOpen, onClose, onSubmit, initialData, isEditMode = false }: CreateCaseModalProps) {
  const [formData, setFormData] = useState<CaseData>({
    title: initialData?.title || '',
    caseType: initialData?.caseType || 'SOC',
    status: initialData?.status || 'draft',
    parties: initialData?.parties?.map(p => ({...p, id: p.id || crypto.randomUUID() })) || [], // Initialize with an empty array if no initial parties
    summary: initialData?.summary || '',
    court: initialData?.court || '',
    caseNumber: initialData?.caseNumber || ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: keyof CaseData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addPlaintiff = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', type: 'person', role: 'plaintiff', bengaliName: null, id: crypto.randomUUID() }]
    }));
  };

  const removePlaintiff = (id: string) => {
    if (formData.parties.length > 1) {
      setFormData(prev => ({
        ...prev,
        parties: prev.parties.filter((p) => p.id !== id)
      }));
    }
  };

  const parseNameInput = (input: string) => {
    const match = input.match(/(.*)\((.*)\)/);
    if (match) {
      return {
        englishName: match[1].trim(),
        bengaliName: match[2].trim()
      };
    }
    return {
      englishName: input,
      bengaliName: null
    };
  };

  const updatePlaintiff = (id: string, value: string) => {
    const { englishName, bengaliName } = parseNameInput(value);
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map((p) => p.id === id ? { ...p, name: englishName, bengaliName: bengaliName } : p)
    }));
    // Note: Plaintiffs are currently stored as string[], so Chinese name cannot be stored directly here.
    // If Chinese name is needed for plaintiffs, the plaintiffs array type would need to change.
  };

  const addDefendant = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', type: 'person', role: 'defendant', bengaliName: null, id: crypto.randomUUID() }]
    }));
  };

  const removeDefendant = (id: string) => {
    if (formData.parties.length > 1) {
      setFormData(prev => ({
        ...prev,
        parties: prev.parties.filter((p) => p.id !== id)
      }));
    }
  };

  const updateDefendant = (id: string, field: 'name' | 'type', value: string) => {
    if (field === 'name') {
      const { englishName, bengaliName } = parseNameInput(value);
      setFormData(prev => ({
        ...prev,
        parties: prev.parties.map((d) =>
          d.id === id ? { ...d, name: englishName, bengaliName: bengaliName } : d
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        parties: prev.parties.map((d) =>
          d.id === id ? { ...d, [field]: value as 'person' | 'company' } : d
        )
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Case title is required';
    }

    const validPlaintiffs = formData.parties.filter(p => p.name.trim() && p.role === 'plaintiff');
    if (validPlaintiffs.length === 0) {
      newErrors.parties = 'At least one plaintiff is required';
    }

    const validDefendants = formData.parties.filter(d => d.name.trim() && d.role === 'defendant');
    if (validDefendants.length === 0) {
      newErrors.parties = (newErrors.parties ? newErrors.parties + ', ' : '') + 'At least one defendant is required';
    }

    const defendantsWithoutType = formData.parties.filter(d => d.name.trim() && d.role === 'defendant' && !d.type);
    if (defendantsWithoutType.length > 0) {
      newErrors.parties = (newErrors.parties ? newErrors.parties + ', ' : '') + 'Please select a type for all defendants';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const validData = {
        ...formData,
        parties: formData.parties
          .filter(p => p.name.trim())
          .map(p => ({
            id: p.id,
            name: p.name,
            bengaliName: p.bengaliName,
            type: p.type || 'person',
            role: p.role
          }))
      };
      onSubmit(validData);
      onClose();
      // Reset form only if not in edit mode
      if (!isEditMode) {
        setFormData({
          title: '',
          caseType: 'SOC',
          status: 'draft',
          parties: [], // Reset to empty parties array
          summary: '',
          court: '',
          caseNumber: ''
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred Background */}
      <div 
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Case' : 'Create New Case'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Case Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Case Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter case title"
              className={`w-full px-3 py-2 border text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Case Creator Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Role
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.caseType === 'SOC' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="caseType"
                  value="SOC"
                  checked={formData.caseType === 'SOC'}
                  onChange={(e) => handleInputChange('caseType', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    formData.caseType === 'SOC'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {formData.caseType === 'SOC' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Plaintiff</div>
                    <div className="text-sm text-gray-600">
                      Filing a claim
                    </div>
                  </div>
                </div>
              </label>

              <label className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.caseType === 'DEFENCE' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="caseType"
                  value="DEFENCE"
                  checked={formData.caseType === 'DEFENCE'}
                  onChange={(e) => handleInputChange('caseType', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    formData.caseType === 'DEFENCE'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {formData.caseType === 'DEFENCE' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Defendant</div>
                    <div className="text-sm text-gray-600">
                      Responding to claim
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          

          {/* Parties */}
          {/* Plaintiffs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Plaintiffs
              </label>
              <button
                type="button"
                onClick={addPlaintiff}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Plaintiff</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.parties.filter(p => p.role === 'plaintiff').map((plaintiff, index) => (
                <div key={plaintiff.id} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">
                      Plaintiff {index + 1}
                    </label>
                    <input
                      type="text"
                      value={plaintiff.name + (plaintiff.bengaliName ? ` (${plaintiff.bengaliName})` : '')}
                      onChange={(e) => updatePlaintiff(plaintiff.id, e.target.value)}
                      placeholder="Enter plaintiff name (Chinese Name)"
                      className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {formData.parties.filter(p => p.role === 'plaintiff').length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlaintiff(plaintiff.id)}
                      className="text-red-600 hover:text-red-700 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.parties && (
              <p className="mt-1 text-sm text-red-600">{errors.parties}</p>
            )}
          </div>

          {/* Defendants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Defendants
              </label>
              <button
                type="button"
                onClick={addDefendant}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Defendant</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.parties.filter(p => p.role === 'defendant').map((defendant, index) => (
                <div key={defendant.id} className="flex items-end space-x-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">
                      Defendant {index + 1}
                    </label>
                    <input
                      type="text"
                      value={defendant.name + (defendant.bengaliName ? ` (${defendant.bengaliName})` : '')}
                      onChange={(e) => updateDefendant(defendant.id, 'name', e.target.value)}
                      placeholder="Enter defendant name (Chinese Name)"
                      className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <select
                      value={defendant.type}
                      onChange={(e) => updateDefendant(defendant.id, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a type</option>
                      <option value="person">Person</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                  {formData.parties.filter(p => p.role === 'defendant').length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDefendant(defendant.id)}
                      className="text-red-600 hover:text-red-700 mb-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.parties && (
              <p className="mt-1 text-sm text-red-600">{errors.parties}</p>
            )}
          </div>

          {/* Court */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Court
            </label>
            <select
              value={formData.court || ''}
              onChange={(e) => handleInputChange('court', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >  
              <option value="">Select a court</option>
              <option value="District Court">District Court</option>
              <option value="High Court (Court of First Instance)">High Court (Court of First Instance)</option>
              <option value="Court of Appeal">Court of Appeal</option>
              <option value="Court of Final Appeal">Court of Final Appeal</option>
            </select>
          </div>

          {/* Case Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Case Number
            </label>
            <input
              type="text"
              value={formData.caseNumber}
              onChange={(e) => handleInputChange('caseNumber', e.target.value)}
              placeholder="Enter case number"
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Case Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Case Summary (Optional)
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              placeholder="Provide additional details about the personal injury case to help generate a more accurate document..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            />
            <p className="mt-1 text-sm text-gray-500">
              Include key facts, dates, damages, and any other relevant information about the case.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-md transition-colors"
            >
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
