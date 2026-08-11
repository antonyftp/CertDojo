import { create } from "zustand";

export type StudySessionState = {
  topic: string;
  plannedSessions: number;
  setTopic: (topic: string) => void;
  incrementSessions: () => void;
  reset: () => void;
};

export const initialStudySessionState = {
  topic: "Security+",
  plannedSessions: 1,
};

export const useStudySessionStore = create<StudySessionState>((set) => ({
  ...initialStudySessionState,
  setTopic: (topic) => set({ topic }),
  incrementSessions: () =>
    set((state) => ({ plannedSessions: state.plannedSessions + 1 })),
  reset: () => set(initialStudySessionState),
}));
