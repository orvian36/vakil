"use client";

import { useState } from "react";
import { X, RefreshCw } from "lucide-react";

interface RegenerateParticularsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (modifications: string) => void;
  isGenerating?: boolean;
}

export default function RegenerateParticularsModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isGenerating = false 
}: RegenerateParticularsModalProps) {
  const [modifications, setModifications] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(modifications);
    setModifications(""); // Reset for next time
  };

  const handleClose = () => {
    setModifications("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Regenerate Particulars of Claim
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Provide any modifications or additional requirements for the claim particulars
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-4">
            <div>
              <label htmlFor="modifications" className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to change or add to the claim particulars?
              </label>
              <textarea
                id="modifications"
                value={modifications}
                onChange={(e) => setModifications(e.target.value)}
                placeholder="e.g., Add more detailed breakdown of medical expenses, Include specific future medical costs, Focus more on loss of income calculations, Add pain and suffering assessment details, Include transportation costs for medical appointments, etc."
                className="text-black w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to regenerate with the same prompt, or add specific modifications.
              </p>
            </div>
          </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={handleClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
