import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import Auth from './components/Auth';
import MainMenu from './src/pages/MainMenu';
import { SetupSingle, SetupMulti, SetupOnline } from './src/pages/Setup';
import Lobby from './src/pages/Lobby';
import Game from './src/pages/Game';
import { useGameStore } from './src/store/gameStore';
import { RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { getRoomData } from './services/online';
import { GameMode } from './types';

const SESSION_KEY = 'TRI_STACK_SESSION';
const NAME_KEY = 'TRI_STACK_PLAYER_NAME';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Persistent Name
  const [customDisplayName, setCustomDisplayName] = useState('');
  
  // Store actions
  const setRoomCode = useGameStore(s => s.setRoomCode);
  const setGameState = useGameStore(s => s.setGameState);
  
  // Who am I online?
  const [myOnlineId, setMyOnlineId] = useState<number | null>(null);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    console.log("App.tsx: Mounted.");

    // 1. Force Entry Timer: If anything hangs for more than 2s, enable the bypass button
    const manualEntryTimer = setTimeout(() => {
        if (mountedRef.current) {
            console.warn("App.tsx: Slow loading detected, enabling manual entry.");
            setShowManualEntry(true);
        }
    }, 2000);

    // 2. Safety Timeout: If auth hangs for 3.5s, just finish loading so the app is usable
    const safetyTimeout = setTimeout(() => {
        if (mountedRef.current) {
            console.warn("App.tsx: Auth timed out. Forcing app start.");
            setAuthLoading(false);
        }
    }, 3500);

    // 3. Initialize Auth
    const initAuth = async () => {
        try {
            console.log("App.tsx: Checking Supabase session...");
            // Use Promise.race to prevent getSession from hanging forever
            const getSessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000));
            
            const result: any = await Promise.race([getSessionPromise, timeoutPromise]);
            const { data, error } = result;

            if (error) {
                console.warn("App.tsx: Supabase session error (offline?)", error);
            }
            
            if (mountedRef.current) {
                setSession(data?.session || null);
                // Auth check done, check for game reconnection next
                await checkReconnection(data?.session);
            }
        } catch (err) {
            console.error("App.tsx: Critical Auth Failure or Timeout", err);
        } finally {
            if (mountedRef.current) setAuthLoading(false);
        }
    };

    // 4. Reconnection Logic
    const checkReconnection = async (currentSession: any) => {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
             console.log("App.tsx: Found saved game session.");
             try {
                const { code, playerId } = JSON.parse(savedSession);
                // Attempt restore with short timeout
                const { data } = await getRoomData(code);
                if (data) {
                    setRoomCode(code);
                    setMyOnlineId(playerId);
                    setIsGuest(true);
                    if (data.game_state) {
                        const effectiveMode = (playerId === 0 ? 'ONLINE_HOST' : 'ONLINE_CLIENT') as GameMode;
                        setGameState({ ...data.game_state, gameMode: effectiveMode });
                    }
                }
             } catch (e) {
                 console.warn("App.tsx: Reconnection failed", e);
             }
        }
    };

    initAuth();

    // Listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if(mountedRef.current) setSession(session);
    });

    // Load saved name
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) setCustomDisplayName(savedName);

    return () => {
        mountedRef.current = false;
        clearTimeout(manualEntryTimer);
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
    };
  }, []);

  const getDisplayName = () => {
    if (customDisplayName) return customDisplayName;
    return isGuest ? 'Guest' : (session?.user?.email?.split('@')[0] || 'Player');
  };

  const handleUpdateName = (name: string) => {
    setCustomDisplayName(name);
    localStorage.setItem(NAME_KEY, name);
  };

  const resetSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setRoomCode('');
    setMyOnlineId(null);
    setGameState({ gameMode: null });
  };

  const hardReset = () => {
      localStorage.clear();
      window.location.reload();
  };

  const forceEnter = () => {
      console.log("App.tsx: User forced offline/guest entry.");
      setAuthLoading(false);
      setIsGuest(true);
  };

  // --- LOADING SCREEN ---
  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full bg-[#1a2e1a] flex flex-col items-center justify-center text-white gap-6 z-50 fixed inset-0 p-4 text-center">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        
        <div className="space-y-2">
            <h2 className="font-serif text-2xl animate-pulse">Initializing...</h2>
            <p className="text-sm text-gray-400">Connecting to services</p>
        </div>

        {/* ALWAYS show this option if loading takes > 2s */}
        {showManualEntry && (
            <div className="mt-8 p-6 bg-slate-900/80 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-4 backdrop-blur-md">
                <div className="flex items-center justify-center gap-2 text-yellow-500 mb-1 font-bold">
                    <AlertTriangle size={20} />
                    <span>Taking a while?</span>
                </div>
                
                <button 
                    onClick={forceEnter}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <ArrowRight size={18} /> Play Offline Now
                </button>

                <button 
                    onClick={hardReset}
                    className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                    <RefreshCw size={14} /> Reset App
                </button>
            </div>
        )}
      </div>
    );
  }

  // --- AUTH SCREEN ---
  if (!session && !isGuest) {
    return <Auth onGuestPlay={() => setIsGuest(true)} />;
  }

  // --- MAIN APP ---
  const commonProps = { displayName: getDisplayName(), userId: session?.user?.id || 'guest', setMyOnlineId };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainMenu {...commonProps} onUpdateName={handleUpdateName} isGuest={isGuest} />} />
        
        <Route path="/setup/single" element={<SetupSingle {...commonProps} />} />
        <Route path="/setup/multi/:count" element={<SetupMulti />} />
        <Route path="/setup/online" element={<SetupOnline {...commonProps} />} />
        
        <Route path="/lobby" element={<Lobby myOnlineId={myOnlineId} resetSession={resetSession} />} />
        <Route path="/game" element={<Game myOnlineId={myOnlineId} resetSession={resetSession} />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;