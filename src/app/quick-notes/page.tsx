'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Plus, Search } from 'lucide-react';

export default function QuickNotesPage() {
  return (
    <AppLayout activePage="quick-notes">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quick Notes</h1>
        <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm">
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Note card examples */}
        <div className="border border-[var(--border-color)] rounded-lg p-4 bg-white dark:bg-[var(--card-background)] hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">Math Formulas</h3>
            <span className="text-xs text-gray-500">5 mins ago</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
            The quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. Use this to solve any quadratic equation in the form ax² + bx + c = 0.
          </p>
          <div className="flex items-center text-xs text-gray-500">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
              Mathematics
            </span>
          </div>
        </div>

        <div className="border border-[var(--border-color)] rounded-lg p-4 bg-white dark:bg-[var(--card-background)] hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">Chemistry Elements</h3>
            <span className="text-xs text-gray-500">Yesterday</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
            Common elements: H (Hydrogen), O (Oxygen), C (Carbon), N (Nitrogen), Ca (Calcium), Fe (Iron), Na (Sodium), K (Potassium)
          </p>
          <div className="flex items-center text-xs text-gray-500">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md">
              Chemistry
            </span>
          </div>
        </div>

        <div className="border border-[var(--border-color)] rounded-lg p-4 bg-white dark:bg-[var(--card-background)] hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">Literary Devices</h3>
            <span className="text-xs text-gray-500">2 days ago</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
            Metaphor: comparison without like/as. Simile: comparison with like/as. Alliteration: repeated consonant sounds. Personification: giving human traits to non-human things.
          </p>
          <div className="flex items-center text-xs text-gray-500">
            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md">
              English
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 