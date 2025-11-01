# Phone Number & OTP Authentication Implementation Guide

## Overview
This guide details the implementation of phone number authentication with OTP (One-Time Password) using Melipayamak SMS service for the Msim724 platform.

## Features Implemented

### 1. SMS Service Integration
✅ Created [`services/sms-service.ts`](file://e:\code\msim\services\sms-service.ts) with:
- `sendOTP()` - Send OTP code via pattern SMS
- `sendActivationCode()` - Send activation code for line verification
- `generateOTP()` - Generate 6-digit OTP
- `validatePhoneNumber()` - Validate Iranian mobile format (09xxxxxxxxx)
- `formatPhoneNumber()` - Format phone number to standard

### 2. Environment Variables Needed

Add to `.env` file:
```env
# Melipayamak SMS Configuration
VITE_MELIPAYAMAK_USERNAME=your_username
VITE_MELIPAYAMAK_PASSWORD=your_password
VITE_MELIPAYAMAK_OTP_PATTERN_ID=your_otp_pattern_id
VITE_MELIPAYAMAK_ACTIVATION_PATTERN_ID=your_activation_pattern_id
```

### 3. Melipayamak Panel Setup

You need to create 2 patterns in your Melipayamak panel:

#### Pattern 1: OTP Login/Signup
- **Name**: کد تایید ورود
- **Text**: `کد تایید شما: {code}`
- **Variable**: `{code}` (6-digit OTP)
- **Note Pattern ID** after creation

#### Pattern 2: Line Activation  
- **Name**: کد فعال‌سازی خط
- **Text**: `کد فعال‌سازی خط شما: {code}`
- **Variable**: `{code}` (activation code)
- **Note Pattern ID** after creation

### 4. Database Migration

Run this SQL in Supabase to update existing users and add phone column:

```sql
-- Add phone_number column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(11);
    END IF;
END $$;

-- Add unique index on phone_number
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique 
ON users(phone_number) WHERE phone_number IS NOT NULL;

-- Update existing users with default phone number
UPDATE users 
SET phone_number = '09356963201' 
WHERE phone_number IS NULL OR phone_number = '';

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(11) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL, -- 'login', 'signup', 'activation'
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    attempts INTEGER DEFAULT 0
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS otp_verifications_phone_idx ON otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS otp_verifications_expires_idx ON otp_verifications(expires_at);

-- Auto-delete expired OTPs (run this periodically or set up a cron job)
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_verifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Steps (TO DO)

### Step 1: Update Type Definitions ✅ ALREADY DONE
The User type already has optional `phoneNumber` field in types.ts

### Step 2: Create OTP API Functions

Create in `services/api-supabase.ts`:

```typescript
/**
 * Request OTP for login/signup
 */
export const requestOTP = async (phoneNumber: string, purpose: 'login' | 'signup'): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      return { success: false, message: 'شماره تلفن معتبر نیست' };
    }

    // Check if user exists for login, or doesn't exist for signup
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('phone_number', phoneNumber)
      .single();

    if (purpose === 'login' && !existingUser) {
      return { success: false, message: 'کاربری با این شماره یافت نشد' };
    }

    if (purpose === 'signup' && existingUser) {
      return { success: false, message: 'این شماره قبلاً ثبت شده است' };
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry

    // Save OTP to database
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: phoneNumber,
        otp_code: otpCode,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      console.error('Error saving OTP:', otpError);
      return { success: false, message: 'خطا در ایجاد کد تایید' };
    }

    // Send OTP via SMS
    const smsResult = await sendOTP(phoneNumber, otpCode);
    
    if (!smsResult.success) {
      return { success: false, message: smsResult.error || 'خطا در ارسال پیامک' };
    }

    return { success: true, message: 'کد تایید ارسال شد' };
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return { success: false, message: 'خطا در درخواست کد تایید' };
  }
};

/**
 * Verify OTP and login/signup
 */
