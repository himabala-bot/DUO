'use client';

import React from 'react';
import { User } from 'lucide-react';

export const AVATAR_OPTIONS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
  '/avatars/avatar-7.png',
  '/avatars/avatar-8.png',
  '/avatars/avatar-9.png',
  '/avatars/avatar-10.png',
  '/avatars/avatar-11.png',
  '/avatars/avatar-12.png',
];

export const DEFAULT_AVATAR = '/avatars/avatar-1.png';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-7 h-7 min-w-[1.75rem] min-h-[1.75rem]',
  sm: 'w-9 h-9 min-w-[2.25rem] min-h-[2.25rem]',
  md: 'w-11 h-11 min-w-[2.75rem] min-h-[2.75rem]',
  lg: 'w-16 h-16 min-w-[4rem] min-h-[4rem]',
  xl: 'w-24 h-24 min-w-[6rem] min-h-[6rem]',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  let resolvedSrc = src;

  // If missing or if it's an old legacy emoji character, pick a deterministic avatar from the 12
  if (!resolvedSrc || !resolvedSrc.includes('/')) {
    if (name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const idx = Math.abs(hash) % AVATAR_OPTIONS.length;
      resolvedSrc = AVATAR_OPTIONS[idx];
    } else {
      resolvedSrc = DEFAULT_AVATAR;
    }
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 aspect-square border border-[#EFE8DC] bg-[#FFFFFF] shadow-sm ${SIZE_MAP[size]} ${className}`}
    >
      <img
        src={resolvedSrc}
        alt={name || 'Avatar'}
        className="w-full h-full aspect-square object-cover object-center rounded-full select-none"
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.src = DEFAULT_AVATAR;
        }}
      />
    </div>
  );
};
