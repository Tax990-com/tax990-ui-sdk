import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from './redux/store';
import { setUserData, resetUserData } from './redux/slice/userSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { username } = useSelector((state: RootState) => state.userDetails);

  const signIn = (username: string, password: string): boolean => {
    const validUser = import.meta.env.VITE_AUTH_USERNAME || 'admin';
    const validPass = import.meta.env.VITE_AUTH_PASSWORD || 'Tax990@sdk';
    if (username === validUser && password === validPass) {
      dispatch(setUserData({ username }));
      return true;
    }
    return false;
  };

  const signOut = () => dispatch(resetUserData());

  return { user: username, signIn, signOut };
};
