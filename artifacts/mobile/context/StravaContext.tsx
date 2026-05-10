import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;
  total_elevation_gain: number;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile_medium: string;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface StravaContextType {
  isConnected: boolean;
  isLoading: boolean;
  athlete: StravaAthlete | null;
  activities: StravaActivity[];
  clientId: string;
  clientSecret: string;
  tokens: StravaTokens | null;
  saveTokens: (
    tokens: StravaTokens,
    athlete: StravaAthlete,
    cid: string,
    csecret: string
  ) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  error: string | null;
}

const STORAGE_KEYS = {
  tokens: "@strava/tokens",
  athlete: "@strava/athlete",
  activities: "@strava/activities",
  clientId: "@strava/clientId",
  clientSecret: "@strava/clientSecret",
};

const StravaContext = createContext<StravaContextType | null>(null);

async function fetchStravaActivities(
  accessToken: string
): Promise<StravaActivity[]> {
  const resp = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=20",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) throw new Error(`Strava API error: ${resp.status}`);
  return resp.json();
}

async function refreshStravaToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<StravaTokens> {
  const resp = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) throw new Error("Failed to refresh token");
  const data = await resp.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

export function StravaProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [tokens, setTokens] = useState<StravaTokens | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [rawTokens, rawAthlete, rawActivities, cid, csecret] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.tokens),
            AsyncStorage.getItem(STORAGE_KEYS.athlete),
            AsyncStorage.getItem(STORAGE_KEYS.activities),
            AsyncStorage.getItem(STORAGE_KEYS.clientId),
            AsyncStorage.getItem(STORAGE_KEYS.clientSecret),
          ]);

        if (cid) setClientId(cid);
        if (csecret) setClientSecret(csecret);

        if (rawTokens && rawAthlete) {
          const t: StravaTokens = JSON.parse(rawTokens);
          const a: StravaAthlete = JSON.parse(rawAthlete);
          setTokens(t);
          setAthlete(a);
          setIsConnected(true);
          if (rawActivities) setActivities(JSON.parse(rawActivities));
        }
      } catch {}
      setIsLoading(false);
    }
    load();
  }, []);

  const saveTokens = useCallback(
    async (
      t: StravaTokens,
      a: StravaAthlete,
      cid: string,
      csecret: string
    ) => {
      setTokens(t);
      setAthlete(a);
      setClientId(cid);
      setClientSecret(csecret);
      setIsConnected(true);
      setError(null);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(t)),
        AsyncStorage.setItem(STORAGE_KEYS.athlete, JSON.stringify(a)),
        AsyncStorage.setItem(STORAGE_KEYS.clientId, cid),
        AsyncStorage.setItem(STORAGE_KEYS.clientSecret, csecret),
      ]);
      try {
        const acts = await fetchStravaActivities(t.accessToken);
        setActivities(acts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.activities,
          JSON.stringify(acts)
        );
      } catch {}
    },
    []
  );

  const refreshActivities = useCallback(async () => {
    if (!tokens || !clientId || !clientSecret) return;
    setIsLoading(true);
    setError(null);
    try {
      let currentToken = tokens;
      if (Date.now() / 1000 > tokens.expiresAt - 300) {
        currentToken = await refreshStravaToken(
          tokens.refreshToken,
          clientId,
          clientSecret
        );
        setTokens(currentToken);
        await AsyncStorage.setItem(
          STORAGE_KEYS.tokens,
          JSON.stringify(currentToken)
        );
      }
      const acts = await fetchStravaActivities(currentToken.accessToken);
      setActivities(acts);
      await AsyncStorage.setItem(
        STORAGE_KEYS.activities,
        JSON.stringify(acts)
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch activities");
    }
    setIsLoading(false);
  }, [tokens, clientId, clientSecret]);

  const disconnect = useCallback(async () => {
    setIsConnected(false);
    setAthlete(null);
    setActivities([]);
    setTokens(null);
    setClientId("");
    setClientSecret("");
    await Promise.all(
      Object.values(STORAGE_KEYS).map((k) => AsyncStorage.removeItem(k))
    );
  }, []);

  return (
    <StravaContext.Provider
      value={{
        isConnected,
        isLoading,
        athlete,
        activities,
        clientId,
        clientSecret,
        tokens,
        saveTokens,
        disconnect,
        refreshActivities,
        error,
      }}
    >
      {children}
    </StravaContext.Provider>
  );
}

export function useStrava() {
  const ctx = useContext(StravaContext);
  if (!ctx) throw new Error("useStrava must be used within StravaProvider");
  return ctx;
}
