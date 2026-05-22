import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
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
import { useApp } from "@/context/AppContext";

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

function formatRowingPace(distance: number, movingTime: number) {
  if (distance === 0) return "--:--";
  const paceSecPer500 = (movingTime / distance) * 500;
  const mins = Math.floor(paceSecPer500 / 60);
  const secs = Math.floor(paceSecPer500 % 60);
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

function isRowingActivity(a: StravaActivity): boolean {
  const t = a.sport_type.toLowerCase();
  return t === "rowing" || t === "virtualrow" || t === "indoorrowing";
}

function isRunActivity(a: StravaActivity): boolean {
  const t = a.sport_type.toLowerCase();
  return t.includes("run");
}

function isRideActivity(a: StravaActivity): boolean {
  const t = a.sport_type.toLowerCase();
  return t.includes("ride") || t.includes("cycling") || t.includes("bike");
}

function sportLabel(a: StravaActivity): string {
  if (isRowingActivity(a)) return "ROWING";
  if (isRunActivity(a)) return "RUNNING";
  if (isRideActivity(a)) return "BIKING";
  return a.sport_type.toUpperCase();
}

function sportColor(a: StravaActivity, colors: ReturnType<typeof useColors>): string {
  if (isRowingActivity(a)) return colors.primary;
  if (isRunActivity(a)) return "#FF2D55";
  if (isRideActivity(a)) return "#FFD60A";
  return colors.accent;
}

function getErgWeeklyStats(ergSessions: ReturnType<typeof useApp>["ergSessions"]) {
  const now = new Date();
  const day = now.getDay();
  const daysFromMon = day === 0 ? 6 : day - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - daysFromMon);
  startOfWeek.setHours(0, 0, 0, 0);
  const weekSessions = ergSessions.filter(
    (s) => new Date(s.date + "T00:00:00") >= startOfWeek
  );
  const totalMeters = weekSessions.reduce((sum, s) => sum + s.distance, 0);
  const bestTime = ergSessions.length
    ? Math.min(...ergSessions.map((s) => s.time))
    : null;
  return { count: weekSessions.length, meters: totalMeters, bestTime };
}

