import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

export interface ErgSession {
    id: string;
    date: string;
    type: "2k" | "4x500" | "6k" | "10k" | "custom";
    label: string;
    distance: number;
    time: number;
    splitTimes: string[];
    spm: number;
    feel: 1 | 2 | 3 | 4 | 5;
    notes: string;
}

export interface Goal {
    id: string;
    title: string;
    current: number;
    target: number;
    unit: string;
    color: string;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    tag: string;
    tagColor: string;
    createdAt: number;
}

export interface Project {
    id: string;
    name: string;
    client: string;
    status: "active" | "paused" | "completed";
    color: string;
    description: string;
    progress: number;
}

interface AppContextType {
    ergSessions: ErgSession[];
    addErgSession: (session: Omit<ErgSession, "id">) => void;
    deleteErgSession: (id: string) => void;
    goals: Goal[];
    addGoal: (goal: Omit<Goal, "id">) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    deleteGoal: (id: string) => void;
    todos: Todo[];
    addTodo: (todo: Omit<Todo, "id" | "completed" | "createdAt">) => void;
    toggleTodo: (id: string) => void;
    deleteTodo: (id: string) => void;
    projects: Project[];
    addProject: (project: Omit<Project, "id">) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
}

const DEFAULT_GOALS: Goal[] = [
  { id: "g1", title: "2K Erg — 6:50 Target", current: 8, target: 12, unit: "wk program", color: "#4DA6FF" },
  { id: "g2", title: "Cross Country — Top 10 Finish", current: 0, target: 1, unit: "top 10 finish", color: "#FF4500" },
  { id: "g3", title: "HSC Completion", current: 0, target: 1, unit: "complete", color: "#00D26A" },
  ];

const DEFAULT_TODOS: Todo[] = [
  { id: "t1", text: "Morning erg session — 20min steady state", completed: false, tag: "Fitness", tagColor: "#FF4500", createdAt: Date.now() },
  { id: "t2", text: "HSC study block — 90 min", completed: false, tag: "Learning", tagColor: "#BF5AF2", createdAt: Date.now() },
  { id: "t3", text: "Cross country interval training", completed: false, tag: "Fitness", tagColor: "#FF4500", createdAt: Date.now() },
  { id: "t4", text: "Log this week's erg splits", completed: false, tag: "Fitness", tagColor: "#FF4500", createdAt: Date.now() },
  ];

const DEFAULT_PROJECTS: Project[] = [
  { id: "p1", name: "Brand 1", client: "— tap to rename —", status: "active", color: "#FF4500", description: "Long press to edit or delete", progress: 0 },
  { id: "p2", name: "Brand 2", client: "— tap to rename —", status: "active", color: "#00D26A", description: "Long press to edit or delete", progress: 0 },
  { id: "p3", name: "Brand 3", client: "— tap to rename —", status: "active", color: "#4DA6FF", description: "Long press to edit or delete", progress: 0 },
  { id: "p4", name: "Brand 4", client: "— tap to rename —", status: "active", color: "#BF5AF2", description: "Long press to edit or delete", progress: 0 },
  ];

const STORAGE_KEYS = {
    ergSessions: "@dashboard/ergSessions",
    goals: "@dashboard/goals",
    todos: "@dashboard/todos",
    projects: "@dashboard/projects",
};

const AppContext = createContext<AppContextType | null>(null);

