import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Goal, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

const GOAL_COLORS = ["#00F0FF", "#39FF14", "#FF2D55", "#BF5AF2", "#FFD60A", "#FF9F0A"];

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min(current / target, 1);
  const progress = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 900 });
  }, [pct]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: containerWidth * progress.value,
  }));

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[styles.barTrack, { backgroundColor: color + "22" }]}
    >
      <Animated.View style={[styles.barFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const colors = useColors();
  const { updateGoal, deleteGoal } = useApp();
  const pct = Math.min((goal.current / goal.target) * 100, 100);
  const isComplete = goal.current >= goal.target;
  const [editing, setEditing] = useState(false);
  const [newValue, setNewValue] = useState(goal.current.toString());
  const inputRef = useRef<TextInput>(null);

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(goal.title, "What do you want to do?", [
      { text: "Cancel", style: "cancel" },
      { text: "Update Progress", onPress: () => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 100); } },
      { text: "Delete", style: "destructive", onPress: () => deleteGoal(goal.id) },
    ]);
  }

  function handleSaveProgress() {
    const val = parseFloat(newValue);
    if (!isNaN(val)) {
      updateGoal(goal.id, { current: val });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditing(false);
    Keyboard.dismiss();
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.goalCard,
        {
          backgroundColor: colors.card,
          borderColor: isComplete ? goal.color + "66" : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleRow}>
          <View style={[styles.goalDot, { backgroundColor: goal.color }]} />
          <Text style={[styles.goalTitle, { color: colors.foreground }]} numberOfLines={1}>
            {goal.title}
          </Text>
          {isComplete && (
            <View style={[styles.completeBadge, { backgroundColor: goal.color + "33" }]}>
              <Text style={[styles.completeBadgeText, { color: goal.color }]}>DONE</Text>
            </View>
          )}
        </View>
        <View style={styles.goalValues}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                ref={inputRef}
                value={newValue}
                onChangeText={setNewValue}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleSaveProgress}
                style={[
                  styles.editInput,
                  {
                    color: goal.color,
                    borderColor: goal.color,
                    backgroundColor: colors.input,
                    fontFamily: MONO,
                  },
                ]}
                autoFocus
              />
              <Pressable onPress={handleSaveProgress} hitSlop={8}>
                <Text style={[styles.saveText, { color: goal.color }]}>SAVE</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setEditing(true); setNewValue(goal.current.toString()); setTimeout(() => inputRef.current?.focus(), 100); }}>
              <Text style={[styles.goalCurrent, { color: goal.color, fontFamily: MONO }]}>
                {goal.unit === "$" ? `$${goal.current.toLocaleString()}` : `${goal.current} ${goal.unit}`}
              </Text>
            </Pressable>
          )}
          <Text style={[styles.goalTarget, { color: colors.mutedForeground, fontFamily: MONO }]}>
            /{" "}
            {goal.unit === "$" ? `$${goal.target.toLocaleString()}` : `${goal.target} ${goal.unit}`}
          </Text>
        </View>
      </View>

      <ProgressBar current={goal.current} target={goal.target} color={goal.color} />

      <View style={styles.goalFooter}>
        <Text style={[styles.goalPct, { color: goal.color, fontFamily: MONO }]}>{Math.round(pct)}%</Text>
        <Text style={[styles.goalRemaining, { color: colors.mutedForeground }]}>
          {goal.current >= goal.target
            ? "Completed"
            : `${
                goal.unit === "$"
                  ? `$${(goal.target - goal.current).toLocaleString()}`
                  : `${(goal.target - goal.current).toFixed(goal.current % 1 !== 0 ? 1 : 0)} ${goal.unit}`
              } remaining`}
        </Text>
      </View>
    </Pressable>
  );
}

function AddGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { addGoal } = useApp();
  const [title, setTitle] = useState("");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const titleRef = useRef<TextInput>(null);
  const currentRef = useRef<TextInput>(null);
  const targetRef = useRef<TextInput>(null);
  const unitRef = useRef<TextInput>(null);

  function handleAdd() {
    if (!title.trim() || !target.trim()) return;
    addGoal({
      title: title.trim(),
      current: parseFloat(current) || 0,
      target: parseFloat(target) || 1,
      unit: unit.trim() || "units",
      color: selectedColor,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle("");
    setCurrent("");
    setTarget("");
    setUnit("");
    setSelectedColor(GOAL_COLORS[0]);
    Keyboard.dismiss();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHandle}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>NEW GOAL</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>CANCEL</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TITLE</Text>
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 2K Erg — 6:50"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              onSubmitEditing={() => currentRef.current?.focus()}
              style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CURRENT</Text>
              <TextInput
                ref={currentRef}
                value={current}
                onChangeText={setCurrent}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => targetRef.current?.focus()}
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: MONO }]}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TARGET</Text>
              <TextInput
                ref={targetRef}
                value={target}
                onChangeText={setTarget}
                placeholder="100"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => unitRef.current?.focus()}
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: MONO }]}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>UNIT</Text>
            <TextInput
              ref={unitRef}
              value={unit}
              onChangeText={setUnit}
              placeholder="km, books, sessions, $..."
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderWidth: selectedColor === c ? 2 : 0,
                      borderColor: "#fff",
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: selectedColor, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.addBtnText}>ADD GOAL</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals } = useApp();
  const [showModal, setShowModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const completed = goals.filter((g) => g.current >= g.target).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: bottomPad,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.screenHeader}>
          <View>
            <Text style={[styles.screenLabel, { color: colors.mutedForeground }]}>GOALS</Text>
            <Text style={[styles.screenStat, { color: colors.foreground }]}>
              <Text style={{ color: colors.accent, fontFamily: MONO }}>{completed}</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: MONO, fontSize: 18 }}>
                /{goals.length}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" }}>
                {" "}complete
              </Text>
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowModal(true);
            }}
            style={[styles.fabSmall, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.fabSmallText}>+ ADD</Text>
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No goals yet</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Tap + ADD to create your first goal</Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        )}
      </ScrollView>

      <AddGoalModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 },
  screenLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  screenStat: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 4 },
  fabSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  fabSmallText: { color: "#050508", fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  goalsList: { gap: 10 },
  goalCard: { borderRadius: 10, borderWidth: 1, padding: 16, gap: 12 },
  goalHeader: { gap: 8 },
  goalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  completeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  completeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  goalValues: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  goalCurrent: { fontSize: 20, fontWeight: "700" },
  goalTarget: { fontSize: 14 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 16, width: 100, height: 36 },
  saveText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  goalFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalPct: { fontSize: 12, fontWeight: "700" },
  goalRemaining: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyBox: { borderRadius: 10, borderWidth: 1, borderStyle: "dashed", padding: 48, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  emptySubText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalContainer: { flex: 1 },
  modalHandle: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  modalCancel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  modalScrollView: { flex: 1 },
  modalContent: { paddingHorizontal: 20, paddingBottom: 48, gap: 18 },
  fieldGroup: { gap: 8 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  modalInput: { height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  colorRow: { flexDirection: "row", gap: 10 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  addBtn: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  addBtnText: { color: "#050508", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 2 },
});
