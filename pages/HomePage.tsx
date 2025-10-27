

import React, { useState, useMemo } from 'react';
// FIX: Replaced v5 `useHistory` with v6 `useNavigate` to resolve module export error.
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import SimCard from '../components/SimCard';
import AdvancedSearch from '../components/AdvancedSearch';
// Test components removed
import { SimCard as SimCardType } from '../types';
import { useAuth } from '../hooks/useAuth';

interface SearchCriteria {
    number: string;
    carrier: string;
    type: string;
    pattern: string[];
}

const isRecentlySold = (sim: SimCardType) => {
    return sim.status === 'sold' && sim.sold_date && new Date(sim.sold_date).getTime() > Date.now() - 24 * 60 * 60 * 1000;
};

const CarrierSection: React.FC<{
    title: string;
    carrier: 'همراه اول' | 'ایرانسل' | 'رایتل';
    simCards: SimCardType[];
    viewAllLink: string;
}> = ({ title, carrier, simCards, viewAllLink }) => {
    
    const carrierSims = useMemo(() => 
        simCards
        .filter(s => s.carrier === carrier && (s.status === 'available' || isRecentlySold(s)))
        .slice(0, 4),
    [simCards, carrier]);

    if (carrierSims.length === 0) {
        return null;
    }

    return (
        <section className="mt-16">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                <Link to={viewAllLink} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                    مشاهده همه
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {carrierSims.map(sim => (
                    <SimCard key={sim.id} sim={sim} />
                ))}
            </div>
        </section>
    );
};

const HomePage: React.FC = () => {
    const { simCards, loading } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchResults, setSearchResults] = useState<SimCardType[] | null>(null);

    const handleSearch = (criteria: Omit<SearchCriteria, 'minPrice' | 'maxPrice' | 'isRond'>) => {
        const results = simCards.filter(sim => {
            // A sim is searchable if it's available OR was sold in the last 24 hours
            if (sim.status !== 'available' && !isRecentlySold(sim)) {
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
            .filter(s => s.status === 'available' || isRecentlySold(s))
            .sort((a, b) => {
                if (a.is_rond !== b.is_rond) return a.is_rond ? -1 : 1;
                if (a.type === 'auction' && b.type !== 'auction') return -1;
                if (a.type !== 'auction' && b.type === 'auction') return 1;
                return b.price - a.price; // Higher price first
            })
            .slice(0, 8);
    }, [simCards]);

    const displaySims = searchResults !== null ? searchResults : featuredSims;

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
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor">
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

                {!loading && searchResults === null && (
                    <>
                        <CarrierSection 
                            title="شماره های همراه اول"
                            carrier="همراه اول"
                            simCards={simCards}
                            viewAllLink="/carrier/hamrah-aval"
                        />
                         <CarrierSection 
                            title="شماره های ایرانسل"
                            carrier="ایرانسل"
                            simCards={simCards}
                            viewAllLink="/carrier/irancell"
                        />
                         <CarrierSection 
                            title="شماره های رایتل"
                            carrier="رایتل"
                            simCards={simCards}
                            viewAllLink="/carrier/raytel"
                        />
                    </>
                )}
                
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
{/* Test components removed */}
        </div>
    );
};

export default HomePage;