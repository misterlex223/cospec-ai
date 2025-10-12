import React, { useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import type { Notification } from '../../store/slices/notificationsSlice';
import { removeNotification } from '../../store/slices/notificationsSlice';

interface NotificationProviderProps {
  children: React.ReactNode;
}

const ToastNotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notifications.items);

  // Map notification types to toast types
  const getToastType = (notificationType: string) => {
    switch (notificationType) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  useEffect(() => {
    notifications.forEach((notification: Notification) => {
      const toastType = getToastType(notification.type);
      toast(notification.message, {
        toastId: notification.id, // Use the same ID to prevent duplicates
        type: toastType as any, // Type assertion to avoid TS errors
        onClose: () => {
          dispatch(removeNotification(notification.id));
        },
      });
    });
  }, [notifications, dispatch]);

  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default ToastNotificationProvider;