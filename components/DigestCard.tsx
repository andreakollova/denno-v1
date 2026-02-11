
import React from 'react';
import { DigestSection } from '../types';
import { ChatIcon, BookmarkIcon, BookmarkSolidIcon, ExternalLinkIcon, SendIcon } from './Icons';
import { CATEGORY_EMOJIS, getCategoryForTags } from '../constants';

interface DigestCardProps {
  section: DigestSection;
  index: number;
  onAskMore?: (section: DigestSection) => void;
  onTagClick?: (tag: string) => void;
  onToggleSave?: (section: DigestSection) => void;
  isSaved?: boolean;
  className?: string;
}

const DigestCard: React.FC<DigestCardProps> = ({ section, index, onAskMore, onTagClick, onToggleSave, isSaved, className = "mb-6" }) => {
  
  const getDomain = (url?: string) => {
    if (!url) return '';
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'zdroj';
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: section.title,
          text: `Zaujímavá správa z AI Denno: ${section.title}\n\n${section.whatIsNew}`,
          url: section.sourceLink || window.location.href,
        });
      } catch (err) {
        console.warn('Share failed', err);
      }
    }
  };

  const categoryName = getCategoryForTags(section.tags);
  const categoryEmoji = CATEGORY_EMOJIS[categoryName] || '🔹';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-md group ${className}`}>
      
      <div className="relative h-12 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between px-5">
          <div className="flex items-center gap-2 pr-4 overflow-hidden">
             <div className="flex-shrink-0 w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm shadow-sm">
                {categoryEmoji}
             </div>
             <div className="flex flex-wrap gap-2 truncate">
                {section.tags.map((tag, i) => (
                  <button 
                    key={i} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick && onTagClick(tag);
                    }}
                    className="px-2 py-0.5 bg-transparent text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wide rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#6466f1] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave && onToggleSave(section);
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isSaved ? 'text-[#6466f1] bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
             >
               {isSaved ? <BookmarkSolidIcon className="w-4 h-4" /> : <BookmarkIcon className="w-4 h-4" />}
             </button>
             
             <button 
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
             >
                <SendIcon className="w-3.5 h-3.5" />
             </button>
          </div>
      </div>

      <div className="px-5 py-5 space-y-5">
         <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {section.title}
         </h2>

         <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-4">
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Čo je nové</span>
               </div>
               <p className="pl-4 border-l-2 border-emerald-50 dark:border-emerald-900/30">{section.whatIsNew}</p>
            </div>
            {section.whatChanged && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></span>
                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Súvislosti</span>
                </div>
                <p className="pl-4 border-l-2 border-orange-50 dark:border-orange-900/30">{section.whatChanged}</p>
              </div>
            )}
         </div>

         <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Kľúčové body</span>
            <ul className="space-y-2">
               {section.keyPoints?.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                     <span className="text-indigo-400 dark:text-indigo-500 font-bold mt-0.5">•</span>
                     <span className="leading-snug">{point}</span>
                  </li>
               ))}
            </ul>
         </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-between items-center">
         <div className="flex items-center gap-3">
            {section.sourceLink && (
               <a 
                 href={section.sourceLink}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#6466f1] transition-colors"
               >
                  <ExternalLinkIcon className="w-3 h-3" />
                  {getDomain(section.sourceLink)}
               </a>
            )}
         </div>
         
         {onAskMore && (
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onAskMore(section);
             }}
             className="flex items-center gap-1.5 text-xs font-bold text-[#6466f1] bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
           >
              <ChatIcon className="w-3.5 h-3.5" />
              Opýtať sa
           </button>
         )}
      </div>
    </div>
  );
};

export default DigestCard;
