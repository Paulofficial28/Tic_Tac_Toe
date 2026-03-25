import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, getSession, getSocket, getClient } from '../lib/nakama';

export default function Lobby() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('Welcome');
  const [mode, setMode] = useState<'classic' | 'timed'>('timed');
  const session = getSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleFindMatch = async () => {
    setLoading(true);
    setError('');
    setStatusText('Connecting to server...');

    try {
      let socket = getSocket();
      if (!socket) {
        socket = await connectSocket();
      }

      setStatusText('Searching for opponent...');
      const rpcResult = await getClient().rpc(session!, "find_match", { mode });
      if (rpcResult && rpcResult.payload) {
         const data = typeof rpcResult.payload === 'string' ? JSON.parse(rpcResult.payload) : (rpcResult.payload as any);
         const matchId = data.matchId;
         
         setStatusText('Joining match...');
         const match = await socket.joinMatch(matchId);
         navigate('/game', { state: { matchId: match.match_id } });
      } else {
         throw new Error("Invalid RPC response");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to find match');
      if (err.message === "Failed to fetch") {
         setError("No local server found. Running UI in standalone UI mode.");
         setTimeout(() => navigate('/game'), 2000);
      }
    } finally {
      if (!error) setLoading(false);
    }
  };

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2>Lobby</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        {statusText} {session?.username && `, ${session.username}`}!
      </p>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="radio" value="timed" checked={mode === 'timed'} onChange={() => setMode('timed')} disabled={loading} />
          Timed Mode
        </label>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="radio" value="classic" checked={mode === 'classic'} onChange={() => setMode('classic')} disabled={loading} />
          Classic Mode
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={handleFindMatch} disabled={loading} className="btn">
          {loading ? <div className="loader"></div> : 'Find Match'}
        </button>
        <button 
          onClick={() => navigate('/leaderboard')} 
          disabled={loading} 
          className="btn" 
          style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        >
          View Leaderboard
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
