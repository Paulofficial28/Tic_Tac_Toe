import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticate } from '../lib/nakama';

export default function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const deviceId = username + "_" + Math.random().toString(36).substring(7);
      await authenticate(deviceId, username);
      navigate('/lobby');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Nakama Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Enter Your Name</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="HeroicPlayer"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
          className="input-field"
        />
        <button type="submit" disabled={loading || !username} className="btn">
          {loading ? <div className="loader"></div> : 'Play Now'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
