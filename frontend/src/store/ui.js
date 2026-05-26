import { create } from 'zustand';

// Mobile drawer state. On md+ screens these are ignored (sidebars are static).
export const useUIStore = create((set) => ({
  leftOpen: false,
  rightOpen: false,
  openLeft: () => set({ leftOpen: true, rightOpen: false }),
  openRight: () => set({ rightOpen: true, leftOpen: false }),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen, rightOpen: false })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen, leftOpen: false })),
  closeAll: () => set({ leftOpen: false, rightOpen: false }),
}));
