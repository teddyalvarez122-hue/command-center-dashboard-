import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import Svg, {
  Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErgSession, useApp } from "@/context/AppContext";
import { useStrava, StravaActivity } from "@/context/StravaContext";
import { useColors } from "@/hooks/useColors";

const MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });
const TARGET_TIME = 410; // 6:50 in seconds
const PROGRAM_START = new Date("2026-03-15");
const PROGRAM_WEEKS = 12;

const FEEL_COLORS: Record<number, string> = {
  1: "#FF453A", 2: "#FF9F0A", 3: "#FFD60A", 4: "#30D158", 5: "#00D26A",
};
const FEEL_LABELS: Record<number, string> = {
  1: "Rough", 2: "Hard", 3: "Solid", 4: "Strong", 5: "Peak",
};

function formatErgTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseErgTime(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length !== 2) return 0;
  return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

function getProgramWeek(): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - PROGRAM_START.getTime();
  return Math.min(Math.max(Math.ceil(elapsed / msPerWeek), 1), PROGRAM_WEEKS);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function formatPace(speedMs: number, isRowing = false): string {
  if (!speedMs) return "--";
  const secsPerKm = 1000 / speedMs;
  if (isRowing) {
    // Rowing pace is per 500m
    const secsPer500 = secsPerKm / 2;
    const m = Math.floor(secsPer500 / 60);
    const s = Math.round(secsPer500 % 60);
    return `${m}:${s.toString().padStart(2, "0")}/500m`;
  }
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// Convert a Strava rowing activity to an ErgSession-like display object
function stravaRowToErg(a: StravaActivity) {
  return {
    id: `strava_${a.id}`,
    name: a.name,
    date: a.start_date.slice(0, 10),
    distance: a.distance,
    time: a.moving_time,
    avgPace: formatPace(a.average_speed, true),
    heartrate: a.average_heartrate,
    fromStrava: true,
  };
}

function StravaRowCard({ activity }: { activity: StravaActivity }) {
  const colors = useColors();
  const erg = stravaRowToErg(activity);
  const is2k = Math.abs(activity.distance - 2000) < 100;
  const timeStr = formatErgTime(activity.moving_time);

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.sessionAccent, { backgroundColor: colors.primary }]} />
      <View style={styles.sessionBody}>
        <View style={styles.sessionTop}>
          <View style={styles.sessionMeta}>
            <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>{formatDate(erg.date)}</Text>
            <View style={styles.sessionBadgeRow}>
              {is2k && (
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.primary }]}>2K</Text>
                </View>
              )}
              <View style={[styles.typeBadge, { backgroundColor: "#FF4500" + "22" }]}>
                <Text style={[styles.typeBadgeText, { color: "#FF4500" }]}>STRAVA</Text>
              </View>
            </View>
          </View>
          <View style={styles.sessionTimeBlock}>
            <Text style={[styles.sessionTime, { color: colors.primary, fontFamily: MONO }]}>{timeStr}</Text>
            <Text style={[styles.sessionSpm, { color: colors.mutedForeground }]}>{formatDistance(erg.distance)}</Text>
          </View>
        </View>
        <View style={styles.stravaStatRow}>
          <View style={styles.strataStat}>
            <Text style={[styles.stravaStatVal, { color: colors.foreground, fontFamily: MONO }]}>{erg.avgPace}</Text>
            <Text style={[styles.stravaStatLabel, { color: colors.mutedForeground }]}>AVG PACE</Text>
          </View>
          {erg.heartrate ? (
            <View style={styles.strataStat}>
              <Text style={[styles.stravaStatVal, { color: "#FF453A", fontFamily: MONO }]}>{Math.round(erg.heartrate)} bpm</Text>
              <Text style={[styles.stravaStatLabel, { color: colors.mutedForeground }]}>AVG HR</Text>
            </View>
          ) : null}
          <View style={styles.strataStat}>
            <Text style={[styles.stravaStatVal, { color: colors.foreground, fontFamily: MONO }]}>{erg.name}</Text>
            <Text style={[styles.stravaStatLabel, { color: colors.mutedForeground }]}>ACTIVITY</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StravaActivityCard({ activity }: { activity: StravaActivity }) {
  const colors = useColors();
  const isRide = isRideActivity(activity);
  const date = formatDate(activity.start_date);

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.sessionAccent, { backgroundColor: isRide ? "#FFD60A" : "#30D158" }]} />
      <View style={styles.sessionBody}>
        <View style={styles.sessionTop}>
          <View style={styles.sessionMeta}>
            <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>{date}</Text>
            <Text style={[styles.sessionNotes, { color: colors.foreground }]} numberOfLines={1}>{activity.name}</Text>
          </View>
          <View style={styles.sessionTimeBlock}>
            <Text style={[styles.sessionTime, { color: isRide ? "#FFD60A" : "#30D158", fontFamily: MONO, fontSize: 20 }]}>
              {formatDistance(activity.distance)}
            </Text>
            <Text style={[styles.sessionSpm, { color: colors.mutedForeground }]}>{formatDuration(activity.moving_time)}</Text>
          </View>
        </View>
        <View style={styles.stravaStatRow}>
          <View style={styles.strataStat}>
            <Text style={[styles.stravaStatVal, { color: colors.foreground, fontFamily: MONO }]}>
              {formatPace(activity.average_speed, false)}
            </Text>
            <Text style={[styles.stravaStatLabel, { color: colors.mutedForeground }]}>PACE</Text>
          </View>
          {activity.average_heartrate ? (
            <View style={styles.strataStat}>
              <Text style={[styles.stravaStatVal, { color: "#FF453A", fontFamily: MONO }]}>
                {Math.round(activity.average_heartrate)} bpm
              </Text>
              <Text style={[styles.stravaStatLabel, { color: colors.mutedForeground }]}>AVG HR</Text>
            </View>
          ) : null}
          {activity.total_elevation_gain > 0 && (
            <View style={styles.strataStat}>
              <Text style={[styles.stravaStatVal, { color: colors.foreground, fontFamily: MONO }]}>
                {Math.round(activity.total_elevation_gain)}m
              </Text>
              <Text style={[styles.stravaStatLabel, { color: colors.mutedForeground }]}>ELEV</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ProgressionChart({ sessions, stravaRows }: { sessions: ErgSession[]; stravaRows: StravaActivity[] }) {
  const colors = useColors();
  const [chartW, setChartW] = useState(0);

  // Combine manual 2K sessions with Strava 2K rows
  const stravaPoints = stravaRows
    .filter((a) => Math.abs(a.distance - 2000) < 100)
    .map((a) => ({ date: a.start_date.slice(0, 10), time: a.moving_time, id: `s_${a.id}`, fromStrava: true }));

  const manualPoints = sessions
    .filter((s) => s.type === "2k")
    .map((s) => ({ date: s.date, time: s.time, id: s.id, fromStrava: false }));

  const sorted = [...manualPoints, ...stravaPoints].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0 || chartW === 0) {
    return <View style={{ height: 140 }} onLayout={(e) => setChartW(e.nativeEvent.layout.width)} />;
  }

  const PAD = { top: 16, right: 8, bottom: 28, left: 44 };
  const W = chartW;
  const H = 140;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const CEILING = 450;
  const FLOOR = Math.min(TARGET_TIME - 5, ...sorted.map((s) => s.time));
  const range = CEILING - FLOOR;
  const xOf = (i: number) => PAD.left + (sorted.length > 1 ? (i / (sorted.length - 1)) * plotW : plotW / 2);
  const yOf = (t: number) => PAD.top + ((CEILING - t) / range) * plotH;
  const points = sorted.map((s, i) => ({ x: xOf(i), y: yOf(s.time) }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = linePath +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(H - PAD.bottom).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)} ${(H - PAD.bottom).toFixed(1)} Z`;
  const bestTime = Math.min(...sorted.map((s) => s.time));
  const yAxisTimes = [450, 430, 420, 410];

  return (
    <View onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {yAxisTimes.map((t) => {
          const y = yOf(t);
          if (y < PAD.top - 4 || y > H - PAD.bottom + 4) return null;
          const isTarget = t === TARGET_TIME;
          return (
            <React.Fragment key={t}>
              <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke={isTarget ? colors.accent : colors.border}
                strokeWidth={isTarget ? 1.5 : 0.75}
                strokeDasharray={isTarget ? "5 4" : "3 4"} />
              <SvgText x={PAD.left - 4} y={y + 4} fill={isTarget ? colors.accent : colors.mutedForeground}
                fontSize={9} textAnchor="end" fontFamily={MONO ?? undefined}>
                {formatErgTime(t)}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Path d={areaPath} fill="url(#lineGrad)" />
        <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const s = sorted[i];
          const isBest = s.time === bestTime;
          return (
            <Circle key={s.id} cx={p.x} cy={p.y} r={i === sorted.length - 1 ? 5 : 3.5}
              fill={isBest ? colors.accent : colors.primary}
              stroke={colors.background} strokeWidth={1.5} />
          );
        })}
        {sorted.map((s, i) => {
          if (i !== 0 && i !== sorted.length - 1 && sorted.length > 4) return null;
          return (
            <SvgText key={s.id + "_l"} x={xOf(i)} y={H - PAD.bottom + 14}
              fill={colors.mutedForeground} fontSize={9} textAnchor="middle" fontFamily="Inter_400Regular">
              {s.date.slice(5).replace("-", "/")}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>2K time</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { borderColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.accent }]}>6:50 target</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>PB</Text>
        </View>
      </View>
    </View>
  );
}

function FeelDot({ feel }: { feel: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <View style={[styles.feelDot, { backgroundColor: FEEL_COLORS[feel] + "33", borderColor: FEEL_COLORS[feel] }]}>
      <Text style={[styles.feelDotText, { color: FEEL_COLORS[feel] }]}>{feel}</Text>
    </View>
  );
}

function SessionCard({ session, isPB }: { session: ErgSession; isPB: boolean }) {
  const colors = useColors();
  const { deleteErgSession } = useApp();

  return (
    <Pressable onLongPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(session.label, formatSessionDate(session.date), [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteErgSession(session.id) },
      ]);
    }} style={({ pressed }) => [styles.sessionCard, {
      backgroundColor: colors.card,
      borderColor: isPB ? colors.accent + "66" : colors.border,
      opacity: pressed ? 0.8 : 1,
    }]}>
      <View style={[styles.sessionAccent, { backgroundColor: isPB ? colors.accent : FEEL_COLORS[session.feel] }]} />
      <View style={styles.sessionBody}>
        <View style={styles.sessionTop}>
          <View style={styles.sessionMeta}>
            <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>{formatSessionDate(session.date)}</Text>
            <View style={styles.sessionBadgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{session.type.toUpperCase()}</Text>
              </View>
              {isPB && (
                <View style={[styles.typeBadge, { backgroundColor: colors.accent + "22" }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.accent }]}>PB</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.sessionTimeBlock}>
            <Text style={[styles.sessionTime, { color: isPB ? colors.accent : colors.primary, fontFamily: MONO }]}>
              {formatErgTime(session.time)}
            </Text>
            <Text style={[styles.sessionSpm, { color: colors.mutedForeground }]}>{session.spm} SPM</Text>
          </View>
        </View>
        {session.splitTimes.length > 0 && (
          <View style={styles.splitsRow}>
            {session.splitTimes.map((split, i) => (
              <React.Fragment key={i}>
                <Text style={[styles.splitTime, { color: colors.foreground, fontFamily: MONO }]}>{split}</Text>
                {i < session.splitTimes.length - 1 && (
                  <Text style={[styles.splitDivider, { color: colors.mutedForeground }]}>|</Text>
                )}
              </React.Fragment>
            ))}
            <Text style={[styles.splitLabel, { color: colors.mutedForeground }]}>/500m</Text>
          </View>
        )}
        <View style={styles.sessionBottom}>
          <FeelDot feel={session.feel} />
          <Text style={[styles.feelLabel, { color: FEEL_COLORS[session.feel] }]}>{FEEL_LABELS[session.feel]}</Text>
          {!!session.notes && (
            <Text style={[styles.sessionNotes, { color: colors.mutedForeground }]} numberOfLines={1}>· {session.notes}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function AddSessionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { addErgSession } = useApp();
  const [type, setType] = useState<ErgSession["type"]>("2k");
  const [date, setDate] = useState(todayISO());
  const [timeInput, setTimeInput] = useState("");
  const [splits, setSplits] = useState(["", "", "", ""]);
  const [spm, setSpm] = useState("");
  const [feel, setFeel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");

  const TYPES = [
    { key: "2k" as const, label: "2K", distance: 2000, splitCount: 4 },
    { key: "4x500" as const, label: "4×500", distance: 2000, splitCount: 4 },
    { key: "6k" as const, label: "6K", distance: 6000, splitCount: 0 },
    { key: "10k" as const, label: "10K", distance: 10000, splitCount: 0 },
    { key: "custom" as const, label: "Custom", distance: 0, splitCount: 0 },
  ];
  const selectedType = TYPES.find((t) => t.key === type) ?? TYPES[0];

  function handleAdd() {
    const parsedTime = parseErgTime(timeInput);
    if (!parsedTime || !date) { Alert.alert("Required", "Enter a valid date and time (mm:ss)"); return; }
    addErgSession({ date, type, label: `${selectedType.label} Test`, distance: selectedType.distance,
      time: parsedTime, splitTimes: selectedType.splitCount > 0 ? splits.filter(Boolean) : [],
      spm: parseInt(spm) || 0, feel, notes: notes.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setType("2k"); setDate(todayISO()); setTimeInput(""); setSplits(["", "", "", ""]); setSpm(""); setFeel(3); setNotes("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHandle}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>LOG SESSION</Text>
          <Pressable onPress={onClose}><Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>CANCEL</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TYPE</Text>
            <View style={styles.typeRow}>
              {TYPES.map((t) => (
                <Pressable key={t.key} onPress={() => setType(t.key)}
                  style={[styles.typePill, { backgroundColor: type === t.key ? colors.primary : colors.primary + "22" }]}>
                  <Text style={[styles.typePillText, { color: type === t.key ? "#fff" : colors.primary }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground} autoCapitalize="none"
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: MONO }]} />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TIME (MM:SS)</Text>
              <TextInput value={timeInput} onChangeText={setTimeInput} placeholder="6:50"
                placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoCorrect={false}
                style={[styles.modalInput, { color: colors.primary, backgroundColor: colors.input, borderColor: colors.primary + "44", fontFamily: MONO, fontSize: 18 }]} />
            </View>
          </View>
          {selectedType.splitCount > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>500M SPLITS</Text>
              <View style={styles.splitsInputRow}>
                {splits.map((s, i) => (
                  <TextInput key={i} value={s} placeholder="1:45" placeholderTextColor={colors.mutedForeground}
                    onChangeText={(v) => { const next = [...splits]; next[i] = v; setSplits(next); }}
                    autoCapitalize="none" autoCorrect={false}
                    style={[styles.splitInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: MONO }]} />
                ))}
              </View>
            </View>
          )}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1
