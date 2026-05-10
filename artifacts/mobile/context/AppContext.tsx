import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
  goals: Goal[];
  todos: Todo[];
  projects: Project[];
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addTodo: (todo: Omit<Todo, "id" | "completed" | "createdAt">) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const DEFAULT_GOALS: Goal[] = [
  {
    id: "g1",
    title: "Weekly Run Distance",
    current: 24.6,
    target: 50,
    unit: "km",
    color: "#FF4500",
  },
  {
    id: "g2",
    title: "Books This Year",
    current: 4,
    target: 12,
    unit: "books",
    color: "#4DA6FF",
  },
  {
    id: "g3",
    title: "Gym Sessions",
    current: 11,
    target: 20,
    unit: "sessions",
    color: "#00D26A",
  },
  {
    id: "g4",
    title: "Revenue Target",
    current: 42000,
    target: 100000,
    unit: "$",
    color: "#BF5AF2",
  },
];

const DEFAULT_TODOS: Todo[] = [
  {
    id: "t1",
    text: "Review Q2 campaign analytics",
    completed: false,
    tag: "Work",
    tagColor: "#4DA6FF",
    createdAt: Date.now(),
  },
  {
    id: "t2",
    text: "10km morning run",
    completed: true,
    tag: "Fitness",
    tagColor: "#FF4500",
    createdAt: Date.now(),
  },
  {
    id: "t3",
    text: "Update project proposal",
    completed: false,
    tag: "Work",
    tagColor: "#4DA6FF",
    createdAt: Date.now(),
  },
  {
    id: "t4",
    text: "Read 30 minutes",
    completed: false,
    tag: "Personal",
    tagColor: "#00D26A",
    createdAt: Date.now(),
  },
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Nike Campaign",
    client: "Nike",
    status: "active",
    color: "#FF4500",
    description: "Q3 social media & content strategy",
    progress: 65,
  },
  {
    id: "p2",
    name: "Personal Brand",
    client: "Self",
    status: "active",
    color: "#00D26A",
    description: "Website redesign + content",
    progress: 30,
  },
  {
    id: "p3",
    name: "Startup MVP",
    client: "Stealth",
    status: "paused",
    color: "#BF5AF2",
    description: "SaaS tool for creators",
    progress: 80,
  },
  {
    id: "p4",
    name: "Brand Identity",
    client: "Local Co.",
    status: "completed",
    color: "#4DA6FF",
    description: "Logo & brand guidelines",
    progress: 100,
  },
];

const STORAGE_KEYS = {
  goals: "@dashboard/goals",
  todos: "@dashboard/todos",
  projects: "@dashboard/projects",
};

const AppContext = createContext<AppContextType | null>(null);

function genId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [todos, setTodos] = useState<Todo[]>(DEFAULT_TODOS);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);

  useEffect(() => {
    async function load() {
      try {
        const [g, t, p] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.goals),
          AsyncStorage.getItem(STORAGE_KEYS.todos),
          AsyncStorage.getItem(STORAGE_KEYS.projects),
        ]);
        if (g) setGoals(JSON.parse(g));
        if (t) setTodos(JSON.parse(t));
        if (p) setProjects(JSON.parse(p));
      } catch {}
    }
    load();
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
        goals,
        todos,
        projects,
        addGoal,
        updateGoal,
        deleteGoal,
        addTodo,
        toggleTodo,
        deleteTodo,
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
