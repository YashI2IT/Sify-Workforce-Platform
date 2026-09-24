import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { apiClient } from '../../lib/apiClient';
import type { RootState } from '../../store';
import { authService } from '../../services/authService';
import { setAuth } from '../../store/slices/authSlice';
import { authStorage } from '../../lib/authUtils';

interface InvitationDetails {
  email: string;
  name: string;
  role: string;
  status: string;
  expiresAt: string;
  organizationName: string;
  inviterName: string;
  teamName: string | null;
}

export const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentEmail = useSelector((state: RootState) => state.auth.umsUserEmail || state.auth.employee?.email);

  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  useEffect(() => {
    if (token && !isAuthenticated) {
      sessionStorage.setItem('pending_invitation_token', token);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!token) return;
      try {
        const response = await apiClient(`/employee-invitations/${token}/details`);
        setDetails(response.data);
      } catch (err: any) {
        setDetailsError(err.message || 'Failed to load invitation details. The link may be invalid.');
      } finally {
        setDetailsLoading(false);
      }
    };
    fetchDetails();
  }, [token]);

  // If the user is authenticated (has a token) but we don't have their email in Redux,
  // we must bootstrap to get their identity before we can verify the email mismatch.
  useEffect(() => {
    if (isAuthenticated && !currentEmail && !bootstrapLoading) {
      const loadIdentity = async () => {
        setBootstrapLoading(true);
        try {
          const bootstrapState = await authService.bootstrap();
          dispatch(setAuth({ 
            accessToken: authStorage.getAccessToken() || '', 
            refreshToken: authStorage.getRefreshToken() || '',
            orgId: bootstrapState.organization?.id || null,
            employee: bootstrapState.employee || null,
            isInitialSetup: bootstrapState.isInitialSetup || false,
            umsUserEmail: bootstrapState.umsUserEmail || null,
          }));
        } catch (err) {
          // If bootstrap fails (e.g. 401 expired), apiClient will handle the redirect.
          console.error('Failed to bootstrap identity on invite page', err);
        } finally {
          setBootstrapLoading(false);
        }
      };
      loadIdentity();
    }
  }, [isAuthenticated, currentEmail, dispatch, bootstrapLoading]);

  const handleAccept = async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');

    try {
      await apiClient(`/employee-invitations/${token}/accept`, {
        method: 'POST',
      });
      
      setSuccess(true);
      sessionStorage.removeItem('pending_invitation_token');

      // Re-bootstrap auth to get the new Employee profile
      const bootstrapState = await authService.bootstrap();
      dispatch(setAuth({ 
        accessToken: bootstrapState.accessToken || '', 
        refreshToken: bootstrapState.refreshToken || '',
        orgId: bootstrapState.organization?.id || null,
        employee: bootstrapState.employee || null,
        isInitialSetup: bootstrapState.isInitialSetup || false,
        umsUserEmail: bootstrapState.umsUserEmail || null,
      }));

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. It may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    // Basic sign out
    dispatch({ type: 'auth/logout' });
    navigate('/login');
  };

  if (detailsLoading || bootstrapLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-gray-500">Loading invitation details...</div>
      </div>
    );
  }

  if (detailsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{detailsError}</p>
          <Link to="/" className="text-blue-600 hover:underline">Go to Home</Link>
        </div>
      </div>
    );
  }

  if (!details) return null;

  if (details.status === 'EXPIRED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invitation Expired</h2>
          <p className="text-gray-600 mb-6">This invitation expired on {new Date(details.expiresAt).toLocaleDateString()}. Please request a new invitation.</p>
        </div>
      </div>
    );
  }

  if (details.status === 'CANCELLED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invitation Cancelled</h2>
          <p className="text-gray-600 mb-6">This invitation has been cancelled by the organization administrator.</p>
        </div>
      </div>
    );
  }

  if (details.status === 'ACCEPTED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <h2 className="text-xl font-bold text-blue-600 mb-2">Already Accepted</h2>
          <p className="text-gray-600 mb-6">This invitation has already been accepted.</p>
          <Link to="/login" className="text-blue-600 hover:underline">Log In</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h2>
          <p className="text-gray-600 mb-6">Your employee profile has been linked. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const isEmailMismatch = isAuthenticated && currentEmail && currentEmail !== details.email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Organization Invitation</h1>
        <p className="text-gray-600 mb-6">
          <strong>{details.inviterName}</strong> has invited you to join <strong>{details.organizationName}</strong> on Sify Workforce.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm text-left border">
          <div className="flex mb-2">
            <span className="w-24 text-gray-500">Name:</span>
            <span className="font-medium text-gray-900">{details.name}</span>
          </div>
          <div className="flex mb-2">
            <span className="w-24 text-gray-500">Email:</span>
            <span className="font-medium text-gray-900">{details.email}</span>
          </div>
          <div className="flex mb-2">
            <span className="w-24 text-gray-500">Role:</span>
            <span className="font-medium text-gray-900">{details.role}</span>
          </div>
          {details.teamName && (
            <div className="flex">
              <span className="w-24 text-gray-500">Team:</span>
              <span className="font-medium text-gray-900">{details.teamName}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-left">
            {error}
          </div>
        )}

        {isAuthenticated ? (
          !currentEmail ? (
            <div className="text-sm text-gray-500">Verifying your account details...</div>
          ) : isEmailMismatch ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm mb-6 border border-red-200 text-left">
                <strong>Email Mismatch:</strong> You are currently logged in as <strong>{currentEmail}</strong>, but this invitation is for <strong>{details.email}</strong>.
                <br /><br />
                Please sign out and log in (or register) using the correct email address to accept this invitation.
              </div>
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Accepting...' : 'Accept Invitation'}
              </button>
              <p className="text-xs text-gray-500">
                You will be joined using your current account ({currentEmail}).
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm mb-6 border border-blue-200">
              Please log in or register with <strong>{details.email}</strong> to accept this invitation.
            </div>
            <Link
              to="/login"
              className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Login with UMS
            </Link>
            <Link
              to="/register"
              className="block w-full py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Register with UMS
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

