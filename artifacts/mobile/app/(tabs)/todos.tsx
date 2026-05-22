import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Todo, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

const TAG_OPTIONS = [
  { label: "Work", color: "#00F0FF" },
  { label: "Fitness", color: "#FF2D55" },
  { label: "Personal", color: "#39FF14" },
  { label: "Learning", color: "#BF5AF2" },
  { label: "Finance", color: "#FFD60A" },
];

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function TodoItem({ todo }: { todo: Todo }) {
  const colors = useColors();
  const { toggleTodo, deleteTodo } = useApp();

  function handlePress() {
    toggleTodo(todo.id);
    if (!todo.completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("", "Delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTodo(todo.id),
      },
    ]);
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.todoItem,
        {
          backgroundColor: colors.card,
          borderColor: todo.completed
            ? colors.border
            : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: todo.completed ? todo.tagColor : colors.mutedForeground,
            backgroundColor: todo.completed
              ? todo.tagColor
              : "transparent",
          },
        ]}
      >
        {todo.completed && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
      <Text
        style={[
          styles.todoText,
          {
            color: todo.completed ? colors.mutedForeground : colors.foreground,
            textDecorationLine: todo.completed ? "line-through" : "none",
          },
        ]}
        numberOfLines={2}
      >
        {todo.text}
      </Text>
      <View
        style={[
          styles.tagChip,
          { backgroundColor: todo.tagColor + "22" },
        ]}
      >
        <Text
          style={[
            styles.tagText,
            { color: todo.tagColor },
          ]}
        >
          {todo.tag}
        </Text>
      </View>
    </Pressable>
  );
}

function AddTodoModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { addTodo } = useApp();
  const [text, setText] = useState("");
  const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS[0]);

  function handleAdd() {
    if (!text.trim()) return;
    addTodo({
      text: text.trim(),
      tag: selectedTag.label,
      tagColor: selectedTag.color,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setText("");
    setSelectedTag(TAG_OPTIONS[0]);
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
            NEW TASK
          </Text>
          <Pressable onPress={onClose}>
            <Text
              style={[
                styles.modalCancel,
                { color: colors.mutedForeground },
              ]}
            >
              CANCEL
            </Text>
          </Pressable>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              TASK
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What needs to get done?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              autoFocus
              style={[
                styles.taskInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              TAG
            </Text>
            <View style={styles.tagRow}>
              {TAG_OPTIONS.map((tag) => (
                <Pressable
                  key={tag.label}
                  onPress={() => setSelectedTag(tag)}
                  style={[
                    styles.tagOption,
                    {
                      backgroundColor:
                        selectedTag.label === tag.label
                          ? tag.color
                          : tag.color + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagOptionText,
                      {
                        color:
                          selectedTag.label === tag.label ? "#fff" : tag.color,
                      },
                    ]}
                  >
                    {tag.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: selectedTag.color,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.addBtnText}>ADD TASK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function TodosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { todos } = useApp();
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const filtered = filterTag
    ? todos.filter((t) => t.tag === filterTag)
    : todos;
  const completed = todos.filter((t) => t.completed).length;

  const allTags = Array.from(new Set(todos.map((t) => t.tag)));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: bottomPad,
          paddingHorizontal: 16,
        }}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.screenHeader}>
              <View>
                <Text
                  style={[
                    styles.screenLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  TASKS
                </Text>
                <View style={styles.headerRow}>
                  <Text style={[styles.screenDate, { color: colors.foreground }]}>
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.completedCount,
                      { color: colors.mutedForeground, fontFamily: MONO },
                    ]}
                  >
                    {completed}/{todos.length}
                  </Text>
                </View>
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

            {/* Tag filters */}
            {allTags.length > 0 && (
              <View style={styles.tagFilters}>
                <Pressable
                  onPress={() => setFilterTag(null)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        filterTag === null
                          ? colors.foreground
                          : colors.secondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          filterTag === null
                            ? colors.background
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    ALL
                  </Text>
                </Pressable>
                {allTags.map((tag) => {
                  const tagOpt =
                    TAG_OPTIONS.find((t) => t.label === tag) ?? TAG_OPTIONS[0];
                  return (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        setFilterTag(filterTag === tag ? null : tag)
                      }
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor:
                            filterTag === tag
                              ? tagOpt.color
                              : tagOpt.color + "22",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color:
                              filterTag === tag ? "#fff" : tagOpt.color,
                          },
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <TodoItem todo={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View
            style={[styles.emptyBox, { borderColor: colors.border }]}
          >
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              {filterTag ? `No ${filterTag} tasks` : "No tasks"}
            </Text>
            <Text
              style={[
                styles.emptySubText,
                { color: colors.mutedForeground },
              ]}
            >
              Tap + ADD to create one
            </Text>
          </View>
        }
        scrollEnabled={filtered.length > 0}
      />

      <AddTodoModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 4,
  },
  screenDate: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  completedCount: {
    fontSize: 14,
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
  tagFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  todoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    flexShrink: 0,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  emptyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 48,
    alignItems: "center",
    gap: 8,
    marginTop: 16,
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
    paddingBottom: 16,
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
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  taskInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    fontFamily: "Inter_400Regular",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  tagOptionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