export const verifyOTP = async (
  phoneNumber: string,
  otpCode: string,
  purpose: 'login' | 'signup',
  userData?: { name: string; role: 'buyer' | 'seller' }
): Promise<{ success: boolean; user?: User; message: string }> => {
  try {
    // Find valid OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', otpCode)
      .eq('purpose', purpose)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      // Increment attempts
      await supabase
        .from('otp_verifications')
        .update({ attempts: supabase.rpc('increment_attempts') })
        .eq('phone_number', phoneNumber)
        .eq('otp_code', otpCode);
      
      return { success: false, message: 'کد تایید نامعتبر یا منقضی شده است' };
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpData.id);

    if (purpose === 'login') {
      // Login: Find existing user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (userError || !user) {
        return { success: false, message: 'کاربر یافت نشد' };
      }

      return { success: true, user, message: 'ورود موفقیت‌آمیز' };
    } else {
      // Signup: Create new user
      if (!userData) {
        return { success: false, message: 'اطلاعات کاربر الزامی است' };
      }

      const newUser = {
        id: crypto.randomUUID(),
        name: userData.name,
        role: userData.role,
        phone_number: phoneNumber,
        wallet_balance: 0,
        blocked_balance: 0,
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return { success: false, message: 'خطا در ثبت نام' };
      }

      return { success: true, user: createdUser, message: 'ثبت نام موفقیت‌آمیز' };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'خطا در تایید کد' };
  }
};
```

### Step 3: Create Phone Login Page

Create `pages/PhoneLoginPage.tsx`:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestOTP, verifyOTP } from '../services/api-supabase';
import { validatePhoneNumber, formatPhoneNumber } from '../services/sms-service';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';

const PhoneLoginPage: React.FC = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOTPCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { showNotification } = useNotification();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const formatted = formatPhoneNumber(phoneNumber);
    if (!validatePhoneNumber(formatted)) {
      setError('شماره تلفن معتبر نیست');
      return;
    }
    
    setIsLoading(true);
    const result = await requestOTP(formatted, 'login');
    setIsLoading(false);
    
    if (result.success) {
      setPhoneNumber(formatted);
      setStep('otp');
      showNotification('کد تایید به شماره شما ارسال شد', 'success');
    } else {
      setError(result.message);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otpCode.length !== 6) {
      setError('کد تایید باید ۶ رقم باشد');
      return;
    }
    
    setIsLoading(true);
    const result = await verifyOTP(phoneNumber, otpCode, 'login');
    setIsLoading(false);
    
    if (result.success && result.user) {
      // Login successful
      await authLogin(result.user);
      showNotification('با موفقیت وارد شدید', 'success');
      navigate(`/${result.user.role}`);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex items-center justify-center py-16 sm:py-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">
          ورود با شماره تلفن
        </h1>
        
        {step === 'phone' ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium">
                شماره تلفن همراه
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 text-left"
                placeholder="09123456789"
                dir="ltr"
                required
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                کد تایید به این شماره ارسال خواهد شد
              </p>
            </div>
            
            {error && <p className="text-sm text-red-600">{error}</p>}
            
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? 'در حال ارسال...' : 'ارسال کد تایید'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium">
                کد تایید
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOTPCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 text-center text-2xl tracking-widest"
                placeholder="------"
                maxLength={6}
                dir="ltr"
                required
                disabled={isLoading}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                کد ۶ رقمی ارسال شده به {phoneNumber} را وارد کنید
              </p>
            </div>
            
            {error && <p className="text-sm text-red-600">{error}</p>}
            
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? 'در حال تایید...' : 'تایید و ورود'}
            </button>
            
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              disabled={isLoading}
            >
              تغییر شماره
            </button>
          </form>
        )}
        
        <div className="text-center text-sm">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:underline"
          >
            ورود با ایمیل و رمز عبور
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            حساب کاربری ندارید?{' '}
            <button
              onClick={() => navigate('/phone-signup')}
              className="font-medium text-blue-600 hover:underline"
            >
              ثبت نام با شماره تلفن
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhoneLoginPage;
```

