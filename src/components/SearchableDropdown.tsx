/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Trash2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  isCustom?: boolean;
  trackId?: string;
}

export interface DropdownGroup {
  label: string;
  options: DropdownOption[];
}

interface SearchableDropdownProps {
  id: string;
  value: string;
  groups: DropdownGroup[];
  onChange: (value: string) => void;
  onDeleteItem?: (trackId: string, event: React.MouseEvent) => void;
  placeholder?: string;
}

export default function SearchableDropdown({
  id,
  value,
  groups,
  onChange,
  onDeleteItem,
  placeholder = "Select option..."
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute selected option info
  const allOptions = groups.flatMap(g => g.options);
  const selectedOption = allOptions.find(o => o.value === value) || allOptions[0];

  // Filter based on search query
  const filteredGroups = groups.map(group => {
    const matchedOptions = group.options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (option.description && option.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return {
      ...group,
      options: matchedOptions
    };
  }).filter(group => group.options.length > 0);

  return (
    <div ref={dropdownRef} className="relative w-full text-stone-900 font-sans" id={`custom-dropdown-${id}`}>
      
      {/* Hidden real SELECT input to persist IDs and respond to automated selector tests */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        {groups.map((group, gIdx) => (
          <optgroup key={gIdx} label={group.label}>
            {group.options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Styled Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className="w-full bg-white border border-gray-200 hover:border-neutral-400 px-3.5 py-3 rounded-xl flex items-center justify-between text-left cursor-pointer transition-all duration-200 outline-none focus:ring-1 focus:ring-black shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.isCustom && <Music className="h-3.5 w-3.5 text-neutral-600 shrink-0" />}
              <span className="text-xs font-semibold">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Options Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[320px]"
            role="listbox"
          >
            {/* Embedded Search Box */}
            <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-neutral-50/50">
              <Search className="h-3.5 w-3.5 text-stone-400 shrink-0 ml-1" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matching sound profiles..."
                className="w-full bg-transparent border-none text-xs outline-none py-1 text-black font-medium placeholder-gray-400"
                autoFocus
              />
            </div>

            {/* Scrollable Sound Options List (Choosing ease / Scroll type container) */}
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 flex-1 max-h-60" style={{ scrollbarWidth: 'thin' }}>
              {filteredGroups.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 font-mono">
                  NO CHIME PROFILES MATCHED
                </div>
              ) : (
                filteredGroups.map((group, gIdx) => (
                  <div key={gIdx} className="border-b border-gray-50 last:border-b-0 py-1">
                    {/* Header group identifier */}
                    <div className="px-3 py-1 text-[8.5px] font-bold text-gray-400 font-mono tracking-wider uppercase select-none">
                      {group.label}
                    </div>

                    <div className="space-y-0.5 px-1">
                      {group.options.map((option) => {
                        const isItemSelected = value === option.value;
                        return (
                          <div
                            key={option.value}
                            onClick={() => {
                              onChange(option.value);
                              setIsOpen(false);
                            }}
                            className={`group/item flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                              isItemSelected 
                                ? 'bg-neutral-900 text-white' 
                                : 'hover:bg-neutral-100 text-stone-800'
                            }`}
                            role="option"
                            aria-selected={isItemSelected}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-xs font-semibold truncate">
                                {option.label}
                              </div>
                              {option.description && (
                                <div className={`text-[10px] truncate mt-0.5 ${
                                  isItemSelected ? 'text-neutral-300' : 'text-stone-400'
                                }`}>
                                  {option.description}
                                </div>
                              )}
                            </div>

                            {/* Actions area inside custom options list */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Direct deletion action within list */}
                              {option.isCustom && option.trackId && onDeleteItem && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteItem(option.trackId!, e);
                                  }}
                                  className={`p-1 rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-neutral-200 hover:text-red-600 ${
                                    isItemSelected ? 'text-stone-300 hover:bg-neutral-800 hover:text-red-300' : 'text-stone-400'
                                  }`}
                                  title="Delete custom uploaded sound"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {isItemSelected && (
                                <Check className={`h-4 w-4 shrink-0 ${isItemSelected ? 'text-white' : 'text-black'}`} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
