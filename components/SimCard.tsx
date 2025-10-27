import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SimCard as SimCardType } from '../types';

interface SimCardProps {
  sim: SimCardType;
}

const CountdownTimer: React.FC<{ endTime: string }> = ({ endTime }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(endTime) - +new Date();
        // FIX: Provide an explicit type for timeLeft to prevent type inference issues.
        // This resolves errors when accessing properties like `timeLeft.days`.
        let timeLeft: { [key: string]: number } = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };
    
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    const timerComponents: any[] = [];
    Object.keys(timeLeft).forEach(interval => {
        if (!timeLeft[interval]) return;
        timerComponents.push(
            <span key={interval}>
                {timeLeft[interval]}
            </span>
        );
    });
    
    // This part is a bit tricky for farsi, manual join
    let displayTime = "";
    if (timeLeft.days > 0) displayTime += `${timeLeft.days} روز و `;
    if (timeLeft.hours > 0) displayTime += `${timeLeft.hours} ساعت و `;
    if (timeLeft.minutes > 0) displayTime += `${timeLeft.minutes} دقیقه`;


    return <div>{timerComponents.length ? <div className="text-sm text-red-500">{displayTime}</div> : <span className="text-red-600">پایان یافته</span>}</div>;
}


const SimCard: React.FC<SimCardProps> = ({ sim }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price);
  };

  const getCarrierColor = (carrier: string) => {
    switch (carrier) {
      case 'همراه اول': return 'bg-blue-100 text-blue-800';
      case 'ایرانسل': return 'bg-yellow-100 text-yellow-800';
      case 'رایتل': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getButtonInfo = () => {
      if (sim.status === 'sold') {
        return { text: 'فروخته شده', className: 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' };
      }
      switch (sim.type) {
          case 'auction':
              return { text: 'مشاهده و شرکت در حراجی', className: 'bg-red-600 hover:bg-red-700' };
          case 'inquiry':
              return { text: 'استعلام قیمت و مشاهده', className: 'bg-orange-500 hover:bg-orange-600' };
          case 'fixed':
          default:
              return { text: 'مشاهده و خرید', className: 'bg-blue-600 hover:bg-blue-700' };
      }
  };

  const buttonInfo = getButtonInfo();

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col">
       {sim.status === 'sold' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                <span className="text-white text-xl font-bold bg-red-600 px-4 py-2 rounded-lg -rotate-12 transform">
                    فروخته شد
                </span>
            </div>
        )}
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-center mb-4">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getCarrierColor(sim.carrier)}`}>
            {sim.carrier}
          </span>
          {sim.is_rond && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              رند
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold text-center tracking-widest text-gray-800 dark:text-gray-100 mb-4" style={{direction: 'ltr'}}>
          {sim.number.slice(0, 4)} - {sim.number.slice(4, 7)} - {sim.number.slice(7)}
        </h3>
        {sim.type === 'auction' && sim.auction_details ? (
          <div className="text-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">بالاترین پیشنهاد</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatPrice(sim.auction_details.current_bid || 0)} تومان</p>
            <CountdownTimer endTime={sim.auction_details.end_time} />
          </div>
        ) : sim.type === 'inquiry' ? (
           <div className="text-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
             <p className="text-sm text-gray-500 dark:text-gray-400">قیمت</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">استعلام با تماس</p>
          </div>
        ) : (
          <div className="text-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">قیمت مقطوع</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(sim.price || 0)} تومان</p>
          </div>
        )}
      </div>
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
        <Link 
            to={`/sim/${sim.id}`} 
            className={`w-full text-center block font-bold py-3 px-4 rounded-lg text-white transition-colors duration-300 ${buttonInfo.className} ${sim.status === 'sold' ? 'pointer-events-none' : ''}`}
        >
          {buttonInfo.text}
        </Link>
      </div>
    </div>
  );
};

export default SimCard;