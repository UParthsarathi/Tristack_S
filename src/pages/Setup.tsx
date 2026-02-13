import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Hash, Wifi, Loader2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { createRoom, joinRoom } from '../../services/online';
import { shuffleDeck } from '../../services/gameLogic';
import { BOT_NAMES } from '../../constants';
import { CardData } from '../../types';

interface SetupProps {
  displayName: string;
  userId: string;
  setMyOnlineId: (id: number) => void;
}

export const SetupSingle: React.FC<SetupProps> = ({ displayName }) => {
  const navigate = useNavigate();
  const startRound = useGameStore(s => s.startRound);
  const setGameState = useGameStore(s => s.setGameState);
  
  const [rounds, setRounds] = useState(5);
  const [roundsInput, setRoundsInput] = useState("5");

  const handleStart = () => {
    setGameState({ totalRounds: rounds });
    // Pick bots
    const shuffledPool = shuffleDeck([...BOT_NAMES].map((name, idx) => ({ id: `bot-name-${idx}`, name } as unknown as CardData)));
    const selectedBotNames = (shuffledPool as any[]).slice(0, 3).map(item => "Bot " + item.name);
    
    setGameState({ 
        playerNames: [displayName, ...selectedBotNames],
        gameMode: 'SINGLE_PLAYER'
    });
    
    startRound(1, undefined, 'SINGLE_PLAYER');
    navigate('/game');
  };

  return (
    <div className="h-[100dvh] bg-[#1a2e1a] flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-slate-900/90 backdrop-blur p-6 rounded-3xl border border-white/10 w-full max-w-sm text-center shadow-2xl">
        <h2 className="text-white text-xl font-bold mb-6">Match Settings</h2>
        
        <div className="bg-black/20 p-4 rounded-2xl mb-6">
            <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Total Rounds</label>
            <div className="flex items-center gap-3 mb-4">
                <input 
                   type="number" min="1" max="100" 
                   className="bg-slate-800 text-white text-2xl font-bold p-3 rounded-xl border border-white/10 text-center w-24 focus:border-yellow-500 outline-none"
                   value={roundsInput}
                   onChange={(e) => { setRoundsInput(e.target.value); setRounds(parseInt(e.target.value)||1); }}
                />
                <div className="flex-1 grid grid-cols-2 gap-2">
                    {[3, 5, 10, 20].map(r => (
                    <button key={r} onClick={() => { setRounds(r); setRoundsInput(r.toString()); }} className={`py-2 rounded-lg font-bold text-xs border ${rounds === r ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent text-gray-400 border-white/10'}`}>{r}</button>
                    ))}
                </div>
            </div>
        </div>

        <button onClick={handleStart} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg mb-4 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">Start Game <Play size={20} fill="currentColor" /></button>
        <button onClick={() => navigate('/')} className="text-gray-400 font-bold text-sm flex items-center gap-2 mx-auto hover:text-white"><ChevronLeft size={16} /> Cancel</button>
      </div>
    </div>
  );
};

