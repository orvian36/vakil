"use client";
import { useReducer, useEffect, useRef } from 'react';
import { User, AuthState, AuthContextType } from '@/types/auth';
import authService from '@/services/authService';


// Action types
type AuthAction =
  | { type: 'INIT_START' }
  | { type: 'INIT_SUCCESS'; user: User | null; accessToken: string | null }
  | { type: 'INIT_ERROR'; error: string }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User; accessToken: string }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT_START' }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'LOGOUT_ERROR'; error: string }
  | { type: 'FETCH_USER_START' }
  | { type: 'FETCH_USER_SUCCESS'; user: User }
  | { type: 'FETCH_USER_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isInitialized: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'INIT_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: !!action.accessToken,
        user: action.user,
        error: null,
        isInitialized: true,
      };

    case 'INIT_ERROR':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.error,
        isInitialized: true,
      };

    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.user,
        error: null,
      };

    case 'LOGIN_ERROR':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.error,
      };

    case 'LOGOUT_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGOUT_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      };

    case 'LOGOUT_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    case 'FETCH_USER_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'FETCH_USER_SUCCESS':
      return {
        ...state,
        isLoading: false,
        user: action.user,
        error: null,
      };

    case 'FETCH_USER_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

export function useAuth(): AuthContextType {
  const [state, dispatch] = useReducer(authReducer, initialState);
  // const { addToast } = useToast(); // Replaced by shadCN toast
  const initAttempted = useRef(false);

  // Initialize auth state by checking cookies and user context
  const initializeAuth = async () => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    dispatch({ type: 'INIT_START' });

    try {
      // Get access token from cookies
      const accessToken = await authService.getAccessToken();
      
      if (!accessToken) {
        dispatch({ type: 'INIT_SUCCESS', user: null, accessToken: null });
        return;
      }

      // Get user context from middleware
      const user = await authService.getUserContext();
      
      if (user) {
        dispatch({ type: 'INIT_SUCCESS', user, accessToken });
      } else {
        // If no user context, try to fetch user data
        try {
          const fetchedUser = await authService.fetchUser(accessToken);
          dispatch({ type: 'INIT_SUCCESS', user: fetchedUser, accessToken });
        } catch (error) {
          console.error('Failed to fetch user:', error);
          dispatch({ type: 'INIT_SUCCESS', user: null, accessToken });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication initialization failed';
      dispatch({ type: 'INIT_ERROR', error: errorMessage });
      // addToast({ title: 'Authentication Error', message: errorMessage, type: 'error' }); // Replaced by shadCN toast
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Get current access token
  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await authService.getAccessToken();
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  };

  // Fetch user data
  const fetchUser = async (): Promise<void> => {
    dispatch({ type: 'FETCH_USER_START' });

    try {
      const accessToken = await authService.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const user = await authService.fetchUser(accessToken);
      dispatch({ type: 'FETCH_USER_SUCCESS', user });
      // addToast({ title: 'Success', message: 'User data updated successfully', type: 'success' }); // Replaced by shadCN toast
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user data';
      dispatch({ type: 'FETCH_USER_ERROR', error: errorMessage });
      // addToast({ title: 'Error', message: errorMessage, type: 'error' }); // Replaced by shadCN toast
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    dispatch({ type: 'LOGOUT_START' });

    try {
      await authService.logout();
      // Note: authService.logout() will redirect to external auth service
      // so the success dispatch may not execute
      dispatch({ type: 'LOGOUT_SUCCESS' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      dispatch({ type: 'LOGOUT_ERROR', error: errorMessage });
      
      // Even if logout API fails, redirect to external auth service
      window.location.href = 'https://platform.makebell.com/auth/logout';
    }
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh authentication state
  const refreshAuth = async (): Promise<void> => {
    initAttempted.current = false;
    await initializeAuth();
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    isInitialized: state.isInitialized,
    getAccessToken,
    fetchUser,
    logout,
    clearError,
    refreshAuth,
  };
} 