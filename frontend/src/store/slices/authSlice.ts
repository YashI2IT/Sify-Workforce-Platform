import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authStorage } from '../../lib/authUtils';

export interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  onboardingRequired: boolean;
  token: string | null;
  refreshToken: string | null;
  orgId: string | null;
  employee: any | null;
  isInitialSetup: boolean;
  umsUserEmail: string | null;
}

const storedToken = authStorage.getAccessToken();

const initialState: AuthState = {
  isInitialized: !storedToken,
  isAuthenticated: !!storedToken,
  onboardingRequired: false,
  token: storedToken,
  refreshToken: authStorage.getRefreshToken(),
  orgId: authStorage.getOrgId(),
  employee: null,
  isInitialSetup: false,
  umsUserEmail: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        orgId?: string | null;
        employee?: any;
        isInitialSetup?: boolean;
        umsUserEmail?: string | null;
        onboardingRequired?: boolean;
      }>
    ) => {
      state.isInitialized = true;
      state.isAuthenticated = true;
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.orgId = action.payload.orgId || null;
      state.employee = action.payload.employee || null;

      // Keep auth state consistent: if authenticated but employee is null, onboardingRequired must be true
      state.onboardingRequired = action.payload.onboardingRequired !== undefined
        ? action.payload.onboardingRequired
        : !action.payload.employee;

      if (action.payload.isInitialSetup !== undefined) {
        state.isInitialSetup = action.payload.isInitialSetup;
      }
      if (action.payload.umsUserEmail !== undefined) {
        state.umsUserEmail = action.payload.umsUserEmail;
      }

      authStorage.setTokens(action.payload.accessToken, action.payload.refreshToken);
      if (action.payload.orgId) {
        authStorage.setOrgId(action.payload.orgId);
      }
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setUserData: (
      state,
      action: PayloadAction<{
        employee: any;
        orgId: string;
        isInitialSetup?: boolean;
      }>
    ) => {
      state.employee = action.payload.employee;
      state.orgId = action.payload.orgId;
      state.onboardingRequired = false;
      if (action.payload.isInitialSetup !== undefined) {
        state.isInitialSetup = action.payload.isInitialSetup;
      }
      authStorage.setOrgId(action.payload.orgId);
    },
    logout: (state) => {
      state.isInitialized = true;
      state.isAuthenticated = false;
      state.onboardingRequired = false;
      state.token = null;
      state.refreshToken = null;
      state.orgId = null;
      state.employee = null;
      state.isInitialSetup = false;
      state.umsUserEmail = null;
      authStorage.clear();
    },
  },
});

export const { setAuth, setInitialized, setUserData, logout } = authSlice.actions;
export default authSlice.reducer;
