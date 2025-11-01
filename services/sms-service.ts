/**
 * Melipayamak SMS Service
 * Handles OTP sending via pattern-based SMS
 */

const MELIPAYAMAK_API_URL = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';

// Configuration - In production, move these to environment variables
const SMS_CONFIG = {
  username: (import.meta as any).env?.VITE_MELIPAYAMAK_USERNAME || '',
  password: (import.meta as any).env?.VITE_MELIPAYAMAK_PASSWORD || '',
  // Pattern IDs - You need to create these patterns in Melipayamak panel
  otpPatternId: parseInt((import.meta as any).env?.VITE_MELIPAYAMAK_OTP_PATTERN_ID || '0'),
  activationPatternId: parseInt((import.meta as any).env?.VITE_MELIPAYAMAK_ACTIVATION_PATTERN_ID || '0'),
};

interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send OTP code via SMS using pattern
 * Pattern should be created in Melipayamak panel with variable: {code}
 * Example pattern: "کد تایید شما: {code}"
 */
export const sendOTP = async (phoneNumber: string, code: string): Promise<SendOTPResult> => {
  try {
    console.log('📱 Sending OTP to:', phoneNumber);

    const response = await fetch(MELIPAYAMAK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: SMS_CONFIG.username,
        password: SMS_CONFIG.password,
        text: code, // Just send the code value
        to: phoneNumber,
        bodyId: SMS_CONFIG.otpPatternId.toString(),
      }),
    });

    const result = await response.text();
    console.log('📨 SMS API Response:', result);

    // Check if result is a positive number (successful recId)
    const recId = parseInt(result);
    if (recId > 1000) {
      return {
        success: true,
        messageId: result,
      };
    }

    // Handle error codes
    const errorMessages: Record<number, string> = {
      '-10': 'متن حاوی لینک است',
      '-7': 'خطا در شماره فرستنده',
      '-6': 'خطای داخلی سرور',
      '-5': 'متن با الگو همخوانی ندارد',
      '-4': 'کد الگو صحیح نیست',
      '-3': 'خط ارسالی تعریف نشده',
      '-2': 'محدودیت تعداد شماره',
      '-1': 'دسترسی غیرفعال است',
      0: 'نام کاربری یا رمز عبور اشتباه',
      2: 'اعتبار کافی نیست',
      6: 'سامانه در حال بروزرسانی',
      7: 'متن حاوی کلمه فیلتر شده',
      10: 'کاربر غیرفعال است',
      11: 'ارسال ناموفق',
      12: 'مدارک کاربر ناقص است',
      16: 'شماره گیرنده یافت نشد',
      17: 'متن پیامک خالی است',
      18: 'شماره نامعتبر است',
      35: 'شماره در لیست سیاه است',
    };

    return {
      success: false,
      error: errorMessages[recId] || `خطای نامشخص: ${result}`,
    };
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ارسال پیامک',
    };
  }
};

/**
 * Send activation code for line verification
 * Pattern should include: {code}
 * Example: "کد فعال‌سازی خط شما: {code}"
 */
export const sendActivationCode = async (
  phoneNumber: string,
  code: string
): Promise<SendOTPResult> => {
  try {
    console.log('📱 Sending activation code to:', phoneNumber);

    const response = await fetch(MELIPAYAMAK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: SMS_CONFIG.username,
        password: SMS_CONFIG.password,
        text: code,
        to: phoneNumber,
        bodyId: SMS_CONFIG.activationPatternId.toString(),
      }),
    });

    const result = await response.text();
    console.log('📨 SMS API Response:', result);

    const recId = parseInt(result);
    if (recId > 1000) {
      return {
        success: true,
        messageId: result,
      };
    }

    return {
      success: false,
      error: `خطا در ارسال کد فعال‌سازی: ${result}`,
    };
  } catch (error) {
    console.error('❌ Activation code sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ارسال کد فعال‌سازی',
    };
  }
};

/**
 * Generate a 6-digit OTP code
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Validate phone number format (Iranian mobile numbers)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Iranian mobile numbers: 09xxxxxxxxx (11 digits starting with 09)
  const regex = /^09[0-9]{9}$/;
  return regex.test(phone);
};

/**
 * Format phone number to standard format
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Ensure it starts with 09
  if (digits.startsWith('9')) {
    return '0' + digits;
  }
  
  return digits;
};

export default {
  sendOTP,
  sendActivationCode,
  generateOTP,
  validatePhoneNumber,
  formatPhoneNumber,
};
