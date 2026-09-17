import { Navigate } from 'react-router';
import { useAuth } from '@/auth';
import LayoutShell from '@/components/Layout';

export default function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  return <LayoutShell />;
}
