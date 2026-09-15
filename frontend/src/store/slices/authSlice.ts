import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authStorage } from '../../lib/authUtils';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  orgId: string | null;
}

const initialState: AuthState = {
  isAuthenticated: !!authStorage.getAccessToken(),
  token: authStorage.getAccessToken(),
  refreshToken: authStorage.getRefreshToken(),
  orgId: authStorage.getOrgId(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; orgId?: string | null }>) => {
      state.isAuthenticated = true;
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.orgId = action.payload.orgId || null;

      authStorage.setTokens(action.payload.accessToken, action.payload.refreshToken);
      if (action.payload.orgId) {
        authStorage.setOrgId(action.payload.orgId);
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.orgId = null;
      authStorage.clear();
    },
  },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;
