import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { i18nService } from '../../services/i18n';
import { resolveLocalizedText } from '../../services/skill';
import { RootState } from '../../store';
import { toggleActiveKit } from '../../store/slices/kitSlice';
import SidebarKitsIcon from '../icons/SidebarKitsIcon';
import XMarkIcon from '../icons/XMarkIcon';

const ActiveKitBadge: React.FC = () => {
  const dispatch = useDispatch();
  const activeKitIds = useSelector((state: RootState) => state.kit.activeKitIds);
  const marketplaceKits = useSelector((state: RootState) => state.kit.marketplaceKits);

  const activeKits = activeKitIds
    .map(id => marketplaceKits.find(k => k.id === id))
    .filter((k): k is NonNullable<typeof k> => k !== undefined);

  if (activeKits.length === 0) return null;

  const handleRemoveKit = (e: React.MouseEvent, kitId: string) => {
    e.stopPropagation();
    dispatch(toggleActiveKit(kitId));
  };

  return (
    <>
      {activeKits.map(kit => (
        <button
          type="button"
          key={kit.id}
          onClick={(e) => handleRemoveKit(e, kit.id)}
          className="group inline-flex h-7 max-w-[240px] items-center gap-1.5 rounded-md bg-surface-raised px-2.5 text-[13px] font-normal leading-none text-foreground transition-all hover:bg-gray-200 dark:hover:bg-gray-700 hover:ring-1 hover:ring-border"
          title={i18nService.t('clearKit')}
        >
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors group-hover:bg-gray-300 dark:group-hover:bg-gray-600">
            <SidebarKitsIcon className="h-3.5 w-3.5 text-secondary transition-opacity group-hover:opacity-0" />
            <XMarkIcon className="absolute h-3 w-3 text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          <span className="min-w-0 truncate">
            {resolveLocalizedText(kit.name)}
          </span>
        </button>
      ))}
    </>
  );
};

export default ActiveKitBadge;
