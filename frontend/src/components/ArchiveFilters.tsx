'use client';

import { Model } from '@/lib/api';

interface ArchiveFiltersProps {
  models: Model[];
  selectedModel: string;
  selectedCategory: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  onModelChange: (modelId: string) => void;
  onCategoryChange: (category: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

const CATEGORIES = [
  'Ethics',
  'Technology',
  'Philosophy',
  'Politics',
  'Society',
  'Science',
  'Economics',
];

export default function ArchiveFilters({
  models,
  selectedModel,
  selectedCategory,
  dateFrom,
  dateTo,
  searchQuery,
  onModelChange,
  onCategoryChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onClearFilters,
}: ArchiveFiltersProps) {
  const hasFilters = selectedModel || selectedCategory || dateFrom || dateTo || searchQuery;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="card-body space-y-4">
        {/* Search */}
        <div>
          <label
            htmlFor="search-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Search
          </label>
          <input
            type="text"
            id="search-filter"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search topics..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>

        {/* Model Filter */}
        <div>
          <label
            htmlFor="model-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Model
          </label>
          <select
            id="model-filter"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">All models</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label
            htmlFor="category-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="space-y-2">
            <div>
              <label htmlFor="date-from" className="sr-only">
                From
              </label>
              <input
                type="date"
                id="date-from"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="From"
              />
            </div>
            <div>
              <label htmlFor="date-to" className="sr-only">
                To
              </label>
              <input
                type="date"
                id="date-to"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasFilters && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Active filters:</p>
            <div className="flex flex-wrap gap-1">
              {selectedModel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                  {models.find((m) => m.id === selectedModel)?.name || 'Model'}
                  <button
                    onClick={() => onModelChange('')}
                    className="hover:text-primary-900"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                  {selectedCategory}
                  <button
                    onClick={() => onCategoryChange('')}
                    className="hover:text-primary-900"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                  {dateFrom && dateTo
                    ? `${dateFrom} - ${dateTo}`
                    : dateFrom
                    ? `From ${dateFrom}`
                    : `Until ${dateTo}`}
                  <button
                    onClick={() => {
                      onDateFromChange('');
                      onDateToChange('');
                    }}
                    className="hover:text-primary-900"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                  &quot;{searchQuery}&quot;
                  <button
                    onClick={() => onSearchChange('')}
                    className="hover:text-primary-900"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