export const SetupMulti: React.FC = () => {
  const navigate = useNavigate();
  const { count } = useParams();
  const playerCount = parseInt(count || '4');
  const startRound = useGameStore(s => s.startRound);
  const setGameState = useGameStore(s => s.setGameState);

  const [names, setNames] = useState(Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`));
  const [rounds, setRounds] = useState(5);

  const handleStart = () => {
    setGameState({ totalRounds: rounds, playerNames: names, gameMode: 'MULTIPLAYER' });
    startRound(1, undefined, 'MULTIPLAYER');
    navigate('/game');
  };

  return (
    <div className="h-[100dvh] bg-[#1a2e1a] flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-slate-900/90 backdrop-blur p-6 rounded-3xl border border-white/10 w-full max-w-sm flex flex-col gap-4 shadow-2xl h-full max-h-[80vh]">
         <div className="text-center">
            <h1 className="text-xl font-bold text-yellow-500">Add Players</h1>
            <p className="text-xs text-gray-400">Enter names for {playerCount} players</p>
         </div>

         <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
             {names.map((name, idx) => (
               <div key={idx} className="flex flex-col gap-1">
                 <input 
                    type="text" 
                    value={name} 
                    placeholder={`Player ${idx + 1}`}
                    onChange={(e) => { const n = [...names]; n[idx] = e.target.value; setNames(n); }} 
                    className="bg-black/20 text-white border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none" 
                 />
               </div>
             ))}
         </div>

         <div className="bg-black/20 p-3 rounded-xl flex items-center justify-between border border-white/5">
             <div className="flex items-center gap-2 text-gray-400">
                 <Hash size={16} />
                 <span className="text-xs font-bold uppercase">Rounds</span>
             </div>
             <input type="number" value={rounds} onChange={(e) => setRounds(parseInt(e.target.value)||1)} className="w-16 bg-slate-800 text-white rounded-lg p-2 text-center text-sm font-bold border border-white/10" />
         </div>

         <div className="flex gap-3 pt-2">
             <button onClick={() => navigate('/')} className="px-6 bg-slate-800 text-gray-300 hover:text-white py-3 rounded-xl font-bold text-sm">Back</button>
             <button onClick={handleStart} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">Start <Play size={18} fill="currentColor" /></button>
         </div>
      </div>
    </div>
  );
};

export const SetupOnline: React.FC<SetupProps> = ({ displayName, userId, setMyOnlineId }) => {
  const navigate = useNavigate();
  const setRoomCode = useGameStore(s => s.setRoomCode);
  const setGameState = useGameStore(s => s.setGameState);
  
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleCreate = async () => {
    const { code, error } = await createRoom(displayName, userId);
    if (error) return alert(error.message);
    
    setRoomCode(code);
    setGameState({ gameMode: 'ONLINE_HOST' });
    setMyOnlineId(0);
    localStorage.setItem('TRI_STACK_SESSION', JSON.stringify({ code, playerId: 0 }));
    navigate('/lobby');
  };

  const handleJoin = async () => {
    if (isJoining) return;
    setIsJoining(true);
    const { success, error, playerId } = await joinRoom(joinCode.toUpperCase(), displayName);
    if (!success) {
      alert(error);
      setIsJoining(false);
      return;
    }
    
    setRoomCode(joinCode.toUpperCase());
    setGameState({ gameMode: 'ONLINE_CLIENT' });
    setMyOnlineId(playerId!);
    localStorage.setItem('TRI_STACK_SESSION', JSON.stringify({ code: joinCode.toUpperCase(), playerId }));
    navigate('/lobby');
  };

  return (
    <div className="h-[100dvh] bg-[#1a2e1a] flex flex-col items-center justify-center p-4 font-sans">
        <h1 className="font-serif text-3xl font-bold text-yellow-500 mb-6 drop-shadow-lg">Online Play</h1>
        <div className="bg-slate-900/90 backdrop-blur p-6 rounded-3xl border border-white/10 w-full max-w-sm shadow-2xl">
           <button onClick={() => navigate('/')} className="text-gray-400 flex items-center gap-1 mb-6 text-sm font-bold hover:text-white"><ChevronLeft size={16} /> BACK</button>
           
           <button onClick={handleCreate} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black p-6 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-2 shadow-lg mb-8 active:scale-95 transition-all">
               <Wifi size={28} /> 
               <span>Create New Room</span>
           </button>

           <div className="relative">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
             <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-gray-500 font-bold">OR</span></div>
           </div>

           <div className="mt-6">
               <label className="text-xs text-gray-400 font-bold uppercase mb-2 block text-center">Join Existing Room</label>
               <div className="flex gap-2">
                  <input type="text" maxLength={4} placeholder="CODE" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="bg-black/30 text-white font-mono text-center text-xl p-3 rounded-xl w-full border border-white/10 uppercase tracking-widest focus:border-blue-500 outline-none" />
                  <button onClick={handleJoin} disabled={isJoining} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold flex items-center justify-center min-w-[80px] shadow-lg active:scale-95 transition-all disabled:opacity-50">
                    {isJoining ? <Loader2 className="animate-spin" size={20} /> : 'JOIN'}
                  </button>
               </div>
           </div>
        </div>
    </div>
  );
};