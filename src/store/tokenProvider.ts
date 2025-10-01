import store from './index';

/**
 * Token provider function for API service
 * Gets the current auth token from Redux store with localStorage fallback
 */
export const getAuthTokenFromStore = (): string | null => {
  try {
    const state = store.getState();

    // Return token from Redux if available (and not undefined)
    if (state.auth && state.auth.token && state.auth.token !== 'undefined' && state.auth.token !== 'null') {
      return state.auth.token;
    }

    // Fallback to localStorage if Redux store is not yet rehydrated
    const localToken = localStorage.getItem('auth_token');
    // Ensure we don't return the string 'undefined'
    return (localToken && localToken !== 'undefined' && localToken !== 'null') ? localToken : null;
  } catch (error) {
    // If Redux store is not available, fall back to localStorage
    const localToken = localStorage.getItem('auth_token');
    // Ensure we don't return the string 'undefined'
    return (localToken && localToken !== 'undefined' && localToken !== 'null') ? localToken : null;
  }
};

export default getAuthTokenFromStore;