import React, { useState } from 'react';
import { useCarriers } from '../contexts/CarriersContext';

interface SearchCriteria {
    number: string;
    carrier: string;
    type: string;
    minPrice: string;
    maxPrice: string;
    isRond: boolean;
    rondLevel: number;
    maxRondLevel: number;
    pattern: string[];
}

interface AdvancedSearchProps {
    onSearch: (criteria: SearchCriteria) => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch }) => {
    const { carriers } = useCarriers();
    const [criteria, setCriteria] = useState({
        number: '',
        carrier: 'all',
        type: 'all',
        minPrice: '',
        maxPrice: '',
        isRond: false
    });
    const [rondRange, setRondRange] = useState({ min: 1, max: 5 });
    const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });
    const [pattern, setPattern] = useState<string[]>(Array(11).fill(''));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCriteria(prev => ({ ...prev, [name]: value, }));
    };

    const handleRondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setCriteria(prev => ({ ...prev, isRond: checked }));
    };

    const handleRondMinChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = parseInt(e.target.value);
        setRondRange(prev => ({ ...prev, min: value }));
    };

    const handleRondMaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = parseInt(e.target.value);
        setRondRange(prev => ({ ...prev, max: value }));
    };

    const handleMinPriceSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (value <= priceRange.max) {
            setPriceRange(prev => ({ ...prev, min: value }));
            setCriteria(prev => ({ ...prev, minPrice: value.toString() }));
        }
    };

    const handleMaxPriceSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (value >= priceRange.min) {
            setPriceRange(prev => ({ ...prev, max: value }));
            setCriteria(prev => ({ ...prev, maxPrice: value.toString() }));
        }
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
        onSearch({ ...criteria, pattern, rondLevel: rondRange.min, maxRondLevel: rondRange.max });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                    <div>
                        <label htmlFor="number-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">جستجوی شماره</label>
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
                        <label htmlFor="carrier-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اپراتور</label>
                        <select
                            id="carrier-search"
                            name="carrier"
                            value={criteria.carrier}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                        >
                            <option value="all">همه</option>
                            {carriers.map(carrier => (
                                <option key={carrier.id} value={carrier.name_fa}>
                                    {carrier.name_fa}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع آگهی</label>
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رند</label>
                        <div className="flex items-center h-full space-x-2">
                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={criteria.isRond}
                                    onChange={handleRondChange}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                <span className="ms-2 text-sm font-medium text-gray-700 dark:text-gray-300">فقط رند</span>
                            </label>
                        </div>
                    </div>
                    {criteria.isRond && (
                        <div>
                            <label htmlFor="rond-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">درجه رند</label>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <select
                                    id="rond-level-min"
                                    value={rondRange.min}
                                    onChange={handleRondMinChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                                >
                                    <option value="1">۱ ستاره</option>
                                    <option value="2">۲ ستاره</option>
                                    <option value="3">۳ ستاره</option>
                                    <option value="4">۴ ستاره</option>
                                    <option value="5">۵ ستاره</option>
                                </select>
                                <span className="text-gray-500 dark:text-gray-400">تا</span>
                                <select
                                    id="rond-level-max"
                                    value={rondRange.max}
                                    onChange={handleRondMaxChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                                >
                                    <option value="1">۱ ستاره</option>
                                    <option value="2">۲ ستاره</option>
                                    <option value="3">۳ ستاره</option>
                                    <option value="4">۴ ستاره</option>
                                    <option value="5">۵ ستاره</option>
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">بازه قیمت</label>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {priceRange.min.toLocaleString('fa-IR')} - {priceRange.max.toLocaleString('fa-IR')} تومان
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="range"
                                min="0"
                                max="10000000"
                                step="100000"
                                value={priceRange.min}
                                onChange={handleMinPriceSlide}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                title="حداقل قیمت"
                            />
                            <input
                                type="range"
                                min="0"
                                max="10000000"
                                step="100000"
                                value={priceRange.max}
                                onChange={handleMaxPriceSlide}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                title="حداکثر قیمت"
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>۰</span>
                            <span>۱۰,۰۰۰,۰۰۰</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">&nbsp;</label>
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors h-full flex items-center justify-center">
                            جستجو
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">جستجو با الگوی شماره</label>
                    <div className="flex justify-center gap-2 flex-wrap">
                        {pattern.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handlePatternChange(index, e.target.value)}
                                className="w-10 h-12 text-center text-lg font-bold border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700"
                                placeholder="_"
                            />
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">ارقام دلخواه را وارد کنید و خالی بگذارید تا نادیده گرفته شود</p>
                </div>
            </form>
        </div>
    );
};

export default AdvancedSearch;