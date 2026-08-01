import { useEffect, useState } from "preact/hooks";

export type { SettingsConfig } from "../settingsModal";

export type MediaViewerState = {
  expanded: boolean;
  mode: "media" | "settings";
  selectedIndex: number;
  settingsVersion: number;
};

type MediaViewerListener = () => void;
type UtilityViewerMode = "message" | "settings";

export type UtilityViewerState = {
  mode: UtilityViewerMode;
  settingsVersion: number;
};

type UtilityViewerListener = () => void;

type StoreLike<TState> = {
  getState(): TState;
  subscribe(listener: () => void): () => void;
};

export type MediaViewerStore = {
  bumpSettingsVersion(): void;
  closeSettings(): void;
  getState(): MediaViewerState;
  openSettings(): void;
  setExpanded(expanded: boolean): void;
  setSelectedIndex(selectedIndex: number): void;
  subscribe(listener: MediaViewerListener): () => void;
  toggleExpanded(): void;
};

export type UtilityViewerStore = {
  bumpSettingsVersion(): void;
  closeSettings(): void;
  getState(): UtilityViewerState;
  openSettings(): void;
  subscribe(listener: UtilityViewerListener): () => void;
};

const createStore = <TState,>(state: TState) => {
  const listeners = new Set<() => void>();
  const update = (nextState: Partial<TState>) => {
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  };
  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
  };
};

const createBaseStoreMethods = <TState extends { mode: string; settingsVersion: number }>(
  store: ReturnType<typeof createStore<TState>>,
  idleMode: TState["mode"]
) => ({
  bumpSettingsVersion: () => store.update({ settingsVersion: store.getState().settingsVersion + 1 } as Partial<TState>),
  closeSettings: () => store.update({ mode: idleMode } as Partial<TState>),
  getState: store.getState,
  openSettings: () => store.update({ mode: "settings" } as Partial<TState>),
  subscribe: store.subscribe,
});

export const createMediaViewerStore = (selectedIndex = 0, expanded = false): MediaViewerStore => {
  const store = createStore<MediaViewerState>({
    expanded,
    mode: "media",
    selectedIndex,
    settingsVersion: 0,
  });

  return {
    ...createBaseStoreMethods(store, "media"),
    setExpanded: (expanded) => store.getState().expanded === expanded || store.update({ expanded }),
    setSelectedIndex: (selectedIndexValue) => store.getState().selectedIndex === selectedIndexValue || store.update({ selectedIndex: selectedIndexValue }),
    toggleExpanded: () => store.update({ expanded: !store.getState().expanded }),
  };
};

export const createUtilityViewerStore = (): UtilityViewerStore => {
  const store = createStore<UtilityViewerState>({
    mode: "message",
    settingsVersion: 0,
  });

  return createBaseStoreMethods(store, "message");
};

export const useStoreState = <TState,>(store: StoreLike<TState>) => {
  const [state, setState] = useState(store.getState());

  useEffect(() => store.subscribe(() => setState(store.getState())), [store]);

  return state;
};
