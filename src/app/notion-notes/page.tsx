'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon, Table, Undo, Redo, Plus } from 'lucide-react';

export default function NotionNotesPage() {
  return (
    <AppLayout activePage="notion-notes">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notion-style Notes</h1>
        <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm">
          <Plus size={16} />
          <span>New Page</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar - Page tree */}
        <div className="w-64 border-r border-[var(--border-color)] pr-4 min-h-[calc(100vh-180px)]">
          <div className="text-sm font-medium mb-2">Pages</div>
          <div className="space-y-1">
            <div className="py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium">
              Chemistry Notes
            </div>
            <div className="py-1 px-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
              Math Notes
            </div>
            <div className="py-1 px-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
              English Literature
            </div>
            <div className="py-1 px-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-1 text-blue-500">
              <Plus size={14} />
              <span>Add a page</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="border border-[var(--border-color)] rounded-md p-1 mb-4 flex items-center gap-1 bg-white dark:bg-[var(--card-background)]">
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Bold size={16} />
            </button>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Italic size={16} />
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <List size={16} />
            </button>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <ListOrdered size={16} />
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <ImageIcon size={16} />
            </button>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Table size={16} />
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Undo size={16} />
            </button>
            <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Redo size={16} />
            </button>
          </div>

          {/* Note content */}
          <div className="border border-[var(--border-color)] rounded-lg p-6 bg-white dark:bg-[var(--card-background)]">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Untitled"
                className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none"
                defaultValue="Chemistry Notes"
              />
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              <h2>Chemical Bonding</h2>
              <p>
                Chemical bonding is the process where atoms are connected together through the sharing, transfer, or pooling of electrons. The main types of chemical bonds are:
              </p>

              <h3>Ionic Bonding</h3>
              <p>
                Ionic bonding is a type of chemical bonding that involves the electrostatic attraction between oppositely charged ions. It occurs when valence electrons are transferred from one atom to another.
              </p>
              <ul>
                <li>Usually occurs between a metal and a non-metal</li>
                <li>Formed by the complete transfer of electrons</li>
                <li>Results in the formation of charged ions</li>
                <li>Example: NaCl (table salt)</li>
              </ul>

              <h3>Covalent Bonding</h3>
              <p>
                Covalent bonding is a form of chemical bonding that is characterized by the sharing of electrons to form electron pairs between atoms.
              </p>
              <ul>
                <li>Usually occurs between non-metals</li>
                <li>Formed by sharing of electrons</li>
                <li>Can be single, double, or triple bonds</li>
                <li>Example: H₂O (water), O₂ (oxygen gas)</li>
              </ul>

              <h3>Metallic Bonding</h3>
              <p>
                Metallic bonding is a type of chemical bonding that occurs in metals and explains many of their properties.
              </p>
              <ul>
                <li>Occurs between metal atoms</li>
                <li>Delocalized electrons form an "electron sea"</li>
                <li>Explains properties like conductivity and malleability</li>
                <li>Example: Cu (copper), Fe (iron)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 