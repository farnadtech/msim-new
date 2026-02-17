import React from 'react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import 'react-multi-date-picker/styles/colors/teal.css';

interface PersianDatePickerProps {
    value: Date | string | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    format?: string;
    minDate?: Date;
    maxDate?: Date;
    className?: string;
    required?: boolean;
}

const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
    value,
    onChange,
    placeholder = 'تاریخ را انتخاب کنید',
    format = 'YYYY/MM/DD',
    minDate,
    maxDate,
    className = '',
    required = false
}) => {
    const handleChange = (date: any) => {
        if (date) {
            // Convert Persian date to Gregorian Date object
            onChange(date.toDate());
        } else {
            onChange(null);
        }
    };

    return (
        <div className="persian-datepicker-wrapper">
            <DatePicker
                value={value ? new Date(value) : null}
                onChange={handleChange}
                calendar={persian}
                locale={persian_fa}
                format={format}
                placeholder={placeholder}
                minDate={minDate}
                maxDate={maxDate}
                calendarPosition="bottom-right"
                containerClassName="w-full"
                inputClass="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required={required}
                className="teal"
                style={{
                    width: '100%',
                    height: '42px'
                }}
            />
            <style>{`
                /* استایل‌های دارک مود برای تقویم */
                .dark .rmdp-wrapper {
                    background-color: #1f2937 !important;
                    border-color: #374151 !important;
                    color: #f3f4f6 !important;
                }
                
                .dark .rmdp-header {
                    background-color: #1f2937 !important;
                    color: #f3f4f6 !important;
                }
                
                .dark .rmdp-day {
                    color: #f3f4f6 !important;
                }
                
                .dark .rmdp-day:not(.rmdp-disabled):not(.rmdp-day-hidden) span:hover {
                    background-color: #374151 !important;
                }
                
                .dark .rmdp-day.rmdp-today span {
                    background-color: #3b82f6 !important;
                    color: white !important;
                }
                
                .dark .rmdp-day.rmdp-selected span:not(.highlight) {
                    background-color: #10b981 !important;
                    color: white !important;
                }
                
                .dark .rmdp-week-day {
                    color: #9ca3af !important;
                }
                
                .dark .rmdp-arrow {
                    border-color: #f3f4f6 !important;
                }
                
                .dark .rmdp-disabled {
                    color: #6b7280 !important;
                }
                
                /* استایل‌های انتخاب ماه و سال در دارک مود */
                .dark .rmdp-month-picker,
                .dark .rmdp-year-picker {
                    background-color: #1f2937 !important;
                }
                
                .dark .rmdp-month-picker div,
                .dark .rmdp-year-picker div {
                    color: #f3f4f6 !important;
                    background-color: transparent !important;
                }
                
                .dark .rmdp-month-picker div:hover,
                .dark .rmdp-year-picker div:hover {
                    background-color: #374151 !important;
                    color: white !important;
                }
                
                .dark .rmdp-month-picker .rmdp-selected,
                .dark .rmdp-year-picker .rmdp-selected {
                    background-color: #10b981 !important;
                    color: white !important;
                }
                
                /* استایل‌های لایت مود */
                .rmdp-wrapper {
                    background-color: white !important;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default PersianDatePicker;
