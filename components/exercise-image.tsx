'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

type Props = { name: string; url: string | null; className?: string; compact?: boolean };

export function ExerciseImage({ name, url, className = '', compact = false }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const available = Boolean(url && /^https:\/\//i.test(url) && failedUrl !== url);

  return (
    <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-white ${className}`}>
      {available ? (
        <Image
          key={url}
          src={url!}
          alt={`${name} exercise demonstration`}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className={compact ? "object-contain p-1" : "object-contain p-3"}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#e9ede2] text-[#6f7f5d]">
          <Dumbbell size={compact ? 22 : 38} strokeWidth={1.2} aria-hidden="true" />
          {!compact && <p className="text-xs">Image not available</p>}
        </div>
      )}
    </div>
  );
}
