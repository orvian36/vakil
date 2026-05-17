"use client";
import { useAuth } from '@/hooks/useAuth';
import { Case } from '@/types/case';
import { useEffect, useState } from 'react';
import { Search, Filter, Plus, Trash2, FileText, User, Calendar, Loader2, Edit } from "lucide-react";
import CreateCaseModal from '@/components/CreateCaseModal';
import EditCaseModal from '@/components/EditCaseModal';
import { useRouter } from 'next/navigation';

// interface ApiResponse {
//   success: boolean;
//   data: {
//     data: Case[];
//     pagination: {
//       page: number;
//       limit: number;
//       total: number;
//       totalPages: number;
//       hasNext: boolean;
//       hasPrev: boolean;
//     };
//   };
//   message: string;
//   timestamp: string;
// }

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const userId = user?.id;

  // Fetch cases from API
  const fetchCases = async (userId: string, page: number = 1, search?: string) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      if (search) {
        params.append('search', search);
      }
      
      console.log('Fetching cases from:', `/api/cases/user/${userId}?${params}`);

      const response = await fetch(`/api/cases/user/${userId}?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response as JSON:', parseError);
        }
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const data: Case[] = await response.json(); // Directly assign array of cases
      console.log('API Response:', data);
      
      setCases(data);
      setPagination({
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    } catch (err) {
      console.error('Error fetching cases:', err);
      // Set empty cases array on error instead of showing error message
      setCases([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchCases(userId); // Initial fetch without search term
    }
  }, [userId]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined && userId) {
        fetchCases(userId, 1, searchTerm); // Fetch with search term
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Authentication</h2>
          <p className="text-gray-600">Please wait while we verify your credentials...</p>
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const handleCreateCase = async (caseData: any) => {
    try {
      console.log('Creating case with data:', caseData);
      
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: caseData.title,
          caseType: caseData.caseType,
          summary: caseData.summary || '',
          parties: caseData.parties,
          court: caseData.court || '',
          caseNumber: caseData.caseNumber || '',
          userId: userId,
        }),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use the status text
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Case created successfully:', result);

      // Refresh the cases list
      if (userId) {
        await fetchCases(userId, 1, searchTerm);
      }
    } catch (err) {
      console.error('Error creating case:', err);
      // Just log the error, don't show it to user
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting case with ID:', caseId);
      
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use the status text
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Case deleted successfully:', result);

      // Refresh the cases list
      if (userId) {
        await fetchCases(userId, pagination.page, searchTerm);
      }
    } catch (err) {
      console.error('Error deleting case:', err);
      // Just log the error, don't show it to user
    }
  };


  const handleViewCase = (caseId: string) => {
    router.push(`/case/${caseId}`);
  };

  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem);
    setIsEditModalOpen(true);
  };

  const handleUpdateCase = async (caseData: any) => {
    if (!editingCase) return;

    try {
      console.log('Updating case with data:', caseData);
      
      const response = await fetch(`/api/cases/${editingCase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: caseData.title,
          caseType: caseData.caseType,
          summary: caseData.summary || '',
          parties: caseData.parties,
          court: caseData.court || '',
          caseNumber: caseData.caseNumber || '',
        }),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use the status text
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Case updated successfully:', result);

      // Refresh the cases list
      if (userId) {
        await fetchCases(userId, pagination.page, searchTerm);
      }
    } catch (err) {
      console.error('Error updating case:', err);
      // Just log the error, don't show it to user
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Management</h1>
            <p className="text-gray-600 mt-2">Manage your personal injury cases and legal documents</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Case</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 " />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-black w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm">
              {loading ? 'Loading...' : `${cases.length} cases`}
            </span>
          </div>
        </div>


        {/* Cases Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500">Loading cases...</span>
                      </div>
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="w-12 h-12 text-gray-300" />
                        <span className="text-sm text-gray-500">No cases found</span>
                        <span className="text-xs text-gray-400">
                          {searchTerm ? 'Try adjusting your search terms' : 'Create your first case to get started'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cases.map((caseItem) => (
                    <tr 
                      key={caseItem.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewCase(caseItem.id)}
                    >
                      <td className="px-3 py-2">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 break-words">{caseItem.title}</div>
                          <div className="text-sm text-gray-500 break-words">{caseItem.summary || 'No description'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {/* {getDocumentTypeIcon(caseItem.document_type)} */}
                          <span className="text-sm text-gray-900">
                            {caseItem.caseType === 'SOC' ? 'Statement of Claim' : 'Defence'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseItem.status || 'draft')}`}>
                          {(caseItem.status || 'draft').charAt(0).toUpperCase() + (caseItem.status || 'draft').slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-start space-x-2">
                            <User className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-gray-900">Plaintiffs:</span>
                              <div className="text-sm text-gray-600 break-words">
                                {caseItem.parties.filter(p => p.role === 'plaintiff').map(p => p.name).join(', ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <User className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-gray-900">Defendants:</span>
                              <div className="text-sm text-gray-600 break-words">
                                {caseItem.parties.filter(p => p.role === 'defendant').map(p => p.name).join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(caseItem.updatedAt || caseItem.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCase(caseItem);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit case"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCase(caseItem.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete case"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {/* {!loading && cases.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchCases(userId || '', pagination.page - 1, searchTerm)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchCases(userId || '', pagination.page + 1, searchTerm)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )} */}

      </main>

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCase}
      />

      {/* Edit Case Modal */}
      <EditCaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCase(null);
        }}
        onSubmit={handleUpdateCase}
        caseData={editingCase}
      />

    </div>
  );
}
