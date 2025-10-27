

import React from 'react';
import { useData } from '../hooks/useData';
// FIX: Replaced v5 `useHistory` with v6 `useNavigate` to resolve module export error.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PackagesPage: React.FC = () => {
    const { packages, loading } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSelectPackage = () => {
        if(user && user.role === 'seller') {
            navigate('/seller/packages');
        } else if (user && user.role !== 'seller') {
            // Potentially show a notification that they are not a seller
            navigate(`/${user.role}`);
        } else {
            navigate('/login');
        }
    }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-6 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">فروشنده شوید!</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">با خرید یکی از پکیج های ما، سیمکارت های خود را برای فروش آگهی کنید.</p>
            </div>

            {loading ? (
                 <div className="text-center">در حال بارگذاری...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {packages.map((pkg, index) => (
                    <div key={pkg.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col text-center transition-transform transform hover:scale-105 ${index === 1 ? 'border-4 border-blue-500' : ''}`}>
                        <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{pkg.description}</p>
                        <p className="text-4xl font-extrabold mb-2">{new Intl.NumberFormat('fa-IR').format(pkg.price || 0)}<span className="text-lg font-normal"> تومان</span></p>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{pkg.duration_days} روز اعتبار</p>
                        <ul className="text-right space-y-3 mb-8 flex-grow">
                        <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>تا {pkg.listing_limit} آگهی همزمان</li>
                        </ul>
                        <button onClick={handleSelectPackage} className={`w-full py-3 font-bold rounded-lg transition-colors ${index === 1 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                        انتخاب پکیج
                        </button>
                    </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default PackagesPage;