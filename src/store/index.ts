/**
 * Redux Store Configuration
 *
 * Combines all slices and implements persistence to solve state management issues
 * Addresses the problems found in the audit:
 * - State loss during navigation
 * - No state persistence across page refreshes
 * - Poor state synchronization
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';
import notificationReducer from './notificationSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  // Only persist auth and dashboard data that should survive refreshes
  whitelist: ['auth', 'dashboard']
};

// Auth slice persistence - keep tokens and user data
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'refreshToken', 'isAuthenticated', 'tokenExpiresAt']
};

// Dashboard slice persistence - keep website data to prevent refetching
const dashboardPersistConfig = {
  key: 'dashboard',
  storage,
  whitelist: ['websites', 'overview', 'chatStats', 'websitesLastFetch', 'overviewLastFetch', 'chatStatsLastFetch'],
  // Don't persist loading states or errors
  blacklist: ['websitesLoading', 'overviewLoading', 'chatStatsLoading', 'websitesError', 'overviewError', 'chatStatsError', 'crawlStatusesLoading', 'crawlStatusesError']
};

// Create persisted reducers
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedDashboardReducer = persistReducer(dashboardPersistConfig, dashboardReducer);

// Combine all reducers
const rootReducer = combineReducers({
  auth: persistedAuthReducer,
  dashboard: persistedDashboardReducer,
  notifications: notificationReducer, // Don't persist notifications
});

// Create persisted root reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with persistence and Redux DevTools
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.MODE === 'development',
});

// Create persistor for the store
export const persistor = persistStore(store);

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for use in components
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;