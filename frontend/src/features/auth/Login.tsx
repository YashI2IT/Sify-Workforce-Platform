import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { setAuth } from '../../store/slices/authSlice';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      
      dispatch(setAuth({ 
        accessToken: response.accessToken, 
        refreshToken: response.refreshToken,
        orgId: response.orgId
      }));
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sify Workforce</h1>
          <p className="text-sm text-gray-500">Sign in with your company credentials</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
            <input
              type="email"
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Authentication is handled by the internal User Management Service.
        </p>
      </div>
    </div>
  );
};
