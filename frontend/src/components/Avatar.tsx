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
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
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
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-[#EFE8DC] bg-[#FAF7F2] shadow-sm ${SIZE_MAP[size]} ${className}`}
    >
      <img
        src={resolvedSrc}
        alt={name || 'Avatar'}
        className="w-full h-full object-cover rounded-full select-none"
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.src = DEFAULT_AVATAR;
        }}
      />
    </div>
  );
};
