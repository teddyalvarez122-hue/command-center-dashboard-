import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErgSession, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

const TARGET_TIME = 410;
const PROGRAM_START = new Date("2026-03-15");
const PROGRAM_WEEKS = 12;

const FEEL_COLORS: Record<number, string> = {
  1: "#FF453A",
  2: "#FF9F0A",
  3: "#FFD60A",
  4: "#30D158",
  5: "#00D26A",
};

const FEEL_LABELS: Record<number, string> = {
  1: "Rough",
  2: "Hard",
  3: "Solid",
  4: "Strong",
  5: "Peak",
};

function formatErgTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseErgTime(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0]) || 0;
  const s = parseInt(parts[1]) || 0;
  return m * 60 + s;
}

function getProgramWeek(): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - PROGRAM_START.getTime();
  return Math.min(Math.max(Math.ceil(elapsed / msPerWeek), 1), PROGRAM_WEEKS);
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ProgressionChart({
  sessions,
}: {
  sessions: ErgSession[];
}) {
  const colors = useColors();
  const [chartW, setChartW] = useState(0);

  const sorted = [...sessions]
    .filter((s) => s.type === "2k")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0 || chartW === 0) {
    return (
      <View
        style={{ height: 140 }}
        onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
      />
    );
  }

  const PAD = { top: 16, right: 8, bottom: 28, left: 44 };
  const W = chartW;
  const H = 140;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const CEILING = 450;
  const FLOOR = Math.min(TARGET_TIME - 5, ...sorted.map((s) => s.time));
  const range = CEILING - FLOOR;

  const xOf = (i: number) =>
    PAD.left + (sorted.length > 1 ? (i / (sorted.length - 1)) * plotW : plotW / 2);
  const yOf = (t: number) =>
    PAD.top + ((CEILING - t) / range) * plotH;

  const points = sorted.map((s, i) => ({ x: xOf(i), y: yOf(s.time) }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(H - PAD.bottom).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)} ${(H - PAD.bottom).toFixed(1)} Z`;

  const targetY = yOf(TARGET_TIME);

  const bestTime = Math.min(...sorted.map((s) => s.time));
  const latestTime = sorted[sorted.length - 1].time;

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
              <Line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke={isTarget ? colors.accent : colors.border}
                strokeWidth={isTarget ? 1.5 : 0.75}
                strokeDasharray={isTarget ? "5 4" : "3 4"}
              />
              <SvgText
                x={PAD.left - 4}
                y={y + 4}
                fill={isTarget ? colors.accent : colors.mutedForeground}
                fontSize={9}
                textAnchor="end"
                fontFamily={MONO ?? undefined}
              >
                {formatErgTime(t)}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Path d={areaPath} fill="url(#lineGrad)" />

        <Path
          d={linePath}
          stroke={colors.primary}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => {
          const s = sorted[i];
          const isLatest = i === sorted.length - 1;
          const isBest = s.time === bestTime;
          return (
            <React.Fragment key={s.id}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={isLatest ? 5 : 3.5}
                fill={isBest ? colors.accent : colors.primary}
                stroke={colors.background}
                strokeWidth={1.5}
              />
            </React.Fragment>
          );
        })}

        {sorted.map((s, i) => {
          if (i !== 0 && i !== sorted.length - 1 && sorted.length > 4) return null;
          const label = s.date.slice(5).replace("-", "/");
          return (
            <SvgText
              key={s.id + "_label"}
              x={xOf(i)}
              y={H - PAD.bottom + 14}
              fill={colors.mutedForeground}
              fontSize={9}
              textAnchor="middle"
              fontFamily={"Inter_400Regular"}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
            2K time
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendLine,
              { borderColor: colors.accent, borderStyle: "dashed" },
            ]}
          />
          <Text style={[styles.legendText, { color: colors.accent }]}>
            6:50 target
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
            PB
          </Text>
        </View>
      </View>
    </View>
  );
}

function FeelDot({ feel }: { feel: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <View
      style={[
        styles.feelDot,
        { backgroundColor: FEEL_COLORS[feel] + "33", borderColor: FEEL_COLORS[feel] },
      ]}
    >
      <Text style={[styles.feelDotText, { color: FEEL_COLORS[feel] }]}>
        {feel}
      </Text>
    </View>
  );
}

function SessionCard({ session, isPB }: { session: ErgSession; isPB: boolean }) {
  const colors = useColors();
  const { deleteErgSession } = useApp();

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(session.label, formatSessionDate(session.date), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteErgSession(session.id),
      },
    ]);
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.sessionCard,
        {
          backgroundColor: colors.card,
          borderColor: isPB ? colors.accent + "66" : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.sessionAccent,
          { backgroundColor: isPB ? colors.accent : FEEL_COLORS[session.feel] },
        ]}
      />

      <View style={styles.sessionBody}>
        <View style={styles.sessionTop}>
          <View style={styles.sessionMeta}>
            <Text
              style={[styles.sessionDate, { color: colors.mutedForeground }]}
            >
              {formatSessionDate(session.date)}
            </Text>
            <View style={styles.sessionBadgeRow}>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: colors.primary + "22" },
                ]}
              >
                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                  {session.type.toUpperCase()}
                </Text>
              </View>
              {isPB && (
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: colors.accent + "22" },
                  ]}
                >
                  <Text
                    style={[styles.typeBadgeText, { color: colors.accent }]}
                  >
                    PB
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sessionTimeBlock}>
            <Text
              style={[
                styles.sessionTime,
                {
                  color: isPB ? colors.accent : colors.primary,
                  fontFamily: MONO,
                },
              ]}
            >
              {formatErgTime(session.time)}
            </Text>
            <Text
              style={[styles.sessionSpm, { color: colors.mutedForeground }]}
            >
              {session.spm} SPM
            </Text>
          </View>
        </View>

        {session.splitTimes.length > 0 && (
          <View style={styles.splitsRow}>
            {session.splitTimes.map((split, i) => (
              <React.Fragment key={i}>
                <Text
                  style={[
                    styles.splitTime,
                    { color: colors.foreground, fontFamily: MONO },
                  ]}
                >
                  {split}
                </Text>
                {i < session.splitTimes.length - 1 && (
                  <Text
                    style={[
                      styles.splitDivider,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    |
                  </Text>
                )}
              </React.Fragment>
            ))}
            <Text
              style={[styles.splitLabel, { color: colors.mutedForeground }]}
            >
              /500m
            </Text>
          </View>
        )}

        <View style={styles.sessionBottom}>
          <FeelDot feel={session.feel} />
          <Text
            style={[styles.feelLabel, { color: FEEL_COLORS[session.feel] }]}
          >
            {FEEL_LABELS[session.feel]}
          </Text>
          {!!session.notes && (
            <Text
              style={[styles.sessionNotes, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              · {session.notes}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function AddSessionModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { addErgSession } = useApp();

  const [type, setType] = useState<ErgSession["type"]>("2k");
  const [date, setDate] = useState(todayISO());
  const [timeInput, setTimeInput] = useState("");
  const [splits, setSplits] = useState(["", "", "", ""]);
  const [spm, setSpm] = useState("");
  const [feel, setFeel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");

  const TYPES: { key: ErgSession["type"]; label: string; distance: number; splitCount: number }[] = [
    { key: "2k", label: "2K", distance: 2000, splitCount: 4 },
    { key: "4x500", label: "4×500", distance: 2000, splitCount: 4 },
    { key: "6k", label: "6K", distance: 6000, splitCount: 0 },
    { key: "10k", label: "10K", distance: 10000, splitCount: 0 },
    { key: "custom", label: "Custom", distance: 0, splitCount: 0 },
  ];

  const selectedType = TYPES.find((t) => t.key === type) ?? TYPES[0];
  const showSplits = selectedType.splitCount > 0;

  function handleAdd() {
    const parsedTime = parseErgTime(timeInput);
    if (!parsedTime || !date) {
      Alert.alert("Required", "Enter a valid date and time (mm:ss)");
      return;
    }
    addErgSession({
      date,
      type,
      label: `${selectedType.label} Test`,
      distance: selectedType.distance,
      time: parsedTime,
      splitTimes: showSplits ? splits.filter(Boolean) : [],
      spm: parseInt(spm) || 0,
      feel,
      notes: notes.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setType("2k");
    setDate(todayISO());
    setTimeInput("");
    setSplits(["", "", "", ""]);
    setSpm("");
    setFeel(3);
    setNotes("");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.modalHandle}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            LOG SESSION
          </Text>
          <Pressable onPress={onClose}>
            <Text
              style={[styles.modalCancel, { color: colors.mutedForeground }]}
            >
              CANCEL
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              TYPE
            </Text>
            <View style={styles.typeRow}>
              {TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setType(t.key)}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor:
                        type === t.key
                          ? colors.primary
                          : colors.primary + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      { color: type === t.key ? "#fff" : colors.primary },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text
                style={[styles.fieldLabel, { color: colors.mutedForeground }]}
              >
                DATE
              </Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.modalInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    fontFamily: MONO,
                  },
                ]}
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text
                style={[styles.fieldLabel, { color: colors.mutedForeground }]}
              >
                TIME (MM:SS)
              </Text>
              <TextInput
                value={timeInput}
                onChangeText={setTimeInput}
                placeholder="6:50"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.modalInput,
                  {
                    color: colors.primary,
                    backgroundColor: colors.input,
                    borderColor: colors.primary + "44",
                    fontFamily: MONO,
                    fontSize: 18,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {showSplits && (
            <View style={styles.fieldGroup}>
              <Text
                style={[styles.fieldLabel, { color: colors.mutedForeground }]}
              >
                500M SPLITS
              </Text>
              <View style={styles.splitsInputRow}>
                {splits.map((s, i) => (
                  <TextInput
                    key={i}
                    value={s}
                    onChangeText={(v) => {
                      const next = [...splits];
                      next[i] = v;
                      setSplits(next);
                    }}
                    placeholder="1:45"
                    placeholderTextColor={colors.mutedForeground}
                    style={[
                      styles.splitInput,
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
                ))}
              </View>
            </View>
          )}

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text
                style={[styles.fieldLabel, { color: colors.mutedForeground }]}
              >
                SPM
              </Text>
              <TextInput
                value={spm}
                onChangeText={setSpm}
                placeholder="28"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[
                  styles.modalInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    fontFamily: MONO,
                  },
                ]}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 2 }]}>
              <Text
                style={[styles.fieldLabel, { color: colors.mutedForeground }]}
              >
                FEEL
              </Text>
              <View style={styles.feelRow}>
                {([1, 2, 3, 4, 5] as const).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFeel(f)}
                    style={[
                      styles.feelSelector,
                      {
                        backgroundColor:
                          feel === f
                            ? FEEL_COLORS[f]
                            : FEEL_COLORS[f] + "33",
                        borderWidth: feel === f ? 0 : 1,
                        borderColor: FEEL_COLORS[f],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.feelSelectorText,
                        { color: feel === f ? "#000" : FEEL_COLORS[f] },
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              NOTES
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it feel? Any observations..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                styles.notesInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            />
          </View>

          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.addBtnText}>LOG SESSION</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ergSessions } = useApp();
  const [showModal, setShowModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const sorted = [...ergSessions].sort((a, b) => b.date.localeCompare(a.date));
  const bestTime = ergSessions.length
    ? Math.min(...ergSessions.map((s) => s.time))
    : null;
  const latestTime = sorted.length > 0 ? sorted[0].time : null;
  const programWeek = getProgramWeek();
  const weeksLeft = Math.max(PROGRAM_WEEKS - programWeek, 0);
  const secondsLeft = latestTime ? latestTime - TARGET_TIME : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: bottomPad,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <View>
            <Text
              style={[styles.screenLabel, { color: colors.mutedForeground }]}
            >
              ERG TRAINING LOG
            </Text>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              12-Week Program
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowModal(true);
            }}
            style={[styles.fabSmall, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.fabSmallText}>+ LOG</Text>
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.statBig,
                { color: colors.accent, fontFamily: MONO },
              ]}
            >
              {bestTime ? formatErgTime(bestTime) : "—"}
            </Text>
            <Text
              style={[styles.statSub, { color: colors.mutedForeground }]}
            >
              CURRENT PB
            </Text>
          </View>

          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.statBig,
                { color: colors.primary, fontFamily: MONO },
              ]}
            >
              {formatErgTime(TARGET_TIME)}
            </Text>
            <Text
              style={[styles.statSub, { color: colors.mutedForeground }]}
            >
              TARGET
            </Text>
          </View>

          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.statBig,
                { color: colors.foreground, fontFamily: MONO },
              ]}
            >
              {programWeek}/{PROGRAM_WEEKS}
            </Text>
            <Text
              style={[styles.statSub, { color: colors.mutedForeground }]}
            >
              PROGRAM WK
            </Text>
          </View>

          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.statBig,
                {
                  color: secondsLeft && secondsLeft <= 0
                    ? colors.accent
                    : colors.foreground,
                  fontFamily: MONO,
                },
              ]}
            >
              {secondsLeft != null
                ? secondsLeft <= 0
                  ? "DONE"
                  : `-${secondsLeft}s`
                : "—"}
            </Text>
            <Text
              style={[styles.statSub, { color: colors.mutedForeground }]}
            >
              TO TARGET
            </Text>
          </View>
        </View>

        {/* Progression Chart */}
        {ergSessions.length > 0 && (
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.chartTitle, { color: colors.mutedForeground }]}
            >
              2K PROGRESSION
            </Text>
            <ProgressionChart sessions={ergSessions} />
          </View>
        )}

        {/* Gap indicator */}
        {secondsLeft != null && secondsLeft > 0 && (
          <View
            style={[
              styles.gapCard,
              {
                backgroundColor: colors.primary + "11",
                borderColor: colors.primary + "33",
              },
            ]}
          >
            <Text style={[styles.gapText, { color: colors.primary }]}>
              <Text style={{ fontFamily: MONO, fontWeight: "700" }}>
                {secondsLeft}s{" "}
              </Text>
              off target · {weeksLeft} weeks left to find it
            </Text>
          </View>
        )}

        {/* Sessions List */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, marginTop: 20 },
          ]}
        >
          ALL SESSIONS ({ergSessions.length})
        </Text>

        {sorted.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              No sessions logged
            </Text>
            <Text
              style={[styles.emptySubText, { color: colors.mutedForeground }]}
            >
              Tap + LOG to record your first session
            </Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sorted.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                isPB={s.time === bestTime}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AddSessionModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  screenLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  fabSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  fabSmallText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  statBox: {
    flex: 1,
    minWidth: "22%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statBig: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textAlign: "center",
  },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
    paddingLeft: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 16,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
  },
  legendText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  gapCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  gapText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 10,
  },
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  sessionAccent: {
    width: 4,
    flexShrink: 0,
  },
  sessionBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  sessionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sessionMeta: {
    gap: 4,
    flex: 1,
  },
  sessionDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  sessionBadgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  sessionTimeBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  sessionTime: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -1,
  },
  sessionSpm: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  splitsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  splitTime: {
    fontSize: 13,
    fontWeight: "600",
  },
  splitDivider: {
    fontSize: 12,
  },
  splitLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
  sessionBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feelDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feelDotText: {
    fontSize: 10,
    fontWeight: "700",
  },
  feelLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  sessionNotes: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  emptyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 48,
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
  modalContainer: {
    flex: 1,
  },
  modalHandle: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  modalCancel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  splitsInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  splitInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: "center",
  },
  feelRow: {
    flexDirection: "row",
    gap: 8,
  },
  feelSelector: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  feelSelectorText: {
    fontSize: 14,
    fontWeight: "700",
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
  },
  addBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  addBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 2,
  },
});
