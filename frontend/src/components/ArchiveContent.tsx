'use client';

import { useState, useEffect } from 'react';
import { DebateListItem, Model, getDebates } from '@/lib/api';
import ArchiveFilters from './ArchiveFilters';
import ArchiveRow from './ArchiveRow';
import { ArchiveListSkeleton } from './Skeletons';
import { ApiError, NoDebates, NoResults } from './ErrorStates';
import { useToastActions } from './Toast';

interface ArchiveContentProps {
  initialDebates: DebateListItem[];
  initialTotal: number;
  models: Model[];
}

const PAGE_SIZE = 10;

export default function ArchiveContent({
  initialDebates,
  initialTotal,
  models,
}: ArchiveContentProps) {
  const [debates, setDebates] = useState<DebateListItem[]>(initialDebates);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToastActions();

  // Filters
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Single effect that handles all fetching
  useEffect(() => {
    // Skip initial fetch - we have server-rendered data for page 1 with no filters
    const isInitialState = page === 1 && !selectedModel && !selectedCategory && !dateFrom && !dateTo && retryCount === 0;
    if (isInitialState) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDebates({
          status: 'completed',
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          model_id: selectedModel || undefined,
        });

        if (cancelled) return;

        // Client-side filtering for category and date (ideally these would be API params)
        let filtered = response.debates;

        if (selectedCategory) {
          filtered = filtered.filter(
            (d) => d.topic.category.toLowerCase() === selectedCategory.toLowerCase()
          );
        }

        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          filtered = filtered.filter((d) => {
            const debateDate = new Date(d.completed_at || d.scheduled_at);
            return debateDate >= fromDate;
          });
        }

        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter((d) => {
            const debateDate = new Date(d.completed_at || d.scheduled_at);
            return debateDate <= toDate;
          });
        }

        setDebates(filtered);
        setTotal(response.total);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch debates:', err);
        setError('Failed to load debates. Please try again.');
        toast.error('Failed to load debates');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [page, selectedModel, selectedCategory, dateFrom, dateTo, retryCount, toast]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const handleClearFilters = () => {
    setSelectedModel('');
    setSelectedCategory('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="container-wide py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
        <p className="text-gray-600 mt-1">
          Browse all completed debates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Filters */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <ArchiveFilters
              models={models}
              selectedModel={selectedModel}
              selectedCategory={selectedCategory}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onModelChange={setSelectedModel}
              onCategoryChange={setSelectedCategory}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onClearFilters={handleClearFilters}
            />

            {/* Stats */}
            <div className="card mt-6">
              <div className="card-body text-center">
                <div className="text-3xl font-bold text-gray-900 font-mono">
                  {total}
                </div>
                <div className="text-sm text-gray-500">
                  {total === 1 ? 'Debate' : 'Debates'} Found
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Debate List */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Table Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="w-20 flex-shrink-0">Date</div>
                <div className="flex-1">Topic</div>
                <div className="w-64 flex-shrink-0 hidden md:block text-center">
                  Matchup
                </div>
                <div className="w-24 flex-shrink-0 hidden sm:block text-center">
                  Score
                </div>
                <div className="w-28 flex-shrink-0 hidden lg:block text-center pl-4 border-l border-gray-300">
                  Judge
                </div>
                <div className="w-8 flex-shrink-0"></div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && <ArchiveListSkeleton count={PAGE_SIZE} />}

            {/* Error State */}
            {!isLoading && error && (
              <div className="p-4">
                <ApiError
                  title="Failed to load debates"
                  message={error}
                  onRetry={handleRetry}
                />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && debates.length === 0 && (
              <div className="py-8">
                {selectedModel || selectedCategory || dateFrom || dateTo ? (
                  <NoResults onClear={handleClearFilters} />
                ) : (
                  <NoDebates />
                )}
              </div>
            )}

            {/* Debate Rows */}
            {!isLoading && !error && debates.length > 0 && (
              <div>
                {debates.map((debate) => (
                  <ArchiveRow key={debate.id} debate={debate} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 text-sm rounded-lg ${
                              page === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
