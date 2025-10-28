import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import SimCard from '../components/SimCard';
import AdvancedSearch from '../components/AdvancedSearch';
import { SimCard as SimCardType } from '../types';
import useAuctionProcessor from '../hooks/useAuctionProcessor';

// Define the SearchCriteria interface locally since it's not exported
interface SearchCriteria {
    number: string;
    carrier: string;
    type: string;
    minPrice: string;
    maxPrice: string;
    isRond: boolean;
    pattern: string[];
}

const HomePage: React.FC = () => {
    const { simCards, loading } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchResults, setSearchResults] = useState<SimCardType[] | null>(null);
    
    // Remove the duplicate useAuctionProcessor hook - it's already in App.tsx
    // useAuctionProcessor();

    // Define isRecentlySold function locally
    const isRecentlySold = (sim: SimCardType) => {
        return sim.status === 'sold' && sim.sold_date && new Date(sim.sold_date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
    };

    const handleSearch = (criteria: Omit<SearchCriteria, 'minPrice' | 'maxPrice' | 'isRond'>) => {
        const results = simCards.filter(sim => {
            // Only show available sims in search
            if (sim.status !== 'available') {
                return false;
            }

            const numberMatch = sim.number.includes(criteria.number);
            const carrierMatch = criteria.carrier === 'all' || sim.carrier === criteria.carrier;
            const typeMatch = criteria.type === 'all' || sim.type === criteria.type;

            const patternString = criteria.pattern.map(p => p || '.').join('');
            const isPatternUsed = patternString.replace(/\./g, '').length > 0;
            const patternRegex = new RegExp(`^${patternString}$`);
            const patternMatch = !isPatternUsed || patternRegex.test(sim.number);
            
            return numberMatch && carrierMatch && typeMatch && patternMatch;
        });
        setSearchResults(results);
    };

    const handlePackagesClick = () => {
        if (user) {
            navigate(`/${user.role}/packages`);
        } else {
            navigate('/login');
        }
    }
    
    // Using useMemo to prevent re-calculating on every render
    const featuredSims = useMemo(() => {
        // Simple logic: get a few available sims, prioritizing rond and auctions
        return [...simCards]
            .filter(s => s.status === 'available') // Only show available sims
            .sort((a, b) => {
                if (a.is_rond !== b.is_rond) return a.is_rond ? -1 : 1;
                if (a.type === 'auction' && b.type !== 'auction') return -1;
                if (a.type !== 'auction' && b.type === 'auction') return 1;
                return b.price - a.price; // Higher price first
            })
            .slice(0, 8);
    }, [simCards]);

    // Get operator-specific sims for the new sections
    const operatorSims = useMemo(() => {
        const operators = ['همراه اول', 'ایرانسل', 'رایتل'];
        const result: Record<string, SimCardType[]> = {};
        
        operators.forEach(operator => {
            result[operator] = [...simCards]
                .filter(s => s.carrier === operator && s.status === 'available') // Only show available sims
                .sort((a, b) => {
                    if (a.is_rond !== b.is_rond) return a.is_rond ? -1 : 1;
                    if (a.type === 'auction' && b.type !== 'auction') return -1;
                    if (a.type !== 'auction' && b.type === 'auction') return 1;
                    return b.price - a.price;
                })
                .slice(0, 4); // Show only 4 sims per operator
        });
        
        return result;
    }, [simCards]);

    // Get recently sold sims for the bottom section
    const recentlySoldSims = useMemo(() => {
        return [...simCards]
            .filter(isRecentlySold)
            .sort((a, b) => {
                // Sort by sold date, newest first
                const dateA = a.sold_date ? new Date(a.sold_date).getTime() : 0;
                const dateB = b.sold_date ? new Date(b.sold_date).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 8); // Show only 8 recently sold sims
    }, [simCards]);

    const displaySims = searchResults !== null ? searchResults : featuredSims;

    // Function to navigate to operator page
    const goToCarrierPage = (carrierName: string) => {
        const carrierSlug = carrierName === 'همراه اول' ? 'hamrah-aval' : 
                           carrierName === 'ایرانسل' ? 'irancell' : 'raytel';
        navigate(`/carrier/${carrierSlug}`);
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-20"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                        بازار آنلاین سیمکارت Msim724
                    </h1>
                    <p className="text-lg md:text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
                        به راحتی سیمکارت مورد نظر خود را پیدا کنید، بفروشید یا در حراجی های هیجان انگیز شرکت کنید.
                    </p>
                    <div className="max-w-2xl mx-auto">
                       <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const searchInput = (e.target as HTMLFormElement).elements.namedItem('main-search') as HTMLInputElement;
                                handleSearch({ number: searchInput.value, carrier: 'all', type: 'all', pattern: Array(11).fill('') });
                            }}
                            className="relative"
                        >
                            <input
                                type="text"
                                name="main-search"
                                placeholder="... شماره مورد نظر را وارد کنید 0912"
                                className="w-full text-gray-900 dark:text-white bg-white dark:bg-gray-800/80 placeholder-gray-500 rounded-full py-4 pl-14 pr-6 shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 transition"
                            />
                            <button
                                type="submit"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </section>
            
            <div className="container mx-auto px-6 py-12">

                <AdvancedSearch onSearch={handleSearch} />
                
                <section>
                    <div className="flex justify-between items-center mb-6">
                         <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                            {searchResults !== null ? 'نتایج جستجو' : 'آگهی های ویژه'}
                         </h2>
                         {searchResults !== null && (
                            <button onClick={() => setSearchResults(null)} className="text-blue-600 hover:text-blue-800">
                                پاک کردن جستجو
                            </button>
                         )}
                    </div>
                   
                    {loading ? (
                        <div className="text-center py-10">در حال بارگذاری...</div>
                    ) : displaySims.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {displaySims.map(sim => (
                                <SimCard key={sim.id} sim={sim} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                {searchResults !== null ? 'هیچ سیمکارتی با مشخصات مورد نظر یافت نشد.' : 'هیچ سیمکارتی برای نمایش وجود ندارد.'}
                            </p>
                        </div>
                    )}
                </section>

                {/* Operator Sections */}
                <section className="mt-16">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">سیمکارت های هر اپراتور</h2>
                    
                    {/* Hamrah Aval */}
                    <div className="mb-12">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">همراه اول</h3>
                            <button 
                                onClick={() => goToCarrierPage('همراه اول')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                مشاهده همه
                            </button>
                        </div>
                        {loading ? (
                            <div className="text-center py-6">در حال بارگذاری...</div>
                        ) : operatorSims['همراه اول'].length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {operatorSims['همراه اول'].map(sim => (
                                    <SimCard key={sim.id} sim={sim} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <p className="text-gray-500 dark:text-gray-400">در حال حاضر سیمکارتی برای همراه اول وجود ندارد.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Irancell */}
                    <div className="mb-12">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">ایرانسل</h3>
                            <button 
                                onClick={() => goToCarrierPage('ایرانسل')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                مشاهده همه
                            </button>
                        </div>
                        {loading ? (
                            <div className="text-center py-6">در حال بارگذاری...</div>
                        ) : operatorSims['ایرانسل'].length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {operatorSims['ایرانسل'].map(sim => (
                                    <SimCard key={sim.id} sim={sim} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <p className="text-gray-500 dark:text-gray-400">در حال حاضر سیمکارتی برای ایرانسل وجود ندارد.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Raitel */}
                    <div className="mb-12">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">رایتل</h3>
                            <button 
                                onClick={() => goToCarrierPage('رایتل')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                مشاهده همه
                            </button>
                        </div>
                        {loading ? (
                            <div className="text-center py-6">در حال بارگذاری...</div>
                        ) : operatorSims['رایتل'].length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {operatorSims['رایتل'].map(sim => (
                                    <SimCard key={sim.id} sim={sim} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <p className="text-gray-500 dark:text-gray-400">در حال حاضر سیمکارتی برای رایتل وجود ندارد.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Recently Sold Section */}
                <section className="mt-16">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">آخرین سیمکارت های فروخته شده</h2>
                    
                    {loading ? (
                        <div className="text-center py-6">در حال بارگذاری...</div>
                    ) : recentlySoldSims.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {recentlySoldSims.map(sim => (
                                <SimCard key={sim.id} sim={sim} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p className="text-gray-500 dark:text-gray-400">در حال حاضر سیمکارت فروخته شده ای وجود ندارد.</p>
                        </div>
                    )}
                </section>
                
                <section className="mt-20 text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-10">
                        <h2 className="text-3xl font-bold mb-4">فروشنده هستید؟</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">به جامعه فروشندگان ما بپیوندید و سیمکارت های خود را به هزاران خریدار عرضه کنید.</p>
                        <button onClick={handlePackagesClick} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">
                            مشاهده تعرفه ها و ثبت نام
                        </button>
                    </div>
                </section>
            </div>
{/* TestSimCards component removed */}
        </div>
    );
};

export default HomePage;