### Step 4: Update LoginPage.tsx

Add link to phone login:

```typescript
// Add after the email/password form
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">یا</span>
  </div>
</div>

<button
  onClick={() => navigate('/phone-login')}
  className="w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700"
>
  ورود با شماره تلفن
</button>
```

### Step 5: Add Routes in App.tsx

```typescript
import PhoneLoginPage from './pages/PhoneLoginPage';
import PhoneSignupPage from './pages/PhoneSignupPage';

// In Routes:
<Route path="/phone-login" element={<PhoneLoginPage />} />
<Route path="/phone-signup" element={<PhoneSignupPage />} />
```

---

## Testing Checklist

### Before Testing
- [ ] Create patterns in Melipayamak panel
- [ ] Add credentials to .env file
- [ ] Run database migration SQL
- [ ] Verify all existing users have phone '09356963201'

### Test Scenarios

#### Test 1: Phone Login (Existing User)
1. Navigate to `/phone-login`
2. Enter phone: `09356963201`
3. Click "ارسال کد تایید"
4. Check SMS received
5. Enter OTP code
6. Click "تایید و ورود"
7. Should login successfully

#### Test 2: Phone Signup (New User)
1. Navigate to `/phone-signup`
2. Enter new phone number
3. Enter name and select role
4. Click "ارسال کد تایید"
5. Check SMS received
6. Enter OTP code
7. Should create account and login

#### Test 3: Line Activation (Seller)
1. Seller creates auction
2. Buyer wins and pays
3. Seller gets notification to send activation code
4. System sends SMS with activation code
5. Buyer verifies code
6. Purchase completes

---

## Security Considerations

1. **OTP Expiry**: 5 minutes
2. **Rate Limiting**: Add max 3 OTP requests per phone per hour
3. **Attempt Limiting**: Max 5 verification attempts per OTP
4. **Phone Validation**: Strict Iranian format
5. **Cleanup**: Auto-delete expired OTPs

---

## Files to Create/Modify

### New Files
- ✅ `services/sms-service.ts` - SMS integration
- ⏳ `pages/PhoneLoginPage.tsx` - Phone login UI
- ⏳ `pages/PhoneSignupPage.tsx` - Phone signup UI

### Modify Files
- ⏳ `.env` - Add Melipayamak credentials
- ⏳ `services/api-supabase.ts` - Add OTP functions
- ⏳ `pages/LoginPage.tsx` - Add phone login link
- ⏳ `pages/SignupPage.tsx` - Add phone signup link
- ⏳ `App.tsx` - Add phone login/signup routes
- ⏳ Run SQL migration in Supabase

---

## Next Steps

1. **Get Melipayamak Account**
   - Sign up at https://www.melipayamak.com/
   - Get username and password
   - Create 2 SMS patterns
   - Note the pattern IDs

2. **Configure Environment**
   - Update `.env` with credentials
   - Update pattern IDs

3. **Run Database Migration**
   - Execute SQL in Supabase SQL editor
   - Verify users table has phone_number column
   - Verify all users have default phone

4. **Create Remaining Pages**
   - PhoneLoginPage.tsx
   - PhoneSignupPage.tsx
   - Update existing pages with links

5. **Test End-to-End**
   - Request OTP
   - Verify SMS received
   - Complete login/signup
   - Test line activation

---

## Cost Estimation

Melipayamak pricing (approximate):
- Pattern SMS: ~50-100 تومان per SMS
- Monthly: ~100-500 users × 2-3 SMS each = 10,000-150,000 تومان/month
- Recommended: Start with 100,000 تومان credit

---

## Support

If you need help:
- **Melipayamak Support**: 021-63404
- **Documentation**: https://www.melipayamak.com/api/
- **Panel**: https://login.melipayamak.com/

---

**Status**: 
- ✅ SMS Service Created
- ⏳ Waiting for Melipayamak credentials
- ⏳ Need to create UI pages
- ⏳ Need to run database migration

Let me know when you have the Melipayamak credentials and I'll complete the implementation!
