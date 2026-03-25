/// <reference types="nakama-runtime" />

export const OpCodes = {
  MOVE: 1,
  FORFEIT: 2,
  STATE_UPDATE: 3,
  MATCH_END: 4,
};

export interface Player {
  userId: string;
  sessionId: string;
  username: string;
  mark: number; // 0=none, 1=X, 2=O
}

export interface MatchState {
  board: number[];
  players: Player[];
  activePlayerUserId: string | null;
  deadline: number;
  matchStatus: 'waiting' | 'playing' | 'ended';
  winner: string | null | 'draw';
  mode: 'classic' | 'timed';
}

const TICK_RATE = 5;
const TURN_TIMEOUT_SEC = 30;

function getWinningMark(board: number[]): number | null {
  const winLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (let line of winLines) {
    if (board[line[0]] !== 0 && board[line[0]] === board[line[1]] && board[line[1]] === board[line[2]]) {
      return board[line[0]];
    }
  }
  return null;
}

export const matchInit: nkruntime.MatchInitFunction<MatchState> = function (ctx, logger, nk, params) {
  const mode = (params.mode === 'classic') ? 'classic' : 'timed';
  const state: MatchState = {
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    players: [],
    activePlayerUserId: null,
    deadline: 0,
    matchStatus: 'waiting',
    winner: null,
    mode,
  };
  return {
    state,
    tickRate: TICK_RATE,
    label: mode === 'classic' ? "tic-tac-toe-classic" : "tic-tac-toe-timed"
  };
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.players.length >= 2) {
    return { state, accept: false, rejectReason: 'Match is full' };
  }
  if (state.players.find(p => p.userId === presence.userId)) {
    return { state, accept: false, rejectReason: 'Already joined' };
  }
  return { state, accept: true };
};

export const matchJoin: nkruntime.MatchJoinFunction<MatchState> = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const presence of presences) {
    const mark = state.players.length === 0 ? 1 : 2; // X or O
    state.players.push({
      userId: presence.userId,
      sessionId: presence.sessionId,
      username: presence.username,
      mark,
    });
  }

  if (state.players.length === 2 && state.matchStatus === 'waiting') {
    state.matchStatus = 'playing';
    state.activePlayerUserId = state.players[0].userId;
    if (state.mode === 'timed') {
       state.deadline = Date.now() / 1000 + TURN_TIMEOUT_SEC;
    }
    
    const payload = JSON.stringify({ state });
    dispatcher.broadcastMessage(OpCodes.STATE_UPDATE, payload);
  }

  return { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const presence of presences) {
    state.players = state.players.filter(p => p.userId !== presence.userId);
  }

  // If game is playing and someone leaves, they forfeit
  if (state.matchStatus === 'playing') {
    const leavingUserId = presences[0].userId; // handle first leaver
    const remainingPlayer = state.players.find(p => p.userId !== leavingUserId);
    
    state.matchStatus = 'ended';
    state.winner = remainingPlayer ? remainingPlayer.userId : 'draw';
    
    dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state }));
  }

  // If match ended and everyone left, return null to terminate
  if (state.players.length === 0) {
    return null;
  }

  return { state };
};

export const matchLoop: nkruntime.MatchLoopFunction<MatchState> = function (ctx, logger, nk, dispatcher, tick, state, messages) {
  if (state.matchStatus === 'ended') {
    return state.players.length > 0 ? { state } : null;
  }

  if (state.matchStatus === 'playing') {
    const now = Date.now() / 1000;
    
    // Handle Timeouts
    if (state.mode === 'timed' && now >= state.deadline) {
      state.matchStatus = 'ended';
      const winningPlayer = state.players.find(p => p.userId !== state.activePlayerUserId);
      state.winner = winningPlayer ? winningPlayer.userId : 'draw';

      if (state.winner !== 'draw') {
         try { nk.leaderboardRecordWrite('tic_tac_toe_global', state.winner!, winningPlayer!.username, 1); } catch(e) {}
      }

      dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state }));
      return { state };
    }

    // Process incoming Messages
    for (const message of messages) {
      if (message.opCode === OpCodes.MOVE) {
        if (message.sender.userId !== state.activePlayerUserId) continue;
        
        const payload = JSON.parse(nk.binaryToString(message.data));
        const index = payload.position;

        if (index >= 0 && index <= 8 && state.board[index] === 0) {
          const player = state.players.find(p => p.userId === message.sender.userId);
          if (player) {
            state.board[index] = player.mark;
            
            const winningMark = getWinningMark(state.board);
            if (winningMark) {
              state.matchStatus = 'ended';
              state.winner = player.userId;
              try { nk.leaderboardRecordWrite('tic_tac_toe_global', state.winner, player.username, 1); } catch(e) {}
              dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state }));
            } else if (!state.board.includes(0)) {
              state.matchStatus = 'ended';
              state.winner = 'draw';
              dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state }));
            } else {
              const nextPlayer = state.players.find(p => p.userId !== state.activePlayerUserId);
              state.activePlayerUserId = nextPlayer ? nextPlayer.userId : null;
              if (state.mode === 'timed') {
                 state.deadline = now + TURN_TIMEOUT_SEC;
              }
              dispatcher.broadcastMessage(OpCodes.STATE_UPDATE, JSON.stringify({ state }));
            }
          }
        }
      } else if (message.opCode === OpCodes.FORFEIT) {
        if (state.players.some(p => p.userId === message.sender.userId)) {
           state.matchStatus = 'ended';
           const winnerPlayer = state.players.find(p => p.userId !== message.sender.userId);
           state.winner = winnerPlayer ? winnerPlayer.userId : 'draw';
           
           if (state.winner !== 'draw') {
             try { nk.leaderboardRecordWrite('tic_tac_toe_global', state.winner, winnerPlayer!.username, 1); } catch(e) {}
           }
           dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state }));
        }
      }
    }
  }

  return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state };
};

export const matchSignal: nkruntime.MatchSignalFunction<MatchState> = function (ctx, logger, nk, dispatcher, tick, state, data) {
  return { state, data: "" };
};
