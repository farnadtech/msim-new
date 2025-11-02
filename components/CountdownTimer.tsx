import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetDate: string;
    onExpire?: () => void;
    className?: string;
    showDays?: boolean;
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
    targetDate, 
    onExpire, 
    className = '',
    showDays = true 
}) => {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false
    });

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isExpired: true
                });
                
                if (onExpire && !timeRemaining.isExpired) {
                    onExpire();
                }
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                isExpired: false
            });
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onExpire]);

    if (timeRemaining.isExpired) {
        return (
            <span className={`text-red-600 dark:text-red-400 font-bold ${className}`}>
                منقضی شده
            </span>
        );
    }

    // Color coding based on time remaining
    const getColorClass = () => {
        const totalHours = timeRemaining.days * 24 + timeRemaining.hours;
        if (totalHours < 6) return 'text-red-600 dark:text-red-400';
        if (totalHours < 24) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-green-600 dark:text-green-400';
    };

    const formatNumber = (num: number): string => {
        return num.toString().padStart(2, '0');
    };

    return (
        <div className={`${getColorClass()} font-mono font-semibold ${className}`} dir="ltr">
            {showDays && timeRemaining.days > 0 && (
                <>
                    <span>{formatNumber(timeRemaining.days)}</span>
                    <span className="mx-0.5">:</span>
                </>
            )}
            <span>{formatNumber(timeRemaining.hours)}</span>
            <span className="mx-0.5">:</span>
            <span>{formatNumber(timeRemaining.minutes)}</span>
            <span className="mx-0.5">:</span>
            <span>{formatNumber(timeRemaining.seconds)}</span>
        </div>
    );
};

export default CountdownTimer;
