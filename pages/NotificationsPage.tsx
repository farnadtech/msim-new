import React, { useEffect, useState } from 'react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api-supabase';
import DashboardLayout from '../components/DashboardLayout';

const NotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!user) return;
            
            try {
                const userNotifications = await api.getUserNotifications(user.id);
                setNotifications(userNotifications);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [user]);

    const markAsRead = async (notificationId: number) => {
        if (!user) return;
        
        try {
            await api.markNotificationAsRead(notificationId, user.id);
            setNotifications(notifications.map(n => 
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
        } catch (error) {
            showNotification('Error marking as read', 'error');
        }
    };

    const deleteNotificationItem = async (notificationId: number) => {
        if (!user) return;
        
        try {
            await api.deleteNotification(notificationId, user.id);
            setNotifications(notifications.filter(n => n.id !== notificationId));
            showNotification('Notification deleted', 'success');
        } catch (error) {
            showNotification('Error deleting notification', 'error');
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        
        try {
            const unreadNotifications = notifications.filter(n => !n.is_read);
            await Promise.all(unreadNotifications.map(n => api.markNotificationAsRead(n.id, user.id)));
            
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            showNotification('All notifications marked as read', 'success');
        } catch (error) {
            showNotification('Error marking all as read', 'error');
        }
    };

    const deleteAllNotifications = async () => {
        if (!user) return;
        
        try {
            await Promise.all(notifications.map(n => api.deleteNotification(n.id, user.id)));
            setNotifications([]);
            showNotification('All notifications deleted', 'success');
        } catch (error) {
            showNotification('Error deleting all notifications', 'error');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4">اعلانات</h2>
                    <div className="text-center py-10">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">اعلانات</h2>
                    {notifications.length > 0 && (
                        <div className="flex gap-2">
                            {notifications.some(n => !n.is_read) && (
                                <button 
                                    onClick={markAllAsRead}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    علامتگذاری همه خوانده شده
                                </button>
                            )}
                            <button 
                                onClick={deleteAllNotifications}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                            >
                                حذف همه
                            </button>
                        </div>
                    )}
                </div>
                
                {notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>هیچ اعلانی یافت نشد.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map(notification => (
                            <div 
                                key={notification.id} 
                                className={`border rounded-lg p-4 flex justify-between items-start ${
                                    notification.is_read 
                                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600' 
                                        : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                                }`}
                            >
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">{notification.title}</h3>
                                    <p className="mt-2">{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(notification.created_at).toLocaleDateString('fa-IR')}
                                    </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    {!notification.is_read && (
                                        <button 
                                            onClick={() => markAsRead(notification.id)}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                        >
                                            خواندم
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteNotificationItem(notification.id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                    >
                                        حذف
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default NotificationsPage;