import { create } from 'zustand';
import { GameState, Player, CardData, GamePhase, GameMode } from '../../types';
import { createDeck, getRoundScores, shuffleDeck } from '../../services/gameLogic';
import { DEFAULT_TOTAL_ROUNDS } from '../../constants';
import { updateGameState } from '../../services/online';

type GameStore = GameState & {
  // UI Selection State
  selectedCardIds: string[];
  isTransitioning: boolean;
  
  // Online Sync Internal State
  _roomCode: string;

  // Actions
  setGameState: (state: Partial<GameState>) => void;
  resetGame: () => void;
  setRoomCode: (code: string) => void;
  
  // Card Selection Actions
  toggleCardSelection: (cardId: string) => void;
  clearSelection: () => void;
  setTransitioning: (is: boolean) => void;

  // Core Game Logic
  startRound: (roundNum: number, existingPlayers?: Player[], mode?: GameMode, totalRounds?: number) => void;
  handleToss: () => void;
  handleDiscard: () => void;
  handleDraw: (source: 'DECK' | 'OPEN') => void;
  handleShow: () => void;
  
  // Helpers
  syncOnline: () => void;
  finishTurn: (playerId: number, newHand: CardData[], openDeck: CardData[], deck: CardData[], actionLog: string) => void;
}

