import { configureStore } from '@reduxjs/toolkit';

import { combineReducers } from 'redux';

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import userSlice from './slice/userSlice';

type PersistStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const noopStorage: PersistStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

const createSessionStorage = (): PersistStorage => ({
  getItem: async (key: string) => window.sessionStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    window.sessionStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    window.sessionStorage.removeItem(key);
  },
});

const currentStorage: PersistStorage =
  typeof window !== 'undefined' ? createSessionStorage() : noopStorage;

const persistConfig = {
  key: 'root',
  version: 1,
  storage: currentStorage,
};

const rootReducer = combineReducers({
  userDetails: userSlice.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
