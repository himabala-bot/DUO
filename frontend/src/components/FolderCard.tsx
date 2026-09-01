'use client';

import React from 'react';
import { FileText, Mic, Camera, PenTool } from 'lucide-react';
import { LittleNote } from '@/types';

interface FolderCardProps {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  gradient: string;
  latestNote?: LittleNote | null;
  onClick?: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  id,
  title,
  subtitle,
  count,
  gradient,
  latestNote,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between w-full h-[225px] sm:h-[235px] rounded-[28px] overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 ease-out transform hover:-translate-y-1 bg-[#242424] select-none"
      title={`Open ${title}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          INNER STROKE OUTLINE (Bold black stroke towards inside)
      ───────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] border-[3.5px] border-[#1C1C1E] z-30" />

      {/* ─────────────────────────────────────────────────────────────
          TOP SECTION: Soft Visual Color Preview with 3 Tilting Papers (Top 48%)
      ───────────────────────────────────────────────────────────── */}
      <div className={`relative h-[48%] w-full bg-gradient-to-br ${gradient} overflow-hidden flex items-end justify-center pb-0.5 transition-transform duration-200 group-hover:scale-[1.02]`}>
        {/* Paper 1: Left Tilting Sheet */}
        <div className="absolute bottom-1 left-[14%] w-[70px] sm:w-[78px] h-[64px] rounded-md bg-white/95 p-1.5 shadow-xs origin-bottom transition-transform duration-200 ease-out transform -rotate-[6deg] translate-y-1 group-hover:-rotate-[14deg] group-hover:-translate-x-1">
          <div className="w-6 h-0.5 bg-neutral-300 rounded-full mb-1" />
          <div className="w-full h-0.5 bg-neutral-200 rounded-full mb-0.5" />
          <div className="w-4/5 h-0.5 bg-neutral-200 rounded-full mb-0.5" />
          <div className="w-3/5 h-0.5 bg-neutral-200 rounded-full" />
        </div>

        {/* Paper 2: Center Elevated Sheet (With Live Preview if Available) */}
        <div className="relative z-10 w-[78px] sm:w-[88px] h-[72px] rounded-md bg-white p-1.5 shadow-md origin-bottom transition-transform duration-200 ease-out transform group-hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden">
          {latestNote ? (
            <>
              {id === 'PHOTO' && latestNote.media_url ? (
                <img src={latestNote.media_url} className="w-full h-full object-cover rounded-sm" alt="" />
              ) : id === 'DRAWING' && latestNote.media_url ? (
                <img src={latestNote.media_url} className="w-full h-full object-contain rounded-sm" alt="" />
              ) : id === 'VOICE' ? (
                <div className="h-full flex flex-col justify-center items-center gap-0.5 p-0.5">
                  <div className="p-1 rounded-full bg-[#C3A982]/20 text-[#A88E67]">
                    <Mic className="h-3 w-3" />
                  </div>
                  <span className="text-[7.5px] font-mono text-neutral-600 font-medium">Voice Note</span>
                </div>
              ) : (
                <div className="p-0.5">
                  <p className="text-[7.5px] font-medium text-neutral-700 leading-tight line-clamp-3">
                    {latestNote.content}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-0.5 space-y-0.5 pt-0.5">
              <div className="w-8 h-0.5 bg-neutral-300 rounded-full mb-1" />
              <div className="w-full h-0.5 bg-neutral-200 rounded-full" />
              <div className="w-5/6 h-0.5 bg-neutral-200 rounded-full" />
              <div className="w-4/6 h-0.5 bg-neutral-200 rounded-full" />
            </div>
          )}
        </div>

        {/* Paper 3: Right Tilting Sheet */}
        <div className="absolute bottom-1 right-[14%] w-[70px] sm:w-[78px] h-[64px] rounded-md bg-white/95 p-1.5 shadow-xs origin-bottom transition-transform duration-200 ease-out transform rotate-[6deg] translate-y-1 group-hover:rotate-[14deg] group-hover:translate-x-1">
          <div className="w-6 h-0.5 bg-neutral-300 rounded-full mb-1" />
          <div className="w-full h-0.5 bg-neutral-200 rounded-full mb-0.5" />
          <div className="w-4/5 h-0.5 bg-neutral-200 rounded-full mb-0.5" />
          <div className="w-3/5 h-0.5 bg-neutral-200 rounded-full" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM SECTION: Dark Charcoal (#242424) Folder Tab Panel
          Using intentional CSS clip-path to form an authentic folder tab
      ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          clipPath: 'polygon(0 0, 48% 0, 56% 14px, 100% 14px, 100% 100%, 0 100%)',
        }}
        className="absolute left-0 right-0 bottom-0 h-[58%] bg-[#242424] rounded-b-[28px] p-4 pt-2.5 flex flex-col justify-between text-white z-20"
      >
        {/* Top Tab Row: Title, Subtitle on the left tab, 3-dot menu on the right shelf */}
        <div className="flex items-start justify-between">
          <div className="max-w-[80%]">
            <h4 className="text-xs sm:text-sm font-medium text-white tracking-tight leading-snug">
              {title}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-[#9E9E9E] font-normal mt-0.5">
              {subtitle}
            </p>
          </div>

          <div className="flex h-5 w-5 items-center justify-center text-[#9E9E9E] group-hover:text-white transition-colors pt-2.5">
            <span className="tracking-widest font-bold text-xs">•••</span>
          </div>
        </div>

        {/* Bottom Footer: Document Icon + Item Count */}
        <div className="flex items-center space-x-1.5 text-[11px] text-[#9E9E9E] font-sans font-medium">
          <FileText className="h-3 w-3 opacity-80" />
          <span>{count.toLocaleString()} {count === 1 ? 'File' : 'Files'}</span>
        </div>
      </div>
    </div>
  );
};
