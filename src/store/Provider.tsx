/**
 * Redux Provider Component
 *
 * Wraps the app with Redux store and persistence
 * Provides state management foundation to solve navigation state loss
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './index';
import { setTokenProvider } from '../services/centralizedApi';
import getAuthTokenFromStore from './tokenProvider';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  useEffect(() => {
    // Set up token provider for API service after store is initialized
    setTokenProvider(getAuthTokenFromStore);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        }
        persistor={persistor}
      >
        {children}
      </PersistGate>
    </Provider>
  );
};

export default StoreProvider;