import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClient, getSession } from '../lib/nakama';

export default function Leaderboard() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    if (!session) {
       navigate('/');
       return;
    }
    const fetchLeaderboard = async () => {
      try {
        const client = getClient();
        const result = await client.listLeaderboardRecords(session, 'tic_tac_toe_global', undefined, undefined, "10");
        setRecords(result.records || []);
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [session, navigate]);

  return (
    <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
      <h2>Global Leaderboard</h2>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}><div className="loader"></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {records.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No records yet.</p>
          ) : (
            records.map((record, index) => (
              <div key={record.owner_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>#{index + 1}</span>
                  <span style={{ fontWeight: 600 }}>{record.username}</span>
                </div>
                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{record.score} Wins</span>
              </div>
            ))
          )}
        </div>
      )}
      <button className="btn" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/lobby')}>Back to Lobby</button>
    </div>
  );
}
