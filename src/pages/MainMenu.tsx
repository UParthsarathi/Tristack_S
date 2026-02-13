import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Globe, LogOut, Edit2, Check, ChevronLeft } from 'lucide-react';
import { signOut } from '../../services/supabase';

interface MainMenuProps {
  displayName: string;
  isGuest: boolean;
  onUpdateName: (name: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ displayName, isGuest, onUpdateName }) => {
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName);
  const [showMultiplayerSelection, setShowMultiplayerSelection] = useState(false);

  useEffect(() => {
    setTempName(displayName);
  }, [displayName]);

  const saveCustomName = () => {
    if (tempName.trim()) {
      onUpdateName(tempName);
      setIsEditingName(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#1a2e1a] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] opacity-40 pointer-events-none" />
      
      <h1 className="font-serif text-4xl md:text-7xl font-bold text-yellow-500 mb-8 drop-shadow-2xl z-10 text-center">TRI-STACK</h1>
      
      {/* Profile Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-sm bg-black/40 p-2 pl-3 rounded-full backdrop-blur z-50 border border-white/5 shadow-lg">
        {isEditingName ? (
          <div className="flex items-center gap-1">
             <input 
               autoFocus
               className="bg-transparent text-white border-b border-yellow-500 px-1 py-0.5 text-xs w-20 outline-none"
               value={tempName}
               placeholder="Name"
               onChange={(e) => setTempName(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') saveCustomName(); }}
             />
             <button onClick={saveCustomName} className="text-green-400 hover:text-green-300 p-1">
                <Check size={14} />
             </button>
          </div>
        ) : (
          <button onClick={() => setIsEditingName(true)} className="flex items-center gap-2 group">
             <span className="text-gray-200 font-bold max-w-[100px] truncate">{displayName}</span>
             <Edit2 size={12} className="text-gray-500 group-hover:text-yellow-500" />
          </button>
        )}

        {!isGuest && (
            <button onClick={signOut} className="ml-2 bg-red-500/10 p-1.5 rounded-full text-red-400 hover:text-white hover:bg-red-500 transition-all">
                <LogOut size={14} />
            </button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/60 p-6 md:p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl flex flex-col gap-4 w-full max-w-md z-10 animate-in fade-in zoom-in duration-300">
         
         {!showMultiplayerSelection ? (
           <>
              <button onClick={() => navigate('/setup/single')} className="group bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white p-5 rounded-2xl font-bold text-lg flex items-center gap-4 transition-all shadow-lg active:scale-95">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><User size={20} /></div>
                <div className="text-left flex-1">
                    <div className="leading-tight">Single Player</div>
                    <div className="text-xs text-blue-200 font-normal opacity-80">vs Bots</div>
                </div>
              </button>

              <button onClick={() => setShowMultiplayerSelection(true)} className="group bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white p-5 rounded-2xl font-bold text-lg flex items-center gap-4 transition-all shadow-lg active:scale-95">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={20} /></div>
                <div className="text-left flex-1">
                    <div className="leading-tight">Local Multiplayer</div>
                    <div className="text-xs text-green-200 font-normal opacity-80">Pass & Play</div>
                </div>
              </button>

              <button onClick={() => navigate('/setup/online')} className="group bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white p-5 rounded-2xl font-bold text-lg flex items-center gap-4 transition-all shadow-lg active:scale-95">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Globe size={20} /></div>
                <div className="text-left flex-1">
                    <div className="leading-tight">Online Multiplayer</div>
                    <div className="text-xs text-purple-200 font-normal opacity-80">Remote Play</div>
                </div>
              </button>
           </>
         ) : (
           <>
             <button onClick={() => setShowMultiplayerSelection(false)} className="self-start text-gray-400 hover:text-white flex items-center gap-1 mb-2 text-sm font-bold"><ChevronLeft size={16} /> BACK</button>
             <h2 className="text-white text-xl text-center mb-4 font-bold">Select Player Count</h2>
             <div className="grid grid-cols-3 gap-3">
               {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                 <button key={count} onClick={() => navigate(`/setup/multi/${count}`)} className="bg-slate-800 hover:bg-green-600 text-white py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all shadow-md active:scale-95 border border-white/5">
                   <Users size={16} className="mb-1 opacity-50" />
                   {count}
                 </button>
               ))}
             </div>
           </>
         )}
      </div>
      
      <div className="mt-8 text-[10px] text-gray-500 font-mono">v3.0 MOBILE</div>
    </div>
  );
};

export default MainMenu;