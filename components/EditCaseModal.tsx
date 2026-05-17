"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { CaseParty, Case } from "@/types/case";

interface EditCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (caseData: CaseData) => void;
  caseData: Case | null;
}

export interface CaseData {
  id: string;
  title: string;
  caseType: 'SOC' | 'DEFENCE';
  court?: string;
  caseNumber?: string;
  status: 'draft' | 'processing' | 'completed' | undefined;
  parties: CaseParty[];
  summary: string;
}

export default function EditCaseModal({ isOpen, onClose, onSubmit, caseData }: EditCaseModalProps) {
  const [formData, setFormData] = useState<CaseData>({
    id: '',
    title: '',
    caseType: 'SOC',
    court: '',
    caseNumber: '',
    status: 'draft',
    parties: [], // Initialize with an empty array
    summary: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Update form data when caseData changes
  useEffect(() => {
    if (caseData) {

      setFormData({
        id: caseData.id,
        title: caseData.title,
        caseType: caseData.caseType,
        court: caseData.court || '',
        caseNumber: caseData.caseNumber || '',
        status: caseData.status,
        parties: caseData.parties.length > 0 ? caseData.parties : [], // Ensure it's an empty array if no parties
        summary: caseData.summary || ''
      });
    }
  }, [caseData]);

  const handleInputChange = (field: keyof CaseData, value: any) => {
    console.log(`Updating field: ${String(field)}, with value: ${value}`);
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      console.log("New form data after update:", newState);
      return newState;
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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

  const updatePlaintiff = (id: string, value: string) => {
    const { englishName, bengaliName } = parseNameInput(value);
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map((p) => p.id === id ? { ...p, name: englishName, bengaliName: bengaliName } : p)
    }));

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
        parties: prev.parties.map((d) => d.id === id ? { ...d, name: englishName, bengaliName: bengaliName } : d)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        parties: prev.parties.map((d) => d.id === id ? { ...d, [field]: value as 'person' | 'company' } : d)
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Case Title is required';
    }

    const validPlaintiffs = formData.parties.filter(p => p.name.trim() && p.role === 'plaintiff');
    if (validPlaintiffs.length === 0) {
      newErrors.parties = 'At least one plaintiff is required';
    }

    const validDefendants = formData.parties.filter(d => d.name.trim() && d.role === 'defendant');
    if (validDefendants.length === 0) {
      newErrors.parties = (newErrors.parties ? newErrors.parties + ', ' : '') + 'At least one defendant is required';
    }

    // Check if any defendant has a name but no type
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
        id: formData.id,
        title: formData.title,
        caseType: formData.caseType,
        court: formData.court,
        caseNumber: formData.caseNumber,
        status: formData.status,
        summary: formData.summary,
        parties: formData.parties
          .filter(d => d.name.trim())
          .map(d => ({
            id: d.id,
            name: d.name,
            type: d.type || 'person',
            bengaliName: d.bengaliName,
            role: d.role,
          }))
      };
      onSubmit(validData);
      onClose();
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
          <h2 className="text-xl font-semibold text-gray-900">Edit Case</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="p-6 space-y-6">
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
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Case Type
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
                    <div className="font-medium text-gray-900">Statement of Claim</div>
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
                    <div className="font-medium text-gray-900">Defence</div>
                    <div className="text-sm text-gray-600">
                      Responding to claim
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Case Status */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Case Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div> */}

          {/* Plaintiffs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Plaintiffs
              </label>
              {/* <button
                type="button"
                onClick={addPlaintiff}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Plaintiff</span>
              </button> */}
            </div>

            <div className="space-y-3">
              {formData.parties
                .filter((party) => party.role === 'plaintiff')
                .map((plaintiff, index) => (
                  <div key={plaintiff.id || index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">
                        Plaintiff {index + 1}
                      </label>
                      <input
                        type="text"
                        value={plaintiff.name + (plaintiff.bengaliName ? ` (${plaintiff.bengaliName})` : '')}
                        onChange={(e) => updatePlaintiff(plaintiff.id, e.target.value)}
                        placeholder="Enter plaintiff name (Bengali Name বাংলা)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {formData.parties.filter((p) => p.role === 'plaintiff').length > 1 && (
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
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Defendants</h3>
              <button
                type="button"
                onClick={addDefendant}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Defendant</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.parties.filter((party) => party.role === 'defendant').map((defendant, index) => (
                <div key={defendant.id} className="flex items-end space-x-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">
                      Defendant {index + 1}
                    </label>
                    <input
                      type="text"
                      value={defendant.name + (defendant.bengaliName ? ` (${defendant.bengaliName})` : '')}
                      onChange={(e) => updateDefendant(defendant.id, 'name', e.target.value)}
                      placeholder="Enter defendant name (Bengali Name বাংলা)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <select
                      value={defendant.type}
                      onChange={(e) => updateDefendant(defendant.id, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="person">Person</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                  {formData.parties.filter((p) => p.role === 'defendant').length > 1 && (
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
              value={formData.caseNumber || ''}
              onChange={(e) => handleInputChange('caseNumber', e.target.value)}
              placeholder="Enter case number"
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Case Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Case Summary
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              placeholder="Enter a brief summary of the case..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
