import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useStrava, StravaActivity } from "@/context/StravaContext";

const MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

function useSydneyTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-AU", {
          timeZone: "Australia/Sydney",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function SydneyClockInline() {
  const colors = useColors();
  const time = useSydneyTime();
  return (
    <View style={{ gap: 1 }}>
      <Text style={{ color: colors.primary, fontFamily: MONO, fontSize: 28, fontWeight: "700", letterSpacing: -1 }}>
        {time}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, letterSpacing: 1 }}>
        Sydney, Australia
      </Text>
    </View>
  );
}

function formatDistance(meters: number) {
  return (meters / 1000).toFixed(2);
}

function formatPace(distance: number, movingTime: number) {
  if (distance === 0) return "--:--";
  const paceSecPerKm = movingTime / (distance / 1000);
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.floor(paceSecPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityIcon(sportType: string) {
  const type = sportType.toLowerCase();
  if (type.includes("run")) return "→";
  if (type.includes("ride") || type.includes("cycling")) return "⟳";
  if (type.includes("swim")) return "~";
  if (type.includes("walk") || type.includes("hike")) return "↑";
  return "◆";
}

function getWeeklyStats(activities: StravaActivity[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeek = activities.filter(
    (a) => new Date(a.start_date) >= startOfWeek
  );

  return {
    runs: thisWeek.length,
    distance: thisWeek.reduce((s, a) => s + a.distance, 0),
    time: thisWeek.reduce((s, a) => s + a.moving_time, 0),
    elevation: thisWeek.reduce((s, a) => s + a.total_elevation_gain, 0),
  };
}

function WeeklyStatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.statValue, { color: accent, fontFamily: MONO }]}>
        {value}
      </Text>
      <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>
        {unit}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function ActivityRow({ activity }: { activity: StravaActivity }) {
  const colors = useColors();
  const pace = formatPace(activity.distance, activity.moving_time);
  const dist = formatDistance(activity.distance);

  return (
    <View
      style={[
        styles.activityRow,
        { borderBottomColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <View
        style={[
          styles.activityIconBadge,
          { backgroundColor: colors.primary + "22" },
        ]}
      >
        <Text style={[styles.activityIcon, { color: colors.primary }]}>
          {activityIcon(activity.sport_type)}
        </Text>
      </View>
      <View style={styles.activityInfo}>
        <Text
          style={[styles.activityName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {activity.name}
        </Text>
        <Text style={[styles.activityDate, { color: colors.mutedForeground }]}>
          {formatDate(activity.start_date)} · {formatTime(activity.moving_time)}
        </Text>
      </View>
      <View style={styles.activityStats}>
        <Text style={[styles.activityDist, { color: colors.primary, fontFamily: MONO }]}>
          {dist}
        </Text>
        <Text style={[styles.activityUnit, { color: colors.mutedForeground }]}>
          km
        </Text>
        <Text style={[styles.activityPace, { color: colors.mutedForeground, fontFamily: MONO }]}>
          {pace}/km
        </Text>
        {activity.average_heartrate && (
          <Text style={[styles.activityHR, { color: "#FF453A", fontFamily: MONO }]}>
            {Math.round(activity.average_heartrate)} bpm
          </Text>
        )}
      </View>
    </View>
  );
}

function ConnectScreen({ onConnect }: { onConnect: () => void }) {
  const colors = useColors();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { saveTokens } = useStrava();

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "mobile" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId || "__placeholder__",
      scopes: ["activity:read_all"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { approval_prompt: "auto" },
    },
    { authorizationEndpoint: "https://www.strava.com/oauth/authorize" }
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      handleCodeExchange(code);
    } else if (response?.type === "error") {
      setConnecting(false);
      Alert.alert("Connection failed", response.error?.message ?? "OAuth error");
    } else if (response?.type === "cancel" || response?.type === "dismiss") {
      setConnecting(false);
    }
  }, [response]);

  async function handleCodeExchange(code: string) {
    try {
      const resp = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });
      if (!resp.ok) throw new Error("Token exchange failed");
      const data = await resp.json();
      await saveTokens(
        {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at,
        },
        data.athlete,
        clientId,
        clientSecret
      );
      onConnect();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  async function handleConnect() {
    if (!clientId.trim() || !clientSecret.trim()) {
      Alert.alert("Required", "Enter your Strava Client ID and Secret");
      return;
    }
    setConnecting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await promptAsync();
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.connectContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.connectCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.stravaBadge,
            { backgroundColor: colors.primary + "22" },
          ]}
        >
          <Text style={[styles.stravaLogo, { color: colors.primary }]}>S</Text>
        </View>
        <Text style={[styles.connectTitle, { color: colors.foreground }]}>
          Connect Strava
        </Text>
        <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
          Pull runs, rides, and workouts — distance, pace, heart rate.
        </Text>

        <View style={styles.instructionBlock}>
          {[
            "Go to strava.com/settings/api",
            "Create an API application",
            'Set "Authorization Callback Domain" to localhost',
            "Copy your Client ID and Client Secret below",
          ].map((step, i) => (
            <View key={i} style={styles.instructionRow}>
              <Text
                style={[
                  styles.instructionNum,
                  { color: colors.primary, fontFamily: MONO },
                ]}
              >
                {i + 1}.
              </Text>
              <Text
                style={[
                  styles.instructionText,
                  { color: colors.mutedForeground },
                ]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() =>
            Linking.openURL("https://www.strava.com/settings/api")
          }
          style={({ pressed }) => [
            styles.openStravaBtn,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.openStravaBtnText, { color: colors.foreground }]}>
            Open Strava API Settings
          </Text>
        </Pressable>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
            CLIENT ID
          </Text>
          <TextInput
            value={clientId}
            onChangeText={setClientId}
            placeholder="e.g. 123456"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.input,
                borderColor: colors.border,
                fontFamily: MONO,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
            CLIENT SECRET
          </Text>
          <TextInput
            value={clientSecret}
            onChangeText={setClientSecret}
            placeholder="e.g. abc123..."
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.input,
                borderColor: colors.border,
                fontFamily: MONO,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.redirectInfo}>
          <Text style={[styles.redirectLabel, { color: colors.mutedForeground }]}>
            REDIRECT URI (add to Strava app)
          </Text>
          <Text
            style={[
              styles.redirectUri,
              { color: colors.accent, fontFamily: MONO },
            ]}
          >
            {redirectUri}
          </Text>
        </View>

        <Pressable
          onPress={handleConnect}
          disabled={connecting || !request}
          style={({ pressed }) => [
            styles.connectBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed || connecting ? 0.75 : 1,
            },
          ]}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.connectBtnText}>Connect with Strava</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ConnectedDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const sydneyTime = useSydneyTime();
  const { athlete, activities, isLoading, refreshActivities, disconnect, error } =
    useStrava();
  const weekly = getWeeklyStats(activities);
  const recent = activities.slice(0, 8);

  const topPad =
    Platform.OS === "web" ? 67 : insets.top;
  const bottomPad =
    Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: bottomPad,
        paddingHorizontal: 16,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshActivities}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.dashHeader}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.dashGreeting, { color: colors.mutedForeground }]}>
            COMMAND CENTER — TEDDY
          </Text>
          <Text style={[styles.dashClock, { color: colors.primary, fontFamily: MONO }]}>
            {sydneyTime}
          </Text>
          <Text style={[styles.dashLocation, { color: colors.mutedForeground }]}>
            Sydney, Australia
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert("Disconnect", "Remove Strava connection?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Disconnect",
                style: "destructive",
                onPress: disconnect,
              },
            ]);
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={[styles.disconnectText, { color: colors.mutedForeground }]}>
            DISCONNECT
          </Text>
        </Pressable>
      </View>

      {/* This Week Label */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        THIS WEEK
      </Text>

      {/* Weekly Stats */}
      <View style={styles.statsGrid}>
        <WeeklyStatCard
          label="DISTANCE"
          value={formatDistance(weekly.distance)}
          unit="km"
          accent={colors.primary}
        />
        <WeeklyStatCard
          label="ACTIVITIES"
          value={weekly.runs.toString()}
          unit="total"
          accent={colors.accent}
        />
        <WeeklyStatCard
          label="TIME"
          value={formatTime(weekly.time)}
          unit="active"
          accent="#4DA6FF"
        />
        <WeeklyStatCard
          label="ELEVATION"
          value={Math.round(weekly.elevation).toString()}
          unit="m gain"
          accent="#BF5AF2"
        />
      </View>

      {/* Error */}
      {error && (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.destructive + "22",
              borderColor: colors.destructive,
            },
          ]}
        >
          <Text
            style={[styles.errorText, { color: colors.destructive }]}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Recent Activities */}
      <Text
        style={[
          styles.sectionLabel,
          { color: colors.mutedForeground, marginTop: 24 },
        ]}
      >
        RECENT ACTIVITIES
      </Text>

      {recent.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No activities found
          </Text>
          <Text
            style={[styles.emptySubText, { color: colors.mutedForeground }]}
          >
            Pull to refresh
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.activitiesList,
            { borderColor: colors.border },
          ]}
        >
          {recent.map((act) => (
            <ActivityRow key={act.id} activity={act} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const { isConnected, isLoading } = useStrava();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  if (isLoading && !isConnected) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!connected) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            paddingTop: topPad + 16,
            paddingHorizontal: 16,
            gap: 2,
          }}
        >
          <Text style={[styles.dashGreeting, { color: colors.mutedForeground }]}>
            COMMAND CENTER — TEDDY
          </Text>
          <SydneyClockInline />
        </View>
        <ConnectScreen onConnect={() => setConnected(true)} />
      </View>
    );
  }

  return <ConnectedDashboard />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  connectContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  connectCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  stravaBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  stravaLogo: {
    fontSize: 28,
    fontWeight: "800",
  },
  connectTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  connectSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  instructionBlock: {
    width: "100%",
    gap: 8,
    paddingVertical: 4,
  },
  instructionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  instructionNum: {
    fontSize: 13,
    fontWeight: "600",
    width: 16,
  },
  instructionText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  openStravaBtn: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  openStravaBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  inputGroup: {
    width: "100%",
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  redirectInfo: {
    width: "100%",
    gap: 4,
  },
  redirectLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  redirectUri: {
    fontSize: 11,
    lineHeight: 16,
  },
  connectBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    minHeight: 48,
  },
  connectBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  dashHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  dashGreeting: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  dashClock: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
    marginTop: 2,
  },
  dashLocation: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
  },
  dashName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  disconnectText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
  },
  statUnit: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  activitiesList: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  activityIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activityIcon: {
    fontSize: 16,
    fontWeight: "800",
  },
  activityInfo: {
    flex: 1,
    gap: 3,
  },
  activityName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  activityDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  activityStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  activityDist: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  activityUnit: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  activityPace: {
    fontSize: 11,
  },
  activityHR: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  emptySubText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
