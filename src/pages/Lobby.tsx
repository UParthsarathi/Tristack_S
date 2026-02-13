import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Users, Play, AlertCircle, Settings, Crown, ChevronLeft, Clock, Share2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { subscribeToRoom, leaveRoom } from '../../services/online';
import { GameMode } from '../../types';

interface LobbyProps {
  myOnlineId: number | null;
  resetSession: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ myOnlineId, resetSession }) => {
  const navigate = useNavigate();
  const roomCode = useGameStore(s => s._roomCode);
  const setGameState = useGameStore(s => s.setGameState);
  const startRound = useGameStore(s => s.startRound);
  
  const [lobbyPlayers, setLobbyPlayers] = useState<{id: number, name: string}[]>([]);
  
  // Rounds logic
  const [rounds, setRounds] = useState(5);
  const [roundsInput, setRoundsInput] = useState("5");
  
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!roomCode) {
        navigate('/');
        return;
    }
    setIsHost(myOnlineId === 0);

    // Initial sync subscription
    const sub = subscribeToRoom(roomCode, (roomData) => {
        if (roomData.status === 'WAITING') {
            setLobbyPlayers(roomData.players || []);
        } else if (roomData.status === 'PLAYING' && roomData.game_state) {
            // Game Started!
            const mode = (myOnlineId === 0 ? 'ONLINE_HOST' : 'ONLINE_CLIENT') as GameMode;
            setGameState({ ...roomData.game_state, gameMode: mode });
            navigate('/game');
        }
    });

    // Also fetch once immediately to populate
    import('../../services/online').then(({ getRoomData }) => {
        getRoomData(roomCode).then(({ data }) => {
            if (data) {
                 setLobbyPlayers(data.players || []);
                 if (data.status === 'PLAYING') navigate('/game');
            }
        });
    });

    return () => {
        import('../../services/supabase').then(({ supabase }) => supabase.removeChannel(sub));
    };
  }, [roomCode, myOnlineId, navigate, setGameState]);

  const handleStart = () => {
    if (lobbyPlayers.length < 2) return;
    
    const players = lobbyPlayers.map(p => ({
        id: p.id,
        name: p.name,
        isBot: false,
        hand: [],
        score: 0,
        totalScore: 0,
        lastAction: 'Joined'
    }));

    startRound(1, players, 'ONLINE_HOST', rounds);
    navigate('/game');
  };

  const handleLeave = () => {
    resetSession();
    if (myOnlineId !== null && roomCode) leaveRoom(roomCode, myOnlineId);
    navigate('/');
  };

  const shareRoom = () => {
    if (navigator.share) {
        navigator.share({
            title: 'Join my Tri-Stack Game',
            text: `Join my room with code: ${roomCode}`,
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(roomCode);
    }
  };

  const updateRounds = (val: string | number) => {
      let numVal = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(numVal)) numVal = 0; 
      
      setRoundsInput(val.toString());
      if (numVal > 0) setRounds(Math.min(Math.max(numVal, 1), 100)); 
  };

  const handleBlur = () => {
      let numVal = parseInt(roundsInput);
      if (isNaN(numVal) || numVal < 1) numVal = 1;
      if (numVal > 100) numVal = 100;
      setRoundsInput(numVal.toString());
      setRounds(numVal);
  };

  return (
    <div className="fixed inset-0 bg-[#1a2e1a] flex flex-col font-sans overflow-hidden">
        {/* Mobile-first Layout: Header -> Scrollable Content -> Sticky Footer */}

        {/* 1. Header / Room Code Banner */}
        <div className="bg-[#0f1219] p-4 md:p-6 shadow-lg z-10 flex flex-col items-center justify-center shrink-0 border-b border-white/5">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-yellow-500 mb-2">Lobby</h1>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">CODE:</span>
                <span className="text-2xl font-mono font-bold text-white tracking-widest">{roomCode}</span>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button onClick={shareRoom} className="text-blue-400 hover:text-white">
                    {navigator.share ? <Share2 size={18} /> : <Copy size={18} />}
                </button>
            </div>
        </div>

        {/* 2. Scrollable Content Area (Players + Settings) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24"> 
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
                
                {/* Player List */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                           <Users size={18} className="text-blue-400" /> Players ({lobbyPlayers.length}/10)
                        </h2>
                    </div>
                    <div className="space-y-2">
                        {lobbyPlayers.map((p) => (
                           <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${p.id === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-gray-300'}`}>
                                      {p.id === 0 ? <Crown size={14} /> : p.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                      <span className={`font-bold text-sm ${p.id === myOnlineId ? 'text-blue-400' : 'text-gray-200'}`}>
                                          {p.name} {p.id === myOnlineId && '(You)'}
                                      </span>
                                  </div>
                              </div>
                              {p.id === 0 && <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">HOST</span>}
                           </div>
                        ))}
                         {/* Empty slots placeholders to fill space visually if few players */}
                        {lobbyPlayers.length < 4 && Array.from({ length: 4 - lobbyPlayers.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-3 rounded-xl border border-dashed border-white/5 flex items-center gap-3 opacity-30">
                                <div className="w-8 h-8 rounded-full bg-white/5"></div>
                                <div className="h-4 w-20 bg-white/5 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings Section (Host Only usually, simplified for Guests) */}
                {isHost && (
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 h-fit">
                        <div className="flex items-center gap-2 mb-3 text-gray-300">
                            <Settings size={16} />
                            <span className="font-bold text-sm uppercase">Settings</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-gray-500" />
                            <span className="text-sm font-bold text-gray-400">Rounds:</span>
                            <div className="flex gap-2">
                                <button onClick={() => updateRounds(5)} className={`px-3 py-1 rounded text-xs font-bold border ${rounds === 5 ? 'bg-yellow-500 text-black border-yellow-500' : 'border-white/10 text-gray-400'}`}>5</button>
                                <button onClick={() => updateRounds(10)} className={`px-3 py-1 rounded text-xs font-bold border ${rounds === 10 ? 'bg-yellow-500 text-black border-yellow-500' : 'border-white/10 text-gray-400'}`}>10</button>
                                <input 
                                    type="number" 
                                    value={roundsInput}
                                    onChange={(e) => updateRounds(e.target.value)}
                                    onBlur={handleBlur}
                                    className="w-12 bg-black/40 border border-white/10 rounded text-center font-bold text-white text-xs outline-none focus:border-yellow-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* 3. Sticky Footer Action Bar */}
        <div className="bg-[#0f1219] border-t border-white/10 p-4 shrink-0 pb-6 md:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-4xl mx-auto flex gap-3">
                <button 
                    onClick={handleLeave} 
                    className="px-4 py-3 rounded-xl font-bold text-red-400 bg-red-900/10 hover:bg-red-900/20 border border-red-900/20 transition-colors flex flex-col items-center justify-center min-w-[80px]"
                >
                    <ChevronLeft size={20} />
                    <span className="text-[10px] uppercase mt-1">Leave</span>
                </button>

                {isHost ? (
                    <button 
                        onClick={handleStart} 
                        disabled={lobbyPlayers.length < 2} 
                        className={`flex-1 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                            lobbyPlayers.length >= 2 
                            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-green-900/30' 
                            : 'bg-slate-800 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {lobbyPlayers.length < 2 ? (
                            <span className="flex items-center gap-2 text-sm"><AlertCircle size={16} /> Waiting for players...</span>
                        ) : (
                            <><Play size={20} className="fill-current" /> START MATCH</>
                        )}
                    </button>
                ) : (
                    <div className="flex-1 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                        <span className="text-gray-400 font-bold text-sm animate-pulse">Waiting for Host to start...</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Lobby;