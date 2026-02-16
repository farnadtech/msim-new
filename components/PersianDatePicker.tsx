import React from 'react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

interface PersianDatePickerProps {
    value: Date | string | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    format?: string;
    minDate?: Date;
    className?: string;
    required?: boolean;
}

const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
    value,
    onChange,
    placeholder = 'تاریخ را انتخاب کنید',
    format = 'YYYY/MM/DD HH:mm',
    minDate,
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
        <DatePicker
            value={value ? new Date(value) : null}
            onChange={handleChange}
            calendar={persian}
            locale={persian_fa}
            format={format}
            placeholder={placeholder}
            minDate={minDate}
            calendarPosition="bottom-right"
            containerClassName="w-full"
            inputClass="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required={required}
            style={{
                width: '100%',
                height: '42px'
            }}
        />
    );
};

export default PersianDatePicker;
