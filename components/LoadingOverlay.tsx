import React from 'react';

interface LoadingOverlayProps {
    message?: string;
    submessage?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
    message = 'در حال پردازش...', 
    submessage = 'لطفاً صبر کنید'
}) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fade-in">
                {/* Animated Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        {/* Outer ring */}
                        <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
                        {/* Spinning ring */}
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                        {/* Inner pulsing circle */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                </div>

                {/* Message */}
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {message}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {submessage}
                    </p>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mt-6">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default LoadingOverlay;