const INITIAL_STATE: GameState = {
  gameMode: null,
  deck: [],
  openDeck: [],
  players: [],
  currentPlayerIndex: 0,
  roundJoker: null,
  roundNumber: 1,
  totalRounds: DEFAULT_TOTAL_ROUNDS,
  phase: GamePhase.SETUP,
  turnLog: [],
  winner: null,
  lastDiscardedId: null,
  tossedThisTurn: false,
  pendingDiscard: null,
  pendingToss: [],
  playerNames: []
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,
  selectedCardIds: [],
  isTransitioning: false,
  _roomCode: '',

  setGameState: (newState) => set((state) => ({ ...state, ...newState })),
  resetGame: () => set({ ...INITIAL_STATE, selectedCardIds: [], isTransitioning: false, _roomCode: '' }),
  setRoomCode: (code) => set({ _roomCode: code }),
  setTransitioning: (is) => set({ isTransitioning: is }),

  toggleCardSelection: (cardId) => set((state) => {
    const { selectedCardIds, phase } = state;
    if (phase !== GamePhase.PLAYER_TURN_START) return {};
    
    if (selectedCardIds.includes(cardId)) {
      return { selectedCardIds: selectedCardIds.filter(id => id !== cardId) };
    }
    if (selectedCardIds.length >= 2) {
      return { selectedCardIds: [selectedCardIds[1], cardId] };
    }
    return { selectedCardIds: [...selectedCardIds, cardId] };
  }),

  clearSelection: () => set({ selectedCardIds: [] }),

  syncOnline: () => {
    const s = get();
    if ((s.gameMode === 'ONLINE_HOST' || s.gameMode === 'ONLINE_CLIENT') && s._roomCode) {
      // Construct the state payload matching GameState interface
      const stateToSend: GameState = {
        gameMode: s.gameMode,
        deck: s.deck,
        openDeck: s.openDeck,
        players: s.players,
        currentPlayerIndex: s.currentPlayerIndex,
        roundJoker: s.roundJoker,
        roundNumber: s.roundNumber,
        totalRounds: s.totalRounds,
        phase: s.phase,
        turnLog: s.turnLog,
        winner: s.winner,
        lastDiscardedId: s.lastDiscardedId,
        tossedThisTurn: s.tossedThisTurn,
        pendingDiscard: s.pendingDiscard,
        pendingToss: s.pendingToss,
        playerNames: s.playerNames
      };
      updateGameState(s._roomCode, stateToSend);
    }
  },

  startRound: (roundNum, existingPlayers, mode, totalRounds) => {
    const s = get();
    const newDeck = createDeck();
    const jokerIndex = Math.floor(Math.random() * newDeck.length);
    const roundJoker = { ...newDeck[jokerIndex] };
    
    let players: Player[] = [];
    let startingPlayerIndex = 0;
    let startLog = `Round ${roundNum} started! Joker is ${roundJoker.rank}`;

    if (existingPlayers) {
      // LOGIC: The player who was the CALLER in the previous round starts.
      const caller = existingPlayers.find(p => p.wasCaller);
      if (caller) {
        startingPlayerIndex = caller.id;
        startLog = `Round ${roundNum} started! ${caller.name} called SHOW last round and will start this round.`;
      }
      players = existingPlayers.map(p => ({ 
        ...p, 
        hand: [], 
        score: 0,
        totalScore: p.totalScore || 0,
        lastAction: 'Waiting...',
        wasCaller: false 
      }));
    } else {
      // New Game Init
      if (mode === 'SINGLE_PLAYER') {
        const names = s.playerNames.length > 0 ? s.playerNames : ['Player', 'Bot 1', 'Bot 2', 'Bot 3'];
        players = [
          { id: 0, name: names[0], isBot: false, hand: [], score: 0, totalScore: 0, lastAction: 'Waiting...' },
          { id: 1, name: names[1], isBot: true, hand: [], score: 0, totalScore: 0, lastAction: 'Waiting...' },
          { id: 2, name: names[2], isBot: true, hand: [], score: 0, totalScore: 0, lastAction: 'Waiting...' },
          { id: 3, name: names[3], isBot: true, hand: [], score: 0, totalScore: 0, lastAction: 'Waiting...' }
        ];
      } else if (mode === 'MULTIPLAYER') {
        const count = s.playerNames.length;
        players = s.playerNames.map((name, i) => ({
          id: i, name, isBot: false, hand: [], score: 0, totalScore: 0, lastAction: 'Waiting...'
        }));
      } else if (mode === 'ONLINE_HOST' && existingPlayers) {
         players = existingPlayers;
      }
    }

    // Deal
    players.forEach(p => { p.hand = newDeck.splice(0, 3); });

    set({
      deck: newDeck,
      openDeck: [],
      players,
      currentPlayerIndex: startingPlayerIndex,
      roundJoker,
      roundNumber: roundNum,
      // Use passed totalRounds, or fallback to current state, or default
      totalRounds: totalRounds || s.totalRounds || DEFAULT_TOTAL_ROUNDS, 
      phase: GamePhase.PLAYER_TURN_START,
      turnLog: [startLog],
      winner: null,
      lastDiscardedId: null,
      tossedThisTurn: false,
      pendingDiscard: null,
      pendingToss: [],
      gameMode: (mode || s.gameMode) as GameMode,
      selectedCardIds: [],
      isTransitioning: mode === 'MULTIPLAYER' || (existingPlayers && s.gameMode === 'MULTIPLAYER')
    });
    
    get().syncOnline();
  },

  handleToss: () => {
    const s = get();
    if (s.selectedCardIds.length !== 2 || s.tossedThisTurn) return;
    
    const p = s.players[s.currentPlayerIndex];
    const cards = p.hand.filter(c => s.selectedCardIds.includes(c.id));
    
    if (cards.length < 2 || cards[0].rank !== cards[1].rank) {
      alert("Must toss a pair of the same rank!");
      return;
    }

    const newHand = p.hand.filter(c => !s.selectedCardIds.includes(c.id));
    
    const updatedPlayers = s.players.map(pl => pl.id === p.id ? { ...pl, hand: newHand, lastAction: `Tossed ${cards[0].rank}s` } : pl);

    set({
      players: updatedPlayers,
      pendingToss: cards,
      phase: GamePhase.PLAYER_TOSSING_DRAW,
      tossedThisTurn: true,
      turnLog: [...s.turnLog, `${p.name} tossed a pair of ${cards[0].rank}s`],
      selectedCardIds: []
    });
    get().syncOnline();
  },

  handleDiscard: () => {
    const s = get();
    if (s.selectedCardIds.length !== 1) return;

    const p = s.players[s.currentPlayerIndex];
    const cardToDiscard = p.hand.find(c => c.id === s.selectedCardIds[0]);
    if (!cardToDiscard) return;

    const newHand = p.hand.filter(c => c.id !== s.selectedCardIds[0]);

    set({
      players: s.players.map(pl => pl.id === p.id ? { ...pl, hand: newHand, lastAction: `Discarded ${cardToDiscard.rank}${cardToDiscard.suit}` } : pl),
      pendingDiscard: cardToDiscard,
      lastDiscardedId: cardToDiscard.id,
      phase: GamePhase.PLAYER_DRAW,
      turnLog: [...s.turnLog, `${p.name} discarded ${cardToDiscard.rank}${cardToDiscard.suit}`],
      selectedCardIds: []
    });
    get().syncOnline();
  },

  handleDraw: (source) => {
    const s = get();
    const p = s.players[s.currentPlayerIndex];
    
    let drawnCard: CardData;
    let newOpenDeck = [...s.openDeck];
    let newDeck = [...s.deck];

    if (source === 'OPEN') {
      const topCard = newOpenDeck[newOpenDeck.length - 1];
      if (s.phase === GamePhase.PLAYER_DRAW && topCard && topCard.id === s.lastDiscardedId) {
        if (!p.isBot) alert("Cannot pick up the card you just discarded!");
        return;
      }
      drawnCard = newOpenDeck.pop()!;
    } else {
      if (newDeck.length === 0) {
         if (newOpenDeck.length > 1) {
            const topCard = newOpenDeck.pop()!; 
            const cardsToRecycle = [...newOpenDeck]; 
            newDeck = shuffleDeck(cardsToRecycle); 
            newOpenDeck = [topCard]; 
         } else {
            alert("No cards left in Deck or Open Pile! Ending round.");
            get().handleShow(); 
            return;
         }
      }
      drawnCard = newDeck.shift()!;
    }

    const newHand = [...p.hand, drawnCard];

    if (s.pendingToss.length > 0) newOpenDeck.push(...s.pendingToss);
    if (s.pendingDiscard) newOpenDeck.push(s.pendingDiscard);
      
    get().finishTurn(p.id, newHand, newOpenDeck, newDeck, source === 'OPEN' ? `Drew from Open Pile` : `Drew from Deck`);
  },

  handleShow: () => {
    const s = get();
    const results = getRoundScores(s.players, s.currentPlayerIndex, s.roundJoker);
    
    const updatedPlayers = s.players.map(p => {
      const roundRes = results.find(r => r.playerId === p.id);
      return {
        ...p,
        score: roundRes ? roundRes.roundScore : 0,
        totalScore: (p.totalScore || 0) + (roundRes ? roundRes.roundScore : 0),
        lastAction: p.id === s.currentPlayerIndex ? 'CALLED SHOW!' : 'Revealed',
        wasCaller: p.id === s.currentPlayerIndex 
      };
    });

    set({
      players: updatedPlayers,
      phase: GamePhase.ROUND_END,
      turnLog: [...s.turnLog, `${s.players[s.currentPlayerIndex].name} called SHOW! Round Ended.`],
      isTransitioning: false
    });
    get().syncOnline();
  },

  finishTurn: (playerId, newHand, openDeck, deck, actionLog) => {
    const s = get();
    const nextPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    const needsTransition = s.gameMode === 'MULTIPLAYER';

    set({
      players: s.players.map(pl => pl.id === playerId ? { ...pl, hand: newHand, lastAction: 'Ended Turn' } : pl),
      openDeck,
      deck,
      currentPlayerIndex: nextPlayerIndex,
      phase: GamePhase.PLAYER_TURN_START,
      turnLog: [...s.turnLog, actionLog],
      lastDiscardedId: null,
      tossedThisTurn: false,
      pendingDiscard: null,
      pendingToss: [],
      isTransitioning: needsTransition
    });
    get().syncOnline();
  }
}));