export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  lastSignInAt: string;
  createdAt: string;
  updatedAt: string;
  userMetadata: {
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
  };
  appMetadata: {
    provider: string;
    providers: string[];
  };
  identities: Identity[];
  profile: any;
}

export interface Identity {
  identity_id: string;
  id: string;
  user_id: string;
  identity_data: {
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
  };
  provider: string;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface AuthContextType extends AuthState {
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  getAccessToken: () => Promise<string | null>;
}

export enum AuthActionType {
  INIT_START = 'INIT_START',
  INIT_SUCCESS = 'INIT_SUCCESS',
  INIT_ERROR = 'INIT_ERROR',
  LOGIN_START = 'LOGIN_START',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_ERROR = 'LOGIN_ERROR',
  LOGOUT_START = 'LOGOUT_START',
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  LOGOUT_ERROR = 'LOGOUT_ERROR',
  REFRESH_START = 'REFRESH_START',
  REFRESH_SUCCESS = 'REFRESH_SUCCESS',
  REFRESH_ERROR = 'REFRESH_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  SET_USER = 'SET_USER',
}

export type AuthAction =
  | { type: AuthActionType.INIT_START }
  | { type: AuthActionType.INIT_SUCCESS; payload: { user: User | null; tokens: AuthTokens | null } }
  | { type: AuthActionType.INIT_ERROR; payload: string }
  | { type: AuthActionType.LOGIN_START }
  | { type: AuthActionType.LOGIN_SUCCESS; payload: { user: User; tokens: AuthTokens } }
  | { type: AuthActionType.LOGIN_ERROR; payload: string }
  | { type: AuthActionType.LOGOUT_START }
  | { type: AuthActionType.LOGOUT_SUCCESS }
  | { type: AuthActionType.LOGOUT_ERROR; payload: string }
  | { type: AuthActionType.REFRESH_START }
  | { type: AuthActionType.REFRESH_SUCCESS; payload: { user: User; tokens: AuthTokens } }
  | { type: AuthActionType.REFRESH_ERROR; payload: string }
  | { type: AuthActionType.CLEAR_ERROR }
  | { type: AuthActionType.SET_USER; payload: User };

export interface ApiError {
  message: string;
  status: number;
  code?: string;
} 