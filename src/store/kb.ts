import { create } from "zustand";
import type { NoteWithContent } from "@/types";

interface KbState {
  activeNote: NoteWithContent | null;
  dirty: boolean;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  setNote: (note: NoteWithContent) => void;
  markDirty: () => void;
  setSaveStatus: (status: "saved" | "saving" | "unsaved" | "error") => void;
  clearActiveNote: () => void;
}

export const useKbStore = create<KbState>((set) => ({
  activeNote: null,
  dirty: false,
  saveStatus: "saved",
  setNote: (note) => set({ activeNote: note, dirty: false, saveStatus: "saved" }),
  markDirty: () => set({ dirty: true, saveStatus: "unsaved" }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  clearActiveNote: () => set({ activeNote: null, dirty: false, saveStatus: "saved" }),
}));