function formatErgTimeDash(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ErgWeeklyWidget() {
  const colors = useColors();
  const { ergSessions } = useApp();
  const stats = getErgWeeklyStats(ergSessions);
  const secondsLeft = stats.bestTime ? stats.bestTime - 410 : null;

  return (
    <View
      style={[
        styles.ergWidget,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.ergWidgetLeft}>
        <Text style={[styles.ergWidgetLabel, { color: colors.mutedForeground }]}>
          ERG THIS WEEK
        </Text>
        <View style={styles.ergWidgetMetrics}>
          <View style={styles.ergMetric}>
            <Text style={[styles.ergMetricVal, { color: colors.primary, fontFamily: MONO }]}>
              {stats.count}
            </Text>
            <Text style={[styles.ergMetricUnit, { color: colors.mutedForeground }]}>
              sessions
            </Text>
          </View>
          <View style={[styles.ergDivider, { backgroundColor: colors.border }]} />
          <View style={styles.ergMetric}>
            <Text style={[styles.ergMetricVal, { color: colors.foreground, fontFamily: MONO }]}>
              {stats.meters >= 1000
                ? `${(stats.meters / 1000).toFixed(1)}k`
                : stats.meters.toString()}
            </Text>
            <Text style={[styles.ergMetricUnit, { color: colors.mutedForeground }]}>
              meters
            </Text>
          </View>
          {stats.bestTime != null && (
            <>
              <View style={[styles.ergDivider, { backgroundColor: colors.border }]} />
              <View style={styles.ergMetric}>
                <Text style={[styles.ergMetricVal, { color: colors.accent, fontFamily: MONO }]}>
                  {formatErgTimeDash(stats.bestTime)}
                </Text>
                <Text style={[styles.ergMetricUnit, { color: colors.mutedForeground }]}>
                  PB 2K
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.ergWidgetRight}>
        {secondsLeft != null && secondsLeft > 0 && (
          <View style={[styles.ergGapPill, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.ergGapText, { color: colors.primary, fontFamily: MONO }]}>
              -{secondsLeft}s
            </Text>
            <Text style={[styles.ergGapSub, { color: colors.mutedForeground }]}>to go</Text>
          </View>
        )}
        {secondsLeft != null && secondsLeft <= 0 && (
          <View style={[styles.ergGapPill, { backgroundColor: colors.accent + "22" }]}>
            <Text style={[styles.ergGapText, { color: colors.accent }]}>TARGET</Text>
            <Text style={[styles.ergGapSub, { color: colors.accent }]}>HIT!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getWeeklyStatsBySport(activities: StravaActivity[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeek = activities.filter((a) => new Date(a.start_date) >= startOfWeek);
  const rowing = thisWeek.filter(isRowingActivity);
  const running = thisWeek.filter(isRunActivity);
  const biking = thisWeek.filter(isRideActivity);
  return {
    rowing: {
      count: rowing.length,
      distance: rowing.reduce((s, a) => s + a.distance, 0),
      time: rowing.reduce((s, a) => s + a.moving_time, 0),
      elevation: rowing.reduce((s, a) => s + a.total_elevation_gain, 0),
    },
    running: {
      count: running.length,
      distance: running.reduce((s, a) => s + a.distance, 0),
      time: running.reduce((s, a) => s + a.moving_time, 0),
      elevation: running.reduce((s, a) => s + a.total_elevation_gain, 0),
    },
    biking: {
      count: biking.length,
      distance: biking.reduce((s, a) => s + a.distance, 0),
      time: biking.reduce((s, a) => s + a.moving_time, 0),
      elevation: biking.reduce((s, a) => s + a.total_elevation_gain, 0),
    },
  };
}

function SportStatCard({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: accent, fontFamily: MONO }]}>{value}</Text>
      <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>{unit}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function SportSection({ sport, stats, color }: { sport: string; stats: { count: number; distance: number; time: number; elevation: number }; color: string }) {
  const colors = useColors();
  if (stats.count === 0) return null;
  return (
    <View style={styles.sportSection}>
      <View style={styles.sportHeader}>
        <View style={[styles.sportDot, { backgroundColor: color }]} />
        <Text style={[styles.sportLabel, { color }]}>{sport}</Text>
        <Text style={[styles.sportCount, { color: colors.mutedForeground, fontFamily: MONO }]}>{stats.count}</Text>
      </View>
      <View style={styles.statsGrid}>
        <SportStatCard label="DISTANCE" value={formatDistance(stats.distance)} unit="km" accent={color} />
        <SportStatCard label="TIME" value={formatTime(stats.time)} unit="active" accent={color} />
        {stats.elevation > 0 && (
          <SportStatCard label="ELEVATION" value={Math.round(stats.elevation).toString()} unit="m gain" accent={color} />
        )}
      </View>
    </View>
  );
}

function ActivityRow({ activity, onPress }: { activity: StravaActivity; onPress: () => void }) {
  const colors = useColors();
  const color = sportColor(activity, colors);
  const isRowing = isRowingActivity(activity);
  const pace = isRowing ? formatRowingPace(activity.distance, activity.moving_time) : formatPace(activity.distance, activity.moving_time);
  const paceUnit = isRowing ? "/500m" : "/km";
  const dist = formatDistance(activity.distance);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityRow,
        { borderBottomColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.activityIconBadge, { backgroundColor: color + "22" }]}>
        <Text style={[styles.activityIcon, { color }]}>{isRowing ? "R" : isRunActivity(activity) ? "→" : "⟳"}</Text>
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={1}>{activity.name}</Text>
        <Text style={[styles.activityDate, { color: colors.mutedForeground }]}>
          {formatDate(activity.start_date)} · {formatTime(activity.moving_time)}
        </Text>
      </View>
      <View style={styles.activityStats}>
        <Text style={[styles.activityDist, { color, fontFamily: MONO }]}>{dist}</Text>
        <Text style={[styles.activityUnit, { color: colors.mutedForeground }]}>km</Text>
        <Text style={[styles.activityPace, { color: colors.mutedForeground, fontFamily: MONO }]}>{pace}{paceUnit}</Text>
      </View>
    </Pressable>
  );
}

function ActivityDetailModal({ activity, visible, onClose }: { activity: StravaActivity | null; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  if (!activity) return null;
  const isRowing = isRowingActivity(activity);
  const color = sportColor(activity, colors);
  const pace = isRowing ? formatRowingPace(activity.distance, activity.moving_time) : formatPace(activity.distance, activity.moving_time);
  const paceUnit = isRowing ? "/500m" : "/km";

  const stats = [
    { label: "DISTANCE", value: `${formatDistance(activity.distance)} km`, accent: color },
    { label: "MOVING TIME", value: formatTime(activity.moving_time), accent: colors.foreground },
    { label: "AVG PACE", value: `${pace} ${paceUnit}`, accent: color },
    { label: "AVG SPEED", value: `${(activity.average_speed * 3.6).toFixed(1)} km/h`, accent: colors.foreground },
    { label: "ELEVATION", value: `${Math.round(activity.total_elevation_gain)} m`, accent: colors.foreground },
    { label: "SPORT", value: sportLabel(activity), accent: color },
  ];
  if (activity.average_heartrate) {
    stats.push({ label: "AVG HR", value: `${Math.round(activity.average_heartrate)} bpm`, accent: "#FF2D55" });
  }
  if (activity.max_heartrate) {
    stats.push({ label: "MAX HR", value: `${Math.round(activity.max_heartrate)} bpm`, accent: "#FF2D55" });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHandle}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>ACTIVITY DETAIL</Text>
          <Pressable onPress={onClose}><Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>CLOSE</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.detailHeader, { backgroundColor: color + "11", borderColor: color + "44" }]}>
            <Text style={[styles.detailName, { color: colors.foreground }]}>{activity.name}</Text>
            <Text style={[styles.detailDate, { color: colors.mutedForeground }]}>
              {new Date(activity.start_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </Text>
            <View style={[styles.detailSportBadge, { backgroundColor: color + "22" }]}>
              <Text style={[styles.detailSportText, { color }]}>{sportLabel(activity)}</Text>
            </View>
          </View>
          <View style={styles.detailStats}>
            {stats.map((s) => (
              <View key={s.label} style={[styles.detailStatRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                <Text style={[styles.detailStatValue, { color: s.accent, fontFamily: MONO }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ConnectScreen({ onConnect }: { onConnect: () => void }) {
  const colors = useColors();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { saveTokens } = useStrava();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "mobile" });
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    { clientId: clientId || "__placeholder__", scopes: ["activity:read_all"], redirectUri, responseType: AuthSession.ResponseType.Code, extraParams: { approval_prompt: "auto" } },
    { authorizationEndpoint: "https://www.strava.com/oauth/authorize" }
  );

  async function handleConnect() {
    if (!clientId.trim() || !clientSecret.trim()) { Alert.alert("Required", "Enter your Strava Client ID and Secret"); return; }
    setConnecting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await promptAsync();
      if (!result || result.type === "cancel" || result.type === "dismiss") return;
      if (result.type === "error") { Alert.alert("Connection failed", result.error?.message ?? "OAuth error"); return; }
      if (result.type === "success") {
        const { code } = result.params;
        const resp = await fetch("https://www.strava.com/oauth/token", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" }),
        });
        if (!resp.ok) throw new Error(`Token exchange failed (${resp.status})`);
        const data = await resp.json();
        await saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at }, data.athlete, clientId, clientSecret);
        onConnect();
      }
    } catch (e: unknown) { Alert.alert("Connection Error", e instanceof Error ? e.message : "Something went wrong."); }
    finally { setConnecting(false); }
  }

  return (
    <View style={styles.connectContainer}>
      <View style={[styles.connectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.stravaBadge, { backgroundColor: colors.primary + "22" }]}>
          <Text style={[styles.stravaLogo, { color: colors.primary }]}>S</Text>
        </View>
        <Text style={[styles.connectTitle, { color: colors.foreground }]}>Connect Strava</Text>
        <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>Pull runs, rides, and workouts.</Text>
        <View style={styles.instructionBlock}>
          {["Go to strava.com/settings/api", "Create an API application", 'Set "Authorization Callback Domain" to localhost', "Copy your Client ID and Client Secret below"].map((step, i) => (
            <View key={i} style={styles.instructionRow}>
              <Text style={[styles.instructionNum, { color: colors.primary, fontFamily: MONO }]}>{i + 1}.</Text>
              <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>{step}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => Linking.openURL("https://www.strava.com/settings/api")} style={({ pressed }) => [styles.openStravaBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.openStravaBtnText, { color: colors.foreground }]}>Open Strava API Settings</Text>
        </Pressable>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>CLIENT ID</Text>
          <TextInput value={clientId} onChangeText={setClientId} placeholder="e.g. 123456" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: MONO }]} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>CLIENT SECRET</Text>
          <TextInput value={clientSecret} onChangeText={setClientSecret} placeholder="e.g. abc123..." placeholderTextColor={colors.mutedForeground} secureTextEntry style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: MONO }]} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={styles.redirectInfo}>
          <Text style={[styles.redirectLabel, { color: colors.mutedForeground }]}>REDIRECT URI</Text>
          <Text style={[styles.redirectUri, { color: colors.accent, fontFamily: MONO }]}>{redirectUri}</Text>
        </View>
        <Pressable onPress={handleConnect} disabled={connecting || !request} style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.primary, opacity: pressed || connecting ? 0.75 : 1 }]}>
          {connecting ? <ActivityIndicator color="#050508" size="small" /> : <Text style={styles.connectBtnText}>Connect with Strava</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function ConnectedDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const sydneyTime = useSydneyTime();
  const { activities, isLoading, refreshActivities, disconnect, error } = useStrava();
  const weekly = getWeeklyStatsBySport(activities);
  const recent = activities.slice(0, 8);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad, paddingHorizontal: 16 }} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshActivities} tintColor={colors.primary} />}>
      <View style={styles.dashHeader}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.dashGreeting, { color: colors.mutedForeground }]}>COMMAND CENTER</Text>
          <Text style={[styles.dashClock, { color: colors.primary, fontFamily: MONO }]}>{sydneyTime}</Text>
          <Text style={[styles.dashLocation, { color: colors.mutedForeground }]}>Sydney, Australia</Text>
        </View>
        <Pressable onPress={() => { Alert.alert("Disconnect", "Remove Strava connection?", [{ text: "Cancel", style: "cancel" }, { text: "Disconnect", style: "destructive", onPress: disconnect }]); }} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={[styles.disconnectText, { color: colors.mutedForeground }]}>DISCONNECT</Text>
        </Pressable>
      </View>
      <ErgWeeklyWidget />
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>THIS WEEK — BY SPORT</Text>
      <SportSection sport="ROWING" stats={weekly.rowing} color={colors.primary} />
      <SportSection sport="RUNNING" stats={weekly.running} color="#FF2D55" />
      <SportSection sport="BIKING" stats={weekly.biking} color="#FFD60A" />
      {weekly.rowing.count === 0 && weekly.running.count === 0 && weekly.biking.count === 0 && (
        <View style={[styles.emptyBox, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No activities this week</Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Pull to refresh</Text>
        </View>
      )}
      {error && <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive }]}><Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text></View>}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>RECENT ACTIVITIES</Text>
      {recent.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No activities found</Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Pull to refresh</Text>
        </View>
      ) : (
        <View style={[styles.activitiesList, { borderColor: colors.border }]}>
          {recent.map((act) => (
            <ActivityRow key={act.id} activity={act} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedActivity(act); }} />
          ))}
        </View>
      )}
      <ActivityDetailModal activity={selectedActivity} visible={!!selectedActivity} onClose={() => setSelectedActivity(null)} />
    </ScrollView>
  );
}

