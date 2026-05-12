import { create } from "zustand";

type UiState = {
  currency: string;
  setCurrency: (currency: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  currency: "JPY",
  setCurrency: (currency) => set({ currency }),
}));

