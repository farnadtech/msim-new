
import React from 'react';
// FIX: Replaced v5 `useHistory` with v6 `useNavigate` to resolve module export error.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        // Moon Icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        // Sun Icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
};

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    if (user) {
      navigate(`/${user.role}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          Msim724
        </Link>
        <nav className="hidden md:flex items-center space-x-reverse space-x-6">
          <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-500">صفحه اصلی</Link>
          <Link to="/rond-numbers" className="text-gray-600 dark:text-gray-300 hover:text-blue-500">شماره های رند</Link>
          <Link to="/auctions" className="text-gray-600 dark:text-gray-300 hover:text-blue-500">حراجی ها</Link>
          <Link to="/packages" className="text-gray-600 dark:text-gray-300 hover:text-blue-500">تعرفه ها</Link>
        </nav>
        <div className="flex items-center space-x-reverse space-x-2">
          <ThemeToggle />
          {user ? (
            <div className="relative group pb-2">
              <button onClick={handleDashboardClick} className="flex items-center space-x-2 space-x-reverse bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-full">
                 <span>{user.name}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 hidden group-hover:block group-focus-within:block">
                  <button onClick={handleDashboardClick} className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">پنل کاربری</button>
                  <button onClick={handleLogout} className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">خروج</button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors">
              ورود / ثبت نام
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;