function SydneyClockInline() {
  const colors = useColors();
  const time = useSydneyTime();
  return (
    <View style={{ gap: 1 }}>
      <Text style={{ color: colors.primary, fontFamily: MONO, fontSize: 28, fontWeight: "700", letterSpacing: -1 }}>{time}</Text>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, letterSpacing: 1 }}>Sydney, Australia</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { isConnected, isLoading } = useStrava();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [connected, setConnected] = useState(false);
  useEffect(() => { setConnected(isConnected); }, [isConnected]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  if (isLoading && !isConnected) {
    return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!connected) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: topPad + 16, paddingHorizontal: 16, gap: 2 }}>
          <Text style={[styles.dashGreeting, { color: colors.mutedForeground }]}>COMMAND CENTER</Text>
          <SydneyClockInline />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled">
          <ErgWeeklyWidget />
          <ConnectScreen onConnect={() => setConnected(true)} />
        </ScrollView>
      </View>
    );
  }

  return <ConnectedDashboard />;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  connectContainer: { padding: 16, paddingBottom: 100 },
  connectCard: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: "center", gap: 16 },
  stravaBadge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  stravaLogo: { fontSize: 28, fontWeight: "800" },
  connectTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  connectSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  instructionBlock: { width: "100%", gap: 8, paddingVertical: 4 },
  instructionRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  instructionNum: { fontSize: 13, fontWeight: "600", width: 16 },
  instructionText: { fontSize: 13, flex: 1, lineHeight: 18 },
  openStravaBtn: { width: "100%", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  openStravaBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inputGroup: { width: "100%", gap: 6 },
  inputLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  input: { width: "100%", height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  redirectInfo: { width: "100%", gap: 4 },
  redirectLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  redirectUri: { fontSize: 11, lineHeight: 16 },
  connectBtn: { width: "100%", paddingVertical: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 4, minHeight: 48 },
  connectBtnText: { color: "#050508", fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 0.3 },
  dashHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  dashGreeting: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  dashClock: { fontSize: 28, fontWeight: "700", letterSpacing: -1, marginTop: 2 },
  dashLocation: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 1 },
  disconnectText: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 1.5 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 10 },
  sportSection: { marginBottom: 16 },
  sportHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sportDot: { width: 8, height: 8, borderRadius: 4 },
  sportLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  sportCount: { fontSize: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: { flex: 1, minWidth: "45%", borderRadius: 10, borderWidth: 1, padding: 14, gap: 2 },
  statValue: { fontSize: 28, fontWeight: "700", letterSpacing: -1 },
  statUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginTop: 4 },
  errorBox: { borderRadius: 8, borderWidth: 1, padding: 12, marginTop: 8 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  activitiesList: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  activityRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1 },
  activityIconBadge: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  activityIcon: { fontSize: 14, fontWeight: "800" },
  activityInfo: { flex: 1, gap: 3 },
  activityName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  activityDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  activityStats: { alignItems: "flex-end", gap: 2 },
  activityDist: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  activityUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  activityPace: { fontSize: 11 },
  emptyBox: { borderRadius: 10, borderWidth: 1, borderStyle: "dashed", padding: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  emptySubText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ergWidget: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  ergWidgetLeft: { flex: 1, gap: 8 },
  ergWidgetLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  ergWidgetMetrics: { flexDirection: "row", alignItems: "center", gap: 12 },
  ergMetric: { alignItems: "flex-start", gap: 1 },
  ergMetricVal: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  ergMetricUnit: { fontSize: 9, fontFamily: "Inter_400Regular" },
  ergDivider: { width: 1, height: 28, borderRadius: 1 },
  ergWidgetRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  ergGapPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", gap: 1 },
  ergGapText: { fontSize: 14, fontWeight: "700", letterSpacing: -0.5 },
  ergGapSub: { fontSize: 8, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  modalContainer: { flex: 1 },
  modalHandle: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  modalCancel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  modalContent: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
  detailHeader: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  detailName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  detailDate: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  detailSportBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  detailSportText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  detailStats: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  detailStatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  detailStatLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  detailStatValue: { fontSize: 16, fontWeight: "700" },
});