function genId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [ergSessions, setErgSessions] = useState<ErgSession[]>([]);
    const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
    const [todos, setTodos] = useState<Todo[]>(DEFAULT_TODOS);
    const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);

    useEffect(() => {
          async function load() {
                  try {
                            const [e, g, t, p] = await Promise.all([
                                        AsyncStorage.getItem(STORAGE_KEYS.ergSessions),
                                        AsyncStorage.getItem(STORAGE_KEYS.goals),
                                        AsyncStorage.getItem(STORAGE_KEYS.todos),
                                        AsyncStorage.getItem(STORAGE_KEYS.projects),
                                      ]);
                            if (e) setErgSessions(JSON.parse(e));
                            if (g) setGoals(JSON.parse(g));
                            if (t) setTodos(JSON.parse(t));
                            if (p) setProjects(JSON.parse(p));
                  } catch {}
          }
          load();
    }, []);

    const persistErg = useCallback(async (data: ErgSession[]) => {
          await AsyncStorage.setItem(STORAGE_KEYS.ergSessions, JSON.stringify(data));
    }, []);

    const persistGoals = useCallback(async (data: Goal[]) => {
          await AsyncStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(data));
    }, []);

    const persistTodos = useCallback(async (data: Todo[]) => {
          await AsyncStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(data));
    }, []);

    const persistProjects = useCallback(async (data: Project[]) => {
          await AsyncStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data));
    }, []);

    const addErgSession = useCallback((session: Omit<ErgSession, "id">) => {
          const next = [...ergSessions, { ...session, id: genId() }];
          setErgSessions(next);
          persistErg(next);
    }, [ergSessions, persistErg]);

    const deleteErgSession = useCallback((id: string) => {
          const next = ergSessions.filter((s) => s.id !== id);
          setErgSessions(next);
          persistErg(next);
    }, [ergSessions, persistErg]);

    const addGoal = useCallback((goal: Omit<Goal, "id">) => {
          const next = [...goals, { ...goal, id: genId() }];
          setGoals(next);
          persistGoals(next);
    }, [goals, persistGoals]);

    const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
          const next = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
          setGoals(next);
          persistGoals(next);
    }, [goals, persistGoals]);

    const deleteGoal = useCallback((id: string) => {
          const next = goals.filter((g) => g.id !== id);
          setGoals(next);
          persistGoals(next);
    }, [goals, persistGoals]);

    const addTodo = useCallback((todo: Omit<Todo, "id" | "completed" | "createdAt">) => {
          const next = [...todos, { ...todo, id: genId(), completed: false, createdAt: Date.now() }];
          setTodos(next);
          persistTodos(next);
    }, [todos, persistTodos]);

    const toggleTodo = useCallback((id: string) => {
          const next = todos.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
          setTodos(next);
          persistTodos(next);
    }, [todos, persistTodos]);

    const deleteTodo = useCallback((id: string) => {
          const next = todos.filter((t) => t.id !== id);
          setTodos(next);
          persistTodos(next);
    }, [todos, persistTodos]);

    const addProject = useCallback((project: Omit<Project, "id">) => {
          const next = [...projects, { ...project, id: genId() }];
          setProjects(next);
          persistProjects(next);
    }, [projects, persistProjects]);

    const updateProject = useCallback((id: string, updates: Partial<Project>) => {
          const next = projects.map((p) => p.id === id ? { ...p, ...updates } : p);
          setProjects(next);
          persistProjects(next);
    }, [projects, persistProjects]);

    const deleteProject = useCallback((id: string) => {
          const next = projects.filter((p) => p.id !== id);
          setProjects(next);
          persistProjects(next);
    }, [projects, persistProjects]);

    return (
          <AppContext.Provider value={{
                  ergSessions, addErgSession, deleteErgSession,
                  goals, addGoal, updateGoal, deleteGoal,
                  todos, addTodo, toggleTodo, deleteTodo,
                  projects, addProject, updateProject, deleteProject,
          }}>
            {children}
          </AppContext.Provider>AppContext.Provider>
        );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used within AppProvider");
    return ctx;
}
  useContext,
  useEffect,
  useState,
} from "react";

export interface ErgSession {
  id: string;
  date: string;
  type: "2k" | "4x500" | "6k" | "10k" | "custom";
  label: string;
  distance: number;
  time: number;
  splitTimes: string[];
  spm: number;
  feel: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  tag: string;
  tagColor: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: "active" | "paused" | "completed";
  color: string;
  description: string;
  progress: number;
}

