import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Project, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

const PROJECT_COLORS = [
  "#FF2D55",
  "#39FF14",
  "#00F0FF",
  "#BF5AF2",
  "#FFD60A",
  "#FF9F0A",
];

const STATUS_CONFIG = {
  active: { label: "ACTIVE", color: "#39FF14" },
  paused: { label: "PAUSED", color: "#FFD60A" },
  completed: { label: "DONE", color: "#00F0FF" },
};

function ProjectCard({ project }: { project: Project }) {
  const colors = useColors();
  const { deleteProject, updateProject } = useApp();
  const status = STATUS_CONFIG[project.status];

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(project.name, "Project options", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Active",
        onPress: () => updateProject(project.id, { status: "active" }),
      },
      {
        text: "Mark Paused",
        onPress: () => updateProject(project.id, { status: "paused" }),
      },
      {
        text: "Mark Done",
        onPress: () => updateProject(project.id, { status: "completed" }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteProject(project.id),
      },
    ]);
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.projectCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Color accent bar */}
      <View
        style={[styles.colorBar, { backgroundColor: project.color }]}
      />

      <View style={styles.cardBody}>
        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.color + "22" },
          ]}
        >
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <Text
          style={[styles.projectName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {project.name}
        </Text>
        <Text
          style={[styles.projectClient, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {project.client}
        </Text>

        {project.description ? (
          <Text
            style={[styles.projectDesc, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {project.description}
          </Text>
        ) : null}

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text
              style={[
                styles.progressPct,
                { color: project.color, fontFamily: MONO },
              ]}
            >
              {project.progress}%
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: project.color + "22" },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: project.color,
                  width: `${project.progress}%` as any,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function AddProjectModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { addProject } = useApp();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState("0");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [status, setStatus] = useState<"active" | "paused" | "completed">(
    "active"
  );

  function handleAdd() {
    if (!name.trim()) return;
    addProject({
      name: name.trim(),
      client: client.trim() || "Personal",
      description: description.trim(),
      progress: Math.min(100, Math.max(0, parseInt(progress) || 0)),
      color: selectedColor,
      status,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setName("");
    setClient("");
    setDescription("");
    setProgress("0");
    setSelectedColor(PROJECT_COLORS[0]);
    setStatus("active");
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
            NEW PROJECT
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
              PROJECT NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Nike Campaign"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
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
              CLIENT / BRAND
            </Text>
            <TextInput
              value={client}
              onChangeText={setClient}
              placeholder="e.g. Nike"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
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
              DESCRIPTION
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                styles.modalInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  height: 72,
                  textAlignVertical: "top",
                  paddingTop: 12,
                },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              PROGRESS (%)
            </Text>
            <TextInput
              value={progress}
              onChangeText={setProgress}
              placeholder="0"
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

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              STATUS
            </Text>
            <View style={styles.statusRow}>
              {(["active", "paused", "completed"] as const).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor:
                          status === s ? cfg.color : cfg.color + "22",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        { color: status === s ? "#fff" : cfg.color },
                      ]}
                    >
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              COLOR
            </Text>
            <View style={styles.colorRow}>
              {PROJECT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderWidth: selectedColor === c ? 3 : 0,
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
              {
                backgroundColor: selectedColor,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.addBtnText}>ADD PROJECT</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { projects } = useApp();
  const [showModal, setShowModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const active = projects.filter((p) => p.status === "active").length;
  const completed = projects.filter((p) => p.status === "completed").length;

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
              PROJECTS
            </Text>
            <View style={styles.headerStats}>
              <Text style={[styles.headerStat, { color: colors.foreground }]}>
                <Text style={{ color: colors.primary, fontFamily: MONO }}>
                  {active}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  {" "}
                  active
                </Text>
              </Text>
              <Text
                style={[
                  styles.headerStatDiv,
                  { color: colors.border },
                ]}
              >
                /
              </Text>
              <Text style={[styles.headerStat, { color: colors.foreground }]}>
                <Text style={{ color: colors.accent, fontFamily: MONO }}>
                  {completed}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  {" "}
                  done
                </Text>
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

        {projects.length === 0 ? (
          <View
            style={[styles.emptyBox, { borderColor: colors.border }]}
          >
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              No projects
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
        ) : (
          <View style={styles.projectsGrid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </View>
        )}
      </ScrollView>

      <AddProjectModal
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
    marginBottom: 20,
  },
  screenLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 4,
  },
  headerStat: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  headerStatDiv: {
    fontSize: 20,
    fontFamily: "Inter_300",
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
  projectsGrid: {
    gap: 12,
  },
  projectCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  colorBar: {
    width: 4,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  projectName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  projectClient: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  projectDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  progressSection: {
    gap: 6,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  progressPct: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
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
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
