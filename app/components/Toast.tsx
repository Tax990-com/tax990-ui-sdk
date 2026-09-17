import { useEffect } from 'react';
import { Chip } from '@heroui/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Toast as ToastData } from '@/types';

interface Props {
  toasts: ToastData[];
  removeToast: (id: number) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const chipColors = {
  success: 'success' as const,
  error: 'danger' as const,
  info: 'primary' as const,
};

export default function ToastContainer({ toasts, removeToast }: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: (id: number) => void }) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-md bg-white border border-grey-lighten-2">
      <Chip color={chipColors[toast.type]} variant="flat" size="sm" startContent={<Icon size={14} />}>
        {toast.type}
      </Chip>
      <p className="text-sm flex-1 text-black">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="shrink-0 text-grey hover:text-black">
        <X size={16} />
      </button>
    </div>
  );
}