interface AppContextType {
  ergSessions: ErgSession[];
  addErgSession: (session: Omit<ErgSession, "id">) => void;
  deleteErgSession: (id: string) => void;
  goals: Goal[];
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  todos: Todo[];
  addTodo: (todo: Omit<Todo, "id" | "completed" | "createdAt">) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  projects: Project[];
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const DEFAULT_ERG_SESSIONS: ErgSession[] = [
  {
    id: "erg1",
    date: "2026-03-16",
    type: "2k",
    label: "2K Test — Baseline",
    distance: 2000,
    time: 445,
    splitTimes: ["1:52", "1:51", "1:51", "1:51"],
    spm: 24,
    feel: 3,
    notes: "First test. Baseline.",
  },
  {
    id: "erg2",
    date: "2026-03-23",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 438,
    splitTimes: ["1:50", "1:49", "1:50", "1:49"],
    spm: 24,
    feel: 3,
    notes: "",
  },
  {
    id: "erg3",
    date: "2026-03-30",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 433,
    splitTimes: ["1:49", "1:48", "1:48", "1:48"],
    spm: 25,
    feel: 3,
    notes: "",
  },
  {
    id: "erg4",
    date: "2026-04-06",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 428,
    splitTimes: ["1:47", "1:47", "1:47", "1:47"],
    spm: 25,
    feel: 4,
    notes: "",
  },
  {
    id: "erg5",
    date: "2026-04-13",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 425,
    splitTimes: ["1:46", "1:46", "1:47", "1:46"],
    spm: 26,
    feel: 4,
    notes: "",
  },
  {
    id: "erg6",
    date: "2026-04-20",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 422,
    splitTimes: ["1:45", "1:46", "1:46", "1:45"],
    spm: 26,
    feel: 4,
    notes: "",
  },
  {
    id: "erg7",
    date: "2026-04-27",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 420,
    splitTimes: ["1:45", "1:45", "1:45", "1:45"],
    spm: 27,
    feel: 4,
    notes: "Broke 7:00.",
  },
  {
    id: "erg8",
    date: "2026-05-04",
    type: "2k",
    label: "2K Test",
    distance: 2000,
    time: 419,
    splitTimes: ["1:44", "1:45", "1:45", "1:45"],
    spm: 27,
    feel: 5,
    notes: "PB. -26s from baseline. Feeling sharp.",
  },
];

const DEFAULT_GOALS: Goal[] = [
  {
    id: "g1",
    title: "2K Erg — 6:50 Target",
    current: 8,
    target: 12,
    unit: "wk program",
    color: "#4DA6FF",
  },
  {
    id: "g2",
    title: "Cross Country — Top 10 Finish",
    current: 0,
    target: 1,
    unit: "top 10 finish",
    color: "#FF4500",
  },
  {
    id: "g3",
    title: "HSC Completion",
    current: 0,
    target: 1,
    unit: "complete",
    color: "#00D26A",
  },
];

const DEFAULT_TODOS: Todo[] = [
  {
    id: "t1",
    text: "Morning erg session — 20min steady state",
    completed: false,
    tag: "Fitness",
    tagColor: "#FF4500",
    createdAt: Date.now(),
  },
  {
    id: "t2",
    text: "HSC study block — 90 min",
    completed: false,
    tag: "Learning",
    tagColor: "#BF5AF2",
    createdAt: Date.now(),
  },
  {
    id: "t3",
    text: "Cross country interval training",
    completed: false,
    tag: "Fitness",
    tagColor: "#FF4500",
    createdAt: Date.now(),
  },
  {
    id: "t4",
    text: "Log this week's erg splits",
    completed: false,
    tag: "Fitness",
    tagColor: "#FF4500",
    createdAt: Date.now(),
  },
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Brand 1",
    client: "— tap to rename —",
    status: "active",
    color: "#FF4500",
    description: "Long press to edit or delete",
    progress: 0,
  },
  {
    id: "p2",
    name: "Brand 2",
    client: "— tap to rename —",
    status: "active",
    color: "#00D26A",
    description: "Long press to edit or delete",
    progress: 0,
  },
  {
    id: "p3",
    name: "Brand 3",
    client: "— tap to rename —",
    status: "active",
    color: "#4DA6FF",
    description: "Long press to edit or delete",
    progress: 0,
  },
  {
    id: "p4",
    name: "Brand 4",
    client: "— tap to rename —",
    status: "active",
    color: "#BF5AF2",
    description: "Long press to edit or delete",
    progress: 0,
  },
];

