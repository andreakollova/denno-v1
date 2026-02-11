import React, { useState, useEffect, useRef } from 'react';
import { AVAILABLE_TOPICS, PERSONA_UI_DATA } from '../constants';
import { getSelectedTopicIds, saveSelectedTopicIds, getUserProfile, setPersona, saveUserProfile, toggleTheme, exportUserData, importUserData, hardResetApp } from '../services/storageService';
import { CheckIcon, UserIcon, SparklesIcon, MapPinIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon, XIcon, MoonIcon, SunIcon, BellIcon, CloudIcon, MoreHorizontalIcon } from '../components/Icons';
import { PersonaType, NotificationFrequency } from '../types';
import { requestNotificationPermission, isNotificationSupported, getNotificationPermission } from '../services/notificationService';
import LegalModal, { LegalMode } from '../components/LegalModal';

interface SettingsPageProps {
  onFinish?: () => void;
  onThemeChange?: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Slovensko': '🇸🇰',
  'Veda a budúcnosť': '🧬',
  'Šport a zábava': '⚽',
  'AI a tech core': '🤖',
  'Biznis a práca': '💼',
  'Spoločnosť': '🌍',
  'Lifestyle': '🧘'
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onFinish, onThemeChange }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPersona, setCurrentPersona] = useState<PersonaType>(PersonaType.DEFAULT);
  const [city, setCity] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isTopExpanded, setIsTopExpanded] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notificationFreq, setNotificationFreq] = useState<NotificationFrequency>(NotificationFrequency.DAILY);
  const [notificationPerm, setNotificationPerm] = useState(getNotificationPermission());
  
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [legalMode, setLegalMode] = useState<LegalMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const profile = getUserProfile();
    setSelectedIds(getSelectedTopicIds());
    setCurrentPersona(profile.selectedPersona);
    setCity(profile.city || '');
    setTheme(profile.theme);
    setNotificationFreq(profile.notificationFrequency || NotificationFrequency.DAILY);
    setExpandedCategories([]); 
  }, []);

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setTheme(newTheme);
    if (onThemeChange) onThemeChange();
  };

  // ZMENA: Striktne povolený len JEDEN výber súčasne
  const toggleTopic = (id: string) => {
    const newIds = [id];
    setSelectedIds(newIds);
    saveSelectedTopicIds(newIds);
  };

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPersona = e.target.value as PersonaType;
    setCurrentPersona(newPersona);
    setPersona(newPersona);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCity = e.target.value;
    setCity(newCity);
    const profile = getUserProfile();
    saveUserProfile({ ...profile, city: newCity });
  };
  
  const handleNotificationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const freq = e.target.value as NotificationFrequency;
    if (freq !== NotificationFrequency.OFF) {
       if (!isNotificationSupported()) {
          alert('Váš prehliadač nepodporuje notifikácie.');
          return;
       }
       if (getNotificationPermission() !== 'granted') {
          const granted = await requestNotificationPermission();
          setNotificationPerm(getNotificationPermission());
          if (!granted) {
             alert('Notifikácie sú zakázané v systéme.');
             return;
          }
       }
    }
    setNotificationFreq(freq);
    const profile = getUserProfile();
    saveUserProfile({ ...profile, notificationFrequency: freq });
  };

  const handleHardReset = () => {
      if (confirm('POZOR: Toto vymaže všetky vaše dáta. Pokračovať?')) {
          hardResetApp();
      }
  };

  const handleExportData = () => {
     const dataStr = exportUserData();
     const blob = new Blob([dataStr], { type: "application/json" });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.href = url;
     link.download = `ai_digest_backup_${new Date().toISOString().split('T')[0]}.json`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
              const success = importUserData(content);
              if (success) {
                  alert('Dáta obnovené.');
                  window.location.reload();
              }
          }
      };
      reader.readAsText(file);
  };

  const toggleCategory = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const groupedTopics = AVAILABLE_TOPICS.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_TOPICS>);

  const topTopicIds = ['slovakia_domestic', 'new_ai_models', 'science', 'sports_marketing', 'politics', 'renewable_energy', 'f1_motorsport'];
  const topTopics = AVAILABLE_TOPICS.filter(t => topTopicIds.includes(t.id));

  return (
    <div className="px-6 py-8 pb-32 animate-in fade-in">
      <header className="mb-6 flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Nastavenia</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm">Vyber si presne JEDNU tému.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleToggleTheme} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-500 dark:text-slate-400 shadow-sm">
                {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowProfileModal(true)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-500 dark:text-slate-400 shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </button>
        </div>
      </header>

      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kategórie správ</h2>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
            {selectedIds.length === 0 ? 'Žiadny výber' : '1 téma'}
          </span>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden mb-6">
            <button onClick={() => setIsTopExpanded(!isTopExpanded)} className="w-full px-5 py-4 bg-gradient-to-r from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-indigo-50 dark:border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-2"><span className="text-lg">🔥</span><h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">TOP Výber</h3></div>
               <div className="text-indigo-300 dark:text-slate-500">{isTopExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}</div>
            </button>
            {isTopExpanded && (
              <div className="p-5 grid grid-cols-1 gap-3 animate-in slide-in-from-top-2">
                 {topTopics.map((topic) => {
                    const isSelected = selectedIds.includes(topic.id);
                    return (
                      <button key={topic.id} onClick={() => toggleTopic(topic.id)} className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${isSelected ? 'bg-[#6466f1] border-[#6466f1] text-white shadow-lg' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}>
                        <span className="text-sm font-bold">{topic.name}</span>
                        {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                      </button>
                    );
                 })}
              </div>
            )}
          </div>

          {Object.entries(groupedTopics).map(([category, topics]) => {
            const isExpanded = expandedCategories.includes(category);
            const selectedCount = topics.filter(t => selectedIds.includes(t.id)).length;
            const emoji = CATEGORY_EMOJIS[category] || '📂';
            return (
              <div key={category} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                     <span className="text-lg">{emoji}</span>
                     <span className={`text-sm font-bold ${selectedCount > 0 ? 'text-[#6466f1] dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{category}</span>
                  </div>
                  <div className="text-slate-400">{isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}</div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2">
                    <div className="h-px bg-slate-50 dark:bg-slate-800 mb-4"></div>
                    <div className="grid grid-cols-1 gap-3">
                      {topics.map((topic) => {
                        const isSelected = selectedIds.includes(topic.id);
                        return (
                          <button key={topic.id} onClick={() => toggleTopic(topic.id)} className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
                            <span className={`text-sm font-bold ${isSelected ? 'text-[#6466f1] dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>{topic.name}</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-[#6466f1]' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>{isSelected && <CheckIcon className="w-4 h-4 text-white" />}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {selectedIds.length > 0 && onFinish && (
        <div className="fixed bottom-[calc(112px+env(safe-area-inset-bottom))] left-0 right-0 px-6 z-40 animate-in slide-in-from-bottom-4 flex justify-center">
            <div className="w-full max-w-md">
              <button onClick={onFinish} className="w-full bg-[#6466f1] text-white font-bold py-5 px-6 rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 transform active:scale-95 transition-all">
                <SparklesIcon className="w-5 h-5 text-indigo-100" />
                <span>Generovať prehľad</span>
              </button>
            </div>
        </div>
      )}

      {showProfileModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 no-scrollbar">
               <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-20">
                  <h3 className="font-bold text-slate-900 dark:text-white">Profil</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><MoreHorizontalIcon className="w-5 h-5" /></button>
                    {showMoreMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden z-30">
                            <button onClick={() => { setLegalMode('terms'); setShowMoreMenu(false); }} className="block w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Podmienky (EULA)</button>
                            <button onClick={() => { setLegalMode('privacy'); setShowMoreMenu(false); }} className="block w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Súkromie</button>
                            <button onClick={() => { setLegalMode('support'); setShowMoreMenu(false); }} className="block w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Podpora</button>
                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                            <button onClick={() => { setShowMoreMenu(false); handleHardReset(); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50">Vymazať dáta</button>
                        </div>
                    )}
                    <button onClick={() => setShowProfileModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><XIcon className="w-5 h-5" /></button>
                  </div>
               </div>
               <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5 text-[#6466f1]" />MOJA LOKALITA</label>
                    <input type="text" value={city} onChange={handleCityChange} placeholder="napr. Bratislava" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-3 text-sm text-slate-900 dark:text-white outline-none" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"><BellIcon className="w-3.5 h-3.5 text-[#6466f1]" />NOTIFIKÁCIE</label>
                     <select value={notificationFreq} onChange={handleNotificationChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-3 text-sm outline-none appearance-none" >
                       <option value={NotificationFrequency.OFF}>Vypnuté</option>
                       <option value={NotificationFrequency.DAILY}>Denne (Ráno)</option>
                       <option value={NotificationFrequency.EVERY_OTHER}>Každý druhý deň</option>
                       <option value={NotificationFrequency.THREE_TIMES_DAY}>3x denne</option>
                       <option value={NotificationFrequency.WEEKLY}>Týždenne</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-[#6466f1]" />MÓD ČÍTANIA</label>
                     <select value={currentPersona} onChange={handlePersonaChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-3 text-sm outline-none appearance-none" >
                        {Object.entries(PERSONA_UI_DATA).map(([key, data]) => (<option key={key} value={key}>{data.label}</option>))}
                     </select>
                     <p className="mt-1.5 text-[10px] text-slate-400 leading-tight">{PERSONA_UI_DATA[currentPersona]?.description}</p>
                  </div>
                  <div className="pt-2">
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5"><CloudIcon className="w-3.5 h-3.5 text-[#6466f1]" />SPRÁVA DÁT</label>
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleExportData} className="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">Export</button>
                        <button onClick={handleImportClick} className="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">Import</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
      {legalMode && (<LegalModal mode={legalMode} onClose={() => setLegalMode(null)} />)}
    </div>
  );
};

export default SettingsPage;