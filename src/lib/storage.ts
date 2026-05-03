import type { GroovePreset, Preset, Ring } from "./rhythm";

const DB_NAME = "rhythm-geometry";
const DB_VERSION = 1;
const USER_PRESETS_STORE = "userPresets";
const SETTINGS_STORE = "settings";
const TRANSPORT_SETTINGS_KEY = "transport";
const APP_STATE_KEY = "app-state";

export interface StoredTransportSettings {
  bpm: number;
  masterVolume: number;
}

export interface StoredPresetPanelState {
  mode: "grooves" | "tracks";
  category: string;
  selectedPresetId: string;
}

export interface StoredAppState {
  rings: Ring[];
  selectedRingId: string;
  presetPanel: StoredPresetPanelState;
  showCentroidArrow: boolean;
  showLbdmGrouping: boolean;
}

interface UserPresetsRecord {
  id: "user-presets";
  grooves: GroovePreset[];
  tracks: Preset[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(USER_PRESETS_STORE)) {
        database.createObjectStore(USER_PRESETS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readStoreValue<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(key);

        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

function writeStoreValue<T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = key === undefined ? store.put(value) : store.put(value, key);

        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

export async function loadUserPresets(): Promise<Pick<UserPresetsRecord, "grooves" | "tracks">> {
  const record = await readStoreValue<UserPresetsRecord>(USER_PRESETS_STORE, "user-presets");
  return {
    grooves: record?.grooves ?? [],
    tracks: record?.tracks ?? [],
  };
}

export function saveUserPresets(grooves: GroovePreset[], tracks: Preset[]): Promise<void> {
  return writeStoreValue<UserPresetsRecord>(USER_PRESETS_STORE, {
    id: "user-presets",
    grooves,
    tracks,
  });
}

export function loadTransportSettings(): Promise<StoredTransportSettings | undefined> {
  return readStoreValue<StoredTransportSettings>(SETTINGS_STORE, TRANSPORT_SETTINGS_KEY);
}

export function saveTransportSettings(settings: StoredTransportSettings): Promise<void> {
  return writeStoreValue(SETTINGS_STORE, settings, TRANSPORT_SETTINGS_KEY);
}

export function loadAppState(): Promise<StoredAppState | undefined> {
  return readStoreValue<StoredAppState>(SETTINGS_STORE, APP_STATE_KEY);
}

export function saveAppState(state: StoredAppState): Promise<void> {
  return writeStoreValue(SETTINGS_STORE, state, APP_STATE_KEY);
}
