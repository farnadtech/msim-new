
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Social */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">Msim724</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
              بزرگترین پلتفرم خرید و فروش آنلاین سیمکارت های دائمی و اعتباری در ایران.
            </p>
            <div className="flex space-x-4 space-x-reverse">
                <a href="#" aria-label="Instagram" className="text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.012-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.345 2.525c.636-.247 1.363-.416 2.427-.465C9.792 2.013 10.146 2 12.315 2zm0 1.62c-2.403 0-2.71.01-3.66.056-1.144.053-1.62.217-1.957.348-.487.188-.826.386-1.15.71a3.27 3.27 0 00-.71 1.15c-.13.336-.295.813-.348 1.957-.048.95-.056 1.257-.056 3.66s.008 2.71.056 3.66c.053 1.144.218 1.62.348 1.957.188.487.386.826.71 1.15a3.27 3.27 0 001.15.71c.336.13.813.295 1.957.348.95.048 1.257.056 3.66.056s2.71-.008 3.66-.056c1.144-.053 1.62-.218 1.957-.348.487-.188.826-.386 1.15-.71a3.27 3.27 0 00.71-1.15c.13-.336.295-.813.348-1.957.048-.95.056-1.257.056-3.66s-.008-2.71-.056-3.66c-.053-1.144-.218-1.62-.348-1.957a3.27 3.27 0 00-.71-1.15c-.324-.324-.663-.522-1.15-.71-.336-.13-.813-.295-1.957-.348-.95-.048-1.257-.056-3.66-.056zM12 6.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.64a3.505 3.505 0 110-7.01 3.505 3.505 0 010 7.01zM16.95 6.405a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" clipRule="evenodd" /></svg>
                </a>
                <a href="#" aria-label="Telegram" className="text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.17.91-.494 1.208-.822 1.23-.696.047-1.225-.46-1.89- .902-1.038-.69-1.622-1.12-2.67-1.8-1.18-.74-.417-1.14 1.516-2.61.87-.65 1.558-1.21 1.822-1.594.264-.385.12-.66-.08-.857-.2-.198-1.422.957-1.98 1.343-.99.66-1.822 1.01-2.67 1.01-.847 0-2.427-.24-3.16-1.024-.733-.783-.89-1.635-.733-1.78.16-.145 2.15-1.043 7.527-3.445.696-.3 1.225-.46 1.516-.46z"/></svg>
                </a>
                 <a href="#" aria-label="Twitter" className="text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
            </div>
          </div>
          
          {/* Column 2: Quick Access */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 tracking-wide">دسترسی سریع</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">قوانین و مقررات</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">درباره ما</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">تماس با ما</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">سوالات متداول</a></li>
            </ul>
          </div>

          {/* Column 3: Operators */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 tracking-wide">اپراتورها</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">همراه اول</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">ایرانسل</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">رایتل</a></li>
            </ul>
          </div>
          
          {/* Column 4: Trust Symbol */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 tracking-wide">نماد اعتماد</h4>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center h-32">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
          </div>
        </div>
        
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; 1403 - تمامی حقوق برای Msim724 محفوظ است.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;