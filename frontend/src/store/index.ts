import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './apiSlice';

const appReducer = combineReducers({
  auth: authReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout') {
    // Reset all slices on logout
    state = undefined;
  }
  return appReducer(state, action);
};

// Middleware to properly reset RTK Query state on logout before new identity
const logoutMiddleware = (store: any) => (next: any) => (action: any) => {
  if (action.type === 'auth/logout') {
    store.dispatch(apiSlice.util.resetApiState());
  }
  return next(action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, logoutMiddleware),
});

export type RootState = ReturnType<typeof appReducer>;
export type AppDispatch = typeof store.dispatch;
