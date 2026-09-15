import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}: ConfirmDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        {isDestructive && (
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        )}
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      
      <div className="mt-6 flex gap-3 justify-end">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors ${
            isDestructive 
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};
