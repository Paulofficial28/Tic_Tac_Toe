import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket, getSession } from '../lib/nakama';

const OP_CODES = {
  MOVE: 1,
  FORFEIT: 2,
  STATE_UPDATE: 3,
  MATCH_END: 4,
};

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const matchId = location.state?.matchId;
  const session = getSession();
  
  const [board, setBoard] = useState<number[]>([0,0,0,0,0,0,0,0,0]);
  const [matchStatus, setMatchStatus] = useState('waiting');
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [myMark, setMyMark] = useState(1);
  const [mode, setMode] = useState<'classic' | 'timed'>('timed');

  useEffect(() => {
     if (!session && !matchId) {
        setMatchStatus('playing');
        return;
     }
     if (!matchId || !session) {
         navigate('/lobby');
         return;
     }

     const socket = getSocket();
     if (socket) {
        socket.onmatchdata = (matchState) => {
           try {
             const opCode = matchState.op_code;
             const payload = JSON.parse(new TextDecoder().decode(matchState.data));
             const state = payload.state;
             
             if (opCode === OP_CODES.STATE_UPDATE || opCode === OP_CODES.MATCH_END) {
                setBoard(state.board);
                setMatchStatus(state.matchStatus);
                setActivePlayer(state.activePlayerUserId);
                setDeadline(state.deadline);
                setWinner(state.winner);
                if (state.mode) setMode(state.mode);
                
                const me = state.players.find((p: any) => p.userId === session.user_id);
                const opp = state.players.find((p: any) => p.userId !== session.user_id);
                if (me) setMyMark(me.mark);
                if (opp) setOpponentName(opp.username);
             }
           } catch(e) {
             console.error("Error parsing match data", e);
           }
        };
     }
     
     return () => {
         if (socket) {
             socket.onmatchdata = () => {};
         }
     }
  }, [matchId, navigate, session]);

  useEffect(() => {
      const interval = setInterval(() => {
          if (matchStatus === 'playing' && deadline > 0) {
              const now = Date.now() / 1000;
              const remaining = Math.max(0, Math.ceil(deadline - now));
              setTimeLeft(remaining);
          }
      }, 500);
      return () => clearInterval(interval);
  }, [deadline, matchStatus]);

  const handleMove = async (index: number) => {
     if (board[index] !== 0 || matchStatus !== 'playing' || activePlayer !== session?.user_id) return;
     
     try {
       const socket = getSocket();
       if (socket && matchId) {
          await socket.sendMatchState(matchId, OP_CODES.MOVE, new TextEncoder().encode(JSON.stringify({ position: index })));
       } else if (!session) {
          const newBoard = [...board];
          newBoard[index] = myMark;
          setBoard(newBoard);
       }
     } catch (e) {
        console.error("Failed to send move", e);
     }
  };

  const handleForfeit = async () => {
     try {
       const socket = getSocket();
       if (socket && matchId) {
          await socket.sendMatchState(matchId, OP_CODES.FORFEIT, new TextEncoder().encode(JSON.stringify({})));
       }
     } catch (e) {
        console.error("Failed to forfeit", e);
     }
  };

  const isMyTurn = activePlayer === session?.user_id || (!session && matchStatus === 'playing');

  return (
    <div className="game-layout">
       <div className="match-info">
          <div className="player-info">
             <span className="player-name" style={{ color: 'var(--accent-color)' }}>{session?.username || "Player 1"}</span>
             <span className="player-mark">Playing as {myMark === 1 ? 'X' : 'O'}</span>
          </div>
          {mode === 'timed' ? (
              <div className={`timer ${timeLeft <= 5 ? 'warning' : ''}`}>{matchStatus === 'playing' ? timeLeft : '-'}</div>
          ) : (
              <div className="timer" style={{ fontSize: '1rem', border: 'none', background: 'transparent' }}>Classic</div>
          )}
          <div className="player-info" style={{ alignItems: 'flex-end' }}>
             <span className="player-name">{opponentName}</span>
             <span className="player-mark">Playing as {myMark === 1 ? 'O' : 'X'}</span>
          </div>
       </div>

       <div className="board">
          {board.map((mark, i) => (
             <button 
                key={i} 
                className={`square ${mark === 1 ? 'mark-x' : mark === 2 ? 'mark-o' : ''}`}
                onClick={() => handleMove(i)}
                disabled={mark !== 0 || matchStatus !== 'playing' || !isMyTurn}
             >
                {mark === 1 ? 'X' : mark === 2 ? 'O' : ''}
             </button>
          ))}
       </div>
       
       <div className="status-text" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {matchStatus === 'waiting' && 'Waiting for opponent...'}
          {matchStatus === 'playing' && (isMyTurn ? <span style={{color: 'var(--accent-color)'}}>Your turn! Make a move.</span> : <span>Waiting for opponent's move...</span>)}
          {matchStatus === 'ended' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                 <span style={{ 
                     color: winner === session?.user_id ? 'var(--success-color)' : winner === 'draw' ? '#e3b341' : 'var(--danger-color)',
                     fontWeight: 'bold', fontSize: '1.5rem' 
                 }}>
                    {winner === session?.user_id ? 'You Won! 🎉' : winner === 'draw' ? 'Draw!' : 'You Lost! 😢'}
                 </span>
                 <button className="btn" onClick={() => navigate('/lobby')} style={{ width: 'auto' }}>Back to Lobby</button>
              </div>
          )}
          
          {matchStatus === 'playing' && (
             <button className="btn" onClick={handleForfeit} style={{ width: 'auto', backgroundColor: 'transparent', color: 'var(--danger-color)', fontSize: '0.9rem', border: '1px solid var(--danger-color)' }}>
                Forfeit Game
             </button>
          )}
       </div>
    </div>
  );
}
