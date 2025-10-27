import React, { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const baseClasses = 'fixed top-5 right-5 z-[100] max-w-sm w-full p-4 rounded-lg shadow-lg flex items-center space-x-3 space-x-reverse transition-transform transform';
  const typeClasses = {
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-r-4 border-green-500',
    error: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-r-4 border-red-500',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500',
  };

  const Icon = () => {
     switch (type) {
        case 'success':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'error':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        default:
             return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
     }
  }

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="flex-shrink-0">
        <Icon />
      </div>
      <div className="flex-1 font-medium">{message}</div>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default Notification;
