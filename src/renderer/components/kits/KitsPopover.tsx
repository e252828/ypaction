import { CheckIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { i18nService } from '../../services/i18n';
import { kitService } from '../../services/kit';
import { resolveLocalizedText } from '../../services/skill';
import { RootState } from '../../store';
import { setInstalledKits, setMarketplaceKits } from '../../store/slices/kitSlice';
import type { MarketplaceKit } from '../../types/kit';
import Cog6ToothIcon from '../icons/Cog6ToothIcon';
import SearchIcon from '../icons/SearchIcon';
import SidebarKitsIcon from '../icons/SidebarKitsIcon';

interface KitsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKit: (kitId: string) => void;
  onManageKits: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const KitsPopover: React.FC<KitsPopoverProps> = ({
  isOpen,
  onClose,
  onSelectKit,
  onManageKits,
  anchorRef,
}) => {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [maxListHeight, setMaxListHeight] = useState(256);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const installedKits = useSelector((state: RootState) => state.kit.installedKits);
  const marketplaceKits = useSelector((state: RootState) => state.kit.marketplaceKits);
  const activeKitIds = useSelector((state: RootState) => state.kit.activeKitIds);

  // Build display list: only installed kits, with marketplace metadata for display
  const installedKitList: MarketplaceKit[] = Object.keys(installedKits)
    .map(kitId => marketplaceKits.find(mk => mk.id === kitId))
    .filter((k): k is MarketplaceKit => k !== undefined);

  // Filter by search query
  const filteredKits = installedKitList.filter(kit => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = resolveLocalizedText(kit.name).toLowerCase();
    const desc = resolveLocalizedText(kit.description).toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  // Lazy-load data when popover opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [mkKits, installed] = await Promise.all([
          kitService.fetchMarketplaceKits(),
          kitService.getInstalledKits(),
        ]);
        dispatch(setMarketplaceKits(mkKits));
        dispatch(setInstalledKits(installed));
      } catch (error) {
        console.error('[KitsPopover] Failed to load kit data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, dispatch]);

  // Calculate available height and focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      if (anchorRef.current) {
        const anchorRect = anchorRef.current.getBoundingClientRect();
        const availableHeight = anchorRect.top - 120 - 60;
        setMaxListHeight(Math.max(120, Math.min(256, availableHeight)));
      }
      if (searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, anchorRef]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsidePopover = popoverRef.current?.contains(target);
      const isInsideAnchor = anchorRef.current?.contains(target);

      if (!isInsidePopover && !isInsideAnchor) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSelectKit = (kitId: string) => {
    onSelectKit(kitId);
    // Don't close popover to allow multi-selection
  };

  const handleManageKits = () => {
    onManageKits();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border bg-surface shadow-xl z-50"
    >
      {/* Search input */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={i18nService.t('searchKits')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface text-foreground placeholder-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Kits list */}
      <div className="overflow-y-auto py-1" style={{ maxHeight: `${maxListHeight}px` }}>
        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-secondary">
            {i18nService.t('kitLoading')}
          </div>
        ) : filteredKits.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-secondary">
            {i18nService.t('noKitsInstalled')}
          </div>
        ) : (
          filteredKits.map((kit) => {
            const isActive = activeKitIds.includes(kit.id);
            return (
              <button
                key={kit.id}
                onClick={() => handleSelectKit(kit.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-surface-raised'
                    : 'hover:bg-surface-raised'
                }`}
              >
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'bg-surface-raised'
                }`}>
                  <SidebarKitsIcon className={`h-4 w-4 ${isActive ? 'text-foreground' : 'text-secondary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${
                      isActive
                        ? 'text-foreground'
                        : 'text-foreground'
                    }`}>
                      {resolveLocalizedText(kit.name)}
                    </span>
                    {kit.author && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary flex-shrink-0">
                        {i18nService.t('kitOfficial')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary truncate mt-0.5">
                    {resolveLocalizedText(kit.description)}
                  </p>
                </div>
                {isActive && (
                  <CheckIcon className="mt-1 h-4 w-4 flex-shrink-0 text-foreground" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer - Manage Kits */}
      <div className="border-t border-border">
        <button
          onClick={handleManageKits}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-surface-raised transition-colors rounded-b-xl"
        >
          <span>{i18nService.t('manageKits')}</span>
          <Cog6ToothIcon className="h-4 w-4 text-secondary" />
        </button>
      </div>
    </div>
  );
};

export default KitsPopover;
