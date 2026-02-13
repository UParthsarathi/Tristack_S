import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { GamePhase, GameMode } from '../../types';
import { decideBotAction, calculateHandValue } from '../../services/gameLogic';
import { subscribeToRoom, leaveRoom, resetRoomToLobby } from '../../services/online';
import Card from '../../components/Card';
import { RefreshCw, Trophy, Users, AlertCircle, Hand, ChevronRight, EyeOff, Eye, Bot, ArrowRight, LogOut, Globe, Menu } from 'lucide-react';

interface GameProps {
  myOnlineId: number | null;
  resetSession: () => void;
}

const Game: React.FC<GameProps> = ({ myOnlineId, resetSession }) => {
  const navigate = useNavigate();
  // State Selectors
  const state = useGameStore();
  const { 
    players = [], 
    currentPlayerIndex = 0, 
    roundJoker, 
    deck = [], 
    openDeck = [], 
    phase = GamePhase.SETUP, 
    roundNumber = 1, 
    totalRounds = 5, 
    gameMode, 
    pendingDiscard, 
    pendingToss = [],
    tossedThisTurn, 
    isTransitioning, 
    selectedCardIds = [],
    _roomCode
  } = state;

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Fallback for current player to prevent crash
  const currentPlayer = players[currentPlayerIndex] || { 
    id: -1, 
    name: 'Loading...', 
    isBot: false, 
    hand: [], 
    score: 0, 
    totalScore: 0, 
    lastAction: '' 
  };
  
  // Perspective Logic
  let bottomPlayer = currentPlayer;
  let opponentsToRender = players.filter(p => p.id !== currentPlayer.id);

  if (gameMode === 'SINGLE_PLAYER' && players.length > 0) {
    bottomPlayer = players[0];
    opponentsToRender = players.filter(p => p.id !== 0);
  } else if ((gameMode === 'ONLINE_HOST' || gameMode === 'ONLINE_CLIENT') && myOnlineId !== null) {
    bottomPlayer = players.find(p => p.id === myOnlineId) || currentPlayer;
    opponentsToRender = players.filter(p => p.id !== myOnlineId);
  }

  const isMyTurnOnline = (gameMode === 'ONLINE_HOST' || gameMode === 'ONLINE_CLIENT') 
      ? currentPlayer.id === myOnlineId 
      : true;

  const isPlayerTurn = !isTransitioning 
      && !currentPlayer.isBot 
      && phase !== GamePhase.ROUND_END 
      && phase !== GamePhase.MATCH_END
      && isMyTurnOnline;

  const isBotThinking = gameMode === 'SINGLE_PLAYER' && currentPlayer.isBot && !isTransitioning && phase !== GamePhase.ROUND_END;

  // --- Bot Logic Effect ---
  useEffect(() => {
    if (!isBotThinking) return;

    const timeout = setTimeout(() => {
      const p = currentPlayer;
      if (!p || !p.hand) return;
      
      if (phase === GamePhase.PLAYER_TURN_START) {
        const action = decideBotAction(p, roundJoker, tossedThisTurn);
        if (action.type === 'SHOW') state.handleShow();
        else if (action.type === 'TOSS' && action.cardIds) {
            useGameStore.setState({ selectedCardIds: action.cardIds });
            state.handleToss();
        } else if (action.type === 'DISCARD' && action.cardIds) {
            useGameStore.setState({ selectedCardIds: action.cardIds });
            state.handleDiscard();
        }
      } 
      else if (phase === GamePhase.PLAYER_DRAW || phase === GamePhase.PLAYER_TOSSING_DRAW) {
        state.handleDraw('DECK');
      }
    }, 1500); 

    return () => clearTimeout(timeout);
  }, [phase, currentPlayerIndex, isBotThinking, tossedThisTurn, roundJoker, currentPlayer, state]);

  // --- Online Sync Effect ---
  useEffect(() => {
    if ((gameMode === 'ONLINE_HOST' || gameMode === 'ONLINE_CLIENT') && _roomCode) {
        const sub = subscribeToRoom(_roomCode, (roomData) => {
            if (roomData.status === 'WAITING') {
                navigate('/lobby'); // Return to lobby
            } else if (roomData.game_state) {
                const effectiveMode = (myOnlineId === 0 ? 'ONLINE_HOST' : 'ONLINE_CLIENT') as GameMode;
                state.setGameState({ ...roomData.game_state, gameMode: effectiveMode });
            }
        });
        return () => { import('../../services/supabase').then(({ supabase }) => supabase.removeChannel(sub)); };
    }
  }, [gameMode, _roomCode, myOnlineId, navigate, state]);

  const handleNextRound = () => {
    if (roundNumber >= totalRounds) return;
    state.startRound(roundNumber + 1, players, gameMode);
  };

  const handleExit = () => {
    resetSession();
    if (gameMode === 'ONLINE_HOST' && _roomCode) resetRoomToLobby(_roomCode);
    else if (gameMode === 'ONLINE_CLIENT' && _roomCode && myOnlineId !== null) leaveRoom(_roomCode, myOnlineId);
    state.resetGame();
    navigate('/');
  };

  const showOpponentCards = phase === GamePhase.ROUND_END;
  const isLastRound = roundNumber >= totalRounds;
  const lowestScore = Math.min(...players.map(p => p.totalScore || 0));

  // --- TRANSITION OVERLAY ---
  if (isTransitioning) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-yellow-500/30 text-center animate-in fade-in">
           <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20"><EyeOff size={40} className="text-white" /></div>
           <h2 className="text-2xl text-gray-400 font-serif mb-2">Turn Complete</h2>
           <p className="text-gray-500 mb-8">Please pass the device to</p>
           <h1 className="text-4xl font-bold text-white mb-8 tracking-tight">{currentPlayer.name}</h1>
           <button onClick={() => state.setTransitioning(false)} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"><Eye size={24} /> I am {currentPlayer.name} - Ready</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#1a2e1a] font-sans">
      
      {/* 1. Header (Compact) */}
      <div className="h-14 bg-[#0f1f0f] flex items-center justify-between px-3 shadow-lg z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExitConfirm(true)} className="text-white/50 hover:text-white p-1">
             <Menu size={20} />
          </button>
          
          <div className="flex flex-col leading-none">
             <span className="font-bold text-yellow-500 text-sm">R{roundNumber}/{totalRounds}</span>
             <span className="text-[10px] text-gray-400 uppercase">{_roomCode ? `ROOM: ${_roomCode}` : 'LOCAL'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-500/30">
           <span className="text-[10px] uppercase font-bold text-purple-300">Joker</span>
           {roundJoker && <span className="font-black text-white text-sm">{roundJoker.rank}</span>}
        </div>

        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isBotThinking ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
           <span className="text-xs font-bold text-white max-w-[80px] truncate">{currentPlayer.name}</span>
        </div>
      </div>

      {/* 2. Main Game Area */}
      <div className="flex-1 relative flex flex-col w-full max-w-5xl mx-auto overflow-hidden">
        
        {/* A. Opponents Strip (Horizontal Scroll on Mobile) */}
        <div className="h-[100px] md:h-[140px] bg-black/10 shrink-0 flex items-center overflow-x-auto overflow-y-hidden px-4 gap-4 no-scrollbar border-b border-white/5">
           {opponentsToRender.map(opp => (
             <div key={opp.id} className={`flex flex-col items-center justify-center min-w-[70px] transition-all p-2 rounded-lg ${opp.id === currentPlayerIndex ? 'bg-white/10' : 'opacity-70'}`}>
                <div className="relative mb-1">
                   <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-500">
                     {opp.isBot ? <Bot size={16} className="text-slate-300" /> : <Users size={16} className="text-slate-300" />}
                   </div>
                   {opp.hand && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm border border-black/20">{opp.hand.length}</div>}
                </div>
                <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center">{opp.name}</span>
                <span className="text-[9px] text-yellow-500 font-mono">{opp.totalScore}pts</span>
                
                {/* Visual Cards (Tiny) */}
                <div className="flex -space-x-3 mt-1 h-8">
                     {showOpponentCards 
                        ? (opp.hand || []).map((c, i) => (<div key={i} className="scale-50 origin-top-left"><Card card={c} small isJoker={roundJoker?.rank === c.rank} /></div>))
                        : (opp.hand || []).map((_, i) => (<div key={i} className="w-4 h-6 bg-blue-900 rounded border border-white/20" />))
                     }
                </div>
             </div>
           ))}
        </div>

        {/* B. Center Table (Decks & Piles) */}
        <div className="flex-1 flex items-center justify-center gap-6 py-4 relative">
            {/* Draw Pile */}
            <div className="flex flex-col items-center gap-1">
               <Card 
                 disabled={!isPlayerTurn || (phase !== GamePhase.PLAYER_DRAW && phase !== GamePhase.PLAYER_TOSSING_DRAW)} 
                 onClick={() => state.handleDraw('DECK')} 
                 className="scale-90 md:scale-100 shadow-xl"
               />
               <span className="text-[10px] uppercase font-bold text-slate-500">Deck</span>
            </div>

            {/* Open Pile / Action Area */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1 relative">
                 {openDeck.length > 0 ? (
                   <Card 
                     card={openDeck[openDeck.length - 1]}
                     isJoker={roundJoker && openDeck[openDeck.length - 1].rank === roundJoker.rank}
                     onClick={() => state.handleDraw('OPEN')}
                     disabled={!isPlayerTurn || (phase !== GamePhase.PLAYER_DRAW && phase !== GamePhase.PLAYER_TOSSING_DRAW)}
                     className="scale-90 md:scale-100 shadow-xl"
                   />
                 ) : (
                   <div className="w-20 h-28 md:w-24 md:h-36 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center bg-black/20 scale-90 md:scale-100">
                     <span className="text-white/10 text-[10px]">Empty</span>
                   </div>
                 )}
                 <span className="text-[10px] uppercase font-bold text-slate-500">Open</span>
              </div>

              {/* Animations for Discard/Toss */}
              {(pendingDiscard || pendingToss.length > 0) && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    {pendingDiscard && <Card card={pendingDiscard} className="animate-ping opacity-50" />}
                    {pendingToss.length > 0 && <Card card={pendingToss[0]} className="animate-ping opacity-50" />}
                 </div>
              )}
            </div>
        </div>

        {/* C. Bottom Player Area (Hand & Actions) */}
        <div className="shrink-0 pb-safe px-4 flex flex-col items-center bg-gradient-to-t from-black/40 to-transparent">
           
           {/* Action Buttons (Floating above hand) */}
           <div className="mb-4 h-10 flex items-center justify-center w-full">
             {isPlayerTurn && currentPlayer.id === bottomPlayer.id ? (
               <div className="flex gap-3 animate-in slide-in-from-bottom-4 fade-in">
                  {phase === GamePhase.PLAYER_TURN_START && (
                    <>
                      <button onClick={state.handleShow} className="bg-red-600 active:scale-95 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 text-xs shadow-lg"><AlertCircle size={14} /> SHOW</button>
                      
                      <button 
                        onClick={state.handleToss} 
                        disabled={selectedCardIds.length !== 2 || tossedThisTurn} 
                        className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 text-xs transition-all border ${selectedCardIds.length === 2 && !tossedThisTurn ? 'bg-blue-600 border-blue-400 text-white shadow-lg active:scale-95' : 'bg-slate-800 border-white/10 text-slate-500 opacity-50'}`}
                      >
                         <RefreshCw size={14} /> TOSS
                      </button>
                      
                      <button 
                        onClick={state.handleDiscard} 
                        disabled={selectedCardIds.length !== 1} 
                        className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 text-xs transition-all border ${selectedCardIds.length === 1 ? 'bg-green-600 border-green-400 text-white shadow-lg active:scale-95' : 'bg-slate-800 border-white/10 text-slate-500 opacity-50'}`}
                      >
                         <Hand size={14} /> DROP
                      </button>
                    </>
                  )}
                  {(phase === GamePhase.PLAYER_DRAW || phase === GamePhase.PLAYER_TOSSING_DRAW) && (
                     <div className="bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold border border-yellow-500/50 animate-pulse">
                        {phase === GamePhase.PLAYER_TOSSING_DRAW ? 'Draw a card to finish' : 'Pick a card from Deck or Open Pile'}
                     </div>
                  )}
               </div>
             ) : (
                <span className="text-xs text-white/40 italic">
                  {currentPlayer.isBot ? `${currentPlayer.name} is thinking...` : `Waiting for ${currentPlayer.name}...`}
                </span>
             )}
           </div>

           {/* Player Hand */}
           <div className="flex items-end justify-center -space-x-3 md:-space-x-6 pb-4">
              {(bottomPlayer.hand || []).map((card) => (
                <Card 
                  key={card.id} 
                  card={(!isPlayerTurn && gameMode === 'MULTIPLAYER') ? undefined : card} 
                  isJoker={roundJoker ? (card.rank === roundJoker.rank) : false}
                  selected={selectedCardIds.includes(card.id)}
                  onClick={() => state.toggleCardSelection(card.id)}
                  className={`transition-all transform hover:-translate-y-2 active:scale-95 ${selectedCardIds.includes(card.id) ? '-translate-y-6 z-10 ring-2 ring-yellow-400' : 'hover:z-10'}`}
                />
              ))}
           </div>
           
           {/* Name Label */}
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{bottomPlayer.name}</div>
        </div>

      </div>

      {/* Round End Modal Overlay */}
      {phase === GamePhase.ROUND_END && (
          <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-yellow-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
               <div className="p-4 bg-black/40 text-center border-b border-white/10">
                   <h2 className="text-xl font-bold text-white">{isLastRound ? "MATCH OVER" : "ROUND COMPLETE"}</h2>
                   <p className="text-xs text-gray-400 uppercase tracking-widest">Scores Updated</p>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   {players
                     .sort((a, b) => isLastRound ? (a.totalScore - b.totalScore) : 0)
                     .map(p => {
                       const isWinner = isLastRound && (p.totalScore || 0) === lowestScore;
                       const handValue = calculateHandValue(p.hand, roundJoker);
                       return (
                         <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${isWinner ? 'bg-yellow-500/10 border-yellow-500' : 'bg-slate-800 border-white/5'}`}>
                            <div className="flex flex-col">
                               <span className={`text-sm font-bold ${p.id === currentPlayerIndex ? 'text-blue-400' : 'text-white'}`}>{p.name}</span>
                               <span className="text-[10px] text-gray-500">Hand: {handValue}</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right">
                                  <div className={`font-bold ${p.score === 0 ? 'text-green-400' : 'text-red-400'}`}>{p.score > 0 ? `+${p.score}` : '0'}</div>
                                  <div className="text-[9px] text-gray-500 uppercase">Round</div>
                               </div>
                               <div className="text-right">
                                  <div className={`font-bold text-lg ${isWinner ? 'text-yellow-400' : 'text-white'}`}>{p.totalScore}</div>
                                  <div className="text-[9px] text-gray-500 uppercase">Total</div>
                               </div>
                            </div>
                         </div>
                       );
                   })}
               </div>

               <div className="p-4 bg-black/40 border-t border-white/10">
                   {((gameMode !== 'ONLINE_CLIENT' && gameMode !== 'ONLINE_HOST') || (gameMode === 'ONLINE_HOST' && myOnlineId === 0)) && (
                       <button 
                         onClick={isLastRound ? handleExit : handleNextRound} 
                         className={`w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 ${isLastRound ? 'bg-green-500 hover:bg-green-400' : 'bg-yellow-500 hover:bg-yellow-400'}`}
                       >
                          {isLastRound ? 'Finish Game' : 'Next Round'} <ChevronRight size={20} />
                       </button>
                   )}
                   {gameMode === 'ONLINE_CLIENT' && (
                       <div className="text-center text-yellow-500 text-sm animate-pulse font-bold">Waiting for Host...</div>
                   )}
               </div>
            </div>
          </div>
      )}

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-xs w-full text-center shadow-2xl">
             <h2 className="text-lg font-bold text-white mb-2">Quit Game?</h2>
             <p className="text-gray-400 text-sm mb-6">Progress will not be saved.</p>
             <div className="flex gap-3">
                <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Cancel</button>
                <button onClick={handleExit} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Quit</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;