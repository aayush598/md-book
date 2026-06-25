import { create } from "zustand";
import { useAuth as useClerkAuth } from "@clerk/nextjs";

interface AuthState {
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  userId: null,
  isLoaded: false,
  isSignedIn: false,
}));

export function useAuth() {
  const { userId, isLoaded, isSignedIn } = useClerkAuth();
  const store = useAuthStore();

  if (isLoaded && store.userId !== userId) {
    useAuthStore.setState({ userId, isLoaded, isSignedIn });
  }

  return { userId, isLoaded, isSignedIn };
}
