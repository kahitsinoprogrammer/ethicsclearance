import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  setStoredToken,
  type AuthUser,
  type LoginPayload
} from "@/lib/api";

type AuthContextValue = {
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  token: string | null;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(token));

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(token);

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        clearStoredToken();

        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (payload: LoginPayload) => {
    const loginResult = await loginUser(payload);

    setStoredToken(loginResult.token);
    setToken(loginResult.token);
    setUser(loginResult.user);
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user?.is_active && user?.is_verified),
      isInitializing,
      login,
      logout,
      token,
      user
    }),
    [isInitializing, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
