import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  username: string | null;
}

const initialState: UserState = {
  username: null,
};

const userSlice = createSlice({
  name: 'userDetails',
  initialState,
  reducers: {
    setUserData: (state, action: PayloadAction<{ username: string }>) => {
      state.username = action.payload.username;
    },
    resetUserData: () => initialState,
  },
});

export const { setUserData, resetUserData } = userSlice.actions;

export default userSlice;
