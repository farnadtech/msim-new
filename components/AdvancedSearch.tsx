import React, { useState } from 'react';

interface SearchCriteria {
    number: string;
    carrier: string;
    type: string;
    minPrice: string;
    maxPrice: string;
    isRond: boolean;
    pattern: string[];
}

interface AdvancedSearchProps {
    onSearch: (criteria: Omit<SearchCriteria, 'minPrice' | 'maxPrice' | 'isRond'>) => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch }) => {
    const [criteria, setCriteria] = useState({
        number: '',
        carrier: 'all',
        type: 'all',
    });
    const [pattern, setPattern] = useState<string[]>(Array(11).fill(''));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCriteria(prev => ({ ...prev, [name]: value, }));
    };

    const handlePatternChange = (index: number, value: string) => {
        if (/^\d?$/.test(value)) { // Allow only single digit or empty string
            const newPattern = [...pattern];
            newPattern[index] = value;
            setPattern(newPattern);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch({ ...criteria, pattern });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-12">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label htmlFor="number-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">جستجوی شماره</label>
                        <input
                            type="text"
                            id="number-search"
                            name="number"
                            value={criteria.number}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                            placeholder="مثلا 0912"
                        />
                    </div>
                    <div>
                        <label htmlFor="carrier-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اپراتور</label>
                        <select
                            id="carrier-search"
                            name="carrier"
                            value={criteria.carrier}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                        >
                            <option value="all">همه</option>
                            <option value="همراه اول">همراه اول</option>
                            <option value="ایرانسل">ایرانسل</option>
                            <option value="رایتل">رایتل</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع آگهی</label>
                        <select
                            id="type-search"
                            name="type"
                            value={criteria.type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                        >
                            <option value="all">همه</option>
                            <option value="fixed">مقطوع</option>
                            <option value="auction">حراجی</option>
                            <option value="inquiry">استعلامی</option>
                        </select>
                    </div>
                    <div className="w-full">
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                            جستجو
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">جستجو با الگوی شماره (ارقام دلخواه را خالی بگذارید)</label>
                    <div className="flex overflow-x-auto space-x-2 pb-2" style={{ direction: 'ltr' }}>
                        {pattern.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handlePatternChange(index, e.target.value)}
                                className="w-10 h-12 text-center text-lg font-bold border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                            />
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AdvancedSearch;