import React from 'react';
import { useNavigate } from 'react-router-dom';
import KYCVerificationForm from '../components/KYCVerificationForm';

const KYCVerificationPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-2xl mx-auto">
                <KYCVerificationForm onComplete={() => {
                    // Redirect to home or dashboard after completion
                    setTimeout(() => {
                        navigate('/');
                    }, 2000);
                }} />
            </div>
        </div>
    );
};

export default KYCVerificationPage;