const STORAGE_KEYS = {
  ergSessions: "@dashboard/ergSessions",
  goals: "@dashboard/goals",
  todos: "@dashboard/todos",
  projects: "@dashboard/projects",
};

const AppContext = createContext<AppContextType | null>(null);

function genId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ergSessions, setErgSessions] =
    useState<ErgSession[]>(DEFAULT_ERG_SESSIONS);
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [todos, setTodos] = useState<Todo[]>(DEFAULT_TODOS);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);

  useEffect(() => {
    async function load() {
      try {
        const [e, g, t, p] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ergSessions),
          AsyncStorage.getItem(STORAGE_KEYS.goals),
          AsyncStorage.getItem(STORAGE_KEYS.todos),
          AsyncStorage.getItem(STORAGE_KEYS.projects),
        ]);
        if (e) setErgSessions(JSON.parse(e));
        if (g) setGoals(JSON.parse(g));
        if (t) setTodos(JSON.parse(t));
        if (p) setProjects(JSON.parse(p));
      } catch {}
    }
    load();
  }, []);

  const persistErg = useCallback(async (data: ErgSession[]) => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ergSessions,
      JSON.stringify(data)
    );
  }, []);

  const persistGoals = useCallback(async (data: Goal[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(data));
  }, []);

  const persistTodos = useCallback(async (data: Todo[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(data));
  }, []);

  const persistProjects = useCallback(async (data: Project[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data));
  }, []);

  const addErgSession = useCallback(
    (session: Omit<ErgSession, "id">) => {
      const next = [...ergSessions, { ...session, id: genId() }];
      setErgSessions(next);
      persistErg(next);
    },
    [ergSessions, persistErg]
  );

  const deleteErgSession = useCallback(
    (id: string) => {
      const next = ergSessions.filter((s) => s.id !== id);
      setErgSessions(next);
      persistErg(next);
    },
    [ergSessions, persistErg]
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, "id">) => {
      const next = [...goals, { ...goal, id: genId() }];
      setGoals(next);
      persistGoals(next);
    },
    [goals, persistGoals]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>) => {
      const next = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
      setGoals(next);
      persistGoals(next);
    },
    [goals, persistGoals]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const next = goals.filter((g) => g.id !== id);
      setGoals(next);
      persistGoals(next);
    },
    [goals, persistGoals]
  );

  const addTodo = useCallback(
    (todo: Omit<Todo, "id" | "completed" | "createdAt">) => {
      const next = [
        ...todos,
        { ...todo, id: genId(), completed: false, createdAt: Date.now() },
      ];
      setTodos(next);
      persistTodos(next);
    },
    [todos, persistTodos]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      const next = todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      setTodos(next);
      persistTodos(next);
    },
    [todos, persistTodos]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      const next = todos.filter((t) => t.id !== id);
      setTodos(next);
      persistTodos(next);
    },
    [todos, persistTodos]
  );

  const addProject = useCallback(
    (project: Omit<Project, "id">) => {
      const next = [...projects, { ...project, id: genId() }];
      setProjects(next);
      persistProjects(next);
    },
    [projects, persistProjects]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const next = projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      setProjects(next);
      persistProjects(next);
    },
    [projects, persistProjects]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const next = projects.filter((p) => p.id !== id);
      setProjects(next);
      persistProjects(next);
    },
    [projects, persistProjects]
  );

  return (
    <AppContext.Provider
      value={{
        ergSessions,
        addErgSession,
        deleteErgSession,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        todos,
        addTodo,
        toggleTodo,
        deleteTodo,
        projects,
        addProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
