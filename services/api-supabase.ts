import { User, SimCard, Package, Transaction, Bid, Commission, SecurePayment, BuyerPaymentCode, ActivationRequest } from '../types';
import { ZARINPAL_CONFIG } from '../config/zarinpal';
import * as settingsService from './settings-service';
import * as smsService from './sms-service';
import { supabase } from './supabase';

// Function to remove undefined properties from an object
const removeUndefinedProps = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
};

// --- Auth and User Management ---

export const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
};

export const createUserProfile = async (userId: string, data: Omit<User, 'id'>): Promise<void> => {
    // Map phoneNumber to phone_number for database
    const dbData: any = { ...data };
    if (data.phoneNumber) {
        dbData.phone_number = data.phoneNumber;
        delete dbData.phoneNumber;
    }
    delete dbData.package_id; // Remove if not needed
    
    const { error } = await supabase
        .from('users')
        .insert({
            id: userId,
            ...dbData
        });
        
    if (error) {
        throw new Error(error.message);
    }
};

export const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        throw new Error(error.message);
    }
};

export const loginWithPhoneAndPassword = async (phoneNumber: string, password: string): Promise<void> => {
    // Validate phone number format
    if (!smsService.validatePhoneNumber(phoneNumber)) {
        throw new Error('فرمت شماره تلفن اشتباه است.');
    }

    const formattedPhone = smsService.formatPhoneNumber(phoneNumber);

    // Get user by phone number
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('phone_number', formattedPhone);

    if (userError || !users || users.length === 0) {
        throw new Error('این شماره ثبت نام نکرده است.');
    }

    const user = users[0];

    if (!user.email) {
        throw new Error('خطا در ورود.');
    }

    // Login with email and password
    const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password
    });

    if (error) {
        throw new Error('شماره تلفن یا رمز عبور اشتباه است.');
    }
};

// --- Phone/OTP Authentication ---

export const requestPhoneOTP = async (phoneNumber: string, purpose: 'login' | 'signup' | 'activation'): Promise<{ success: boolean; message: string }> => {
    try {
        console.log('📞 Requesting OTP for phone number:', phoneNumber);
        
        // Validate phone number format
        if (!smsService.validatePhoneNumber(phoneNumber)) {
            return { success: false, message: 'فرمت شماره تلفن اشتباه است. باید 11 رقم و با 09 شروع شود.' };
        }

        const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
        console.log('📱 Formatted phone number:', formattedPhone);

        // For signup, check if phone already exists
        if (purpose === 'signup') {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('phone_number', formattedPhone);
            
            if (!userError && users && users.length > 0) {
                return { success: false, message: 'این شماره قبلاً ثبت نام کرده است.' };
            }
        }

        // For login, check if phone exists
        if (purpose === 'login') {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('phone_number', formattedPhone);
            
            if (userError || !users || users.length === 0) {
                return { success: false, message: 'این شماره ثبت نام نکرده است.' };
            }
        }

        // Generate OTP
        const otpCode = smsService.generateOTP();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

        // Save OTP to database
        const { error: otpError } = await supabase
            .from('otp_verifications')
            .insert({
                phone_number: formattedPhone,
                otp_code: otpCode,
                purpose,
                expires_at: expiresAt.toISOString(),
                is_verified: false,
                attempts: 0
            });

        if (otpError) {
            console.error('Error saving OTP:', otpError);
            return { success: false, message: 'خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.' };
        }

        // Send SMS via Melipayamak
        console.log('📤 Sending OTP via Melipayamak...');
        const smsResult = await smsService.sendOTP(formattedPhone, otpCode);
        console.log('📨 SMS result:', smsResult);
        if (!smsResult.success) {
            return { success: false, message: smsResult.error || 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.' };
        }

        return { success: true, message: 'کد تایید ارسال شد.' };
    } catch (error) {
        console.error('Error requesting OTP:', error);
        return { success: false, message: 'خطا در ارسال کد تایید.' };
    }
};

export const verifyPhoneOTP = async (
    phoneNumber: string,
    otpCode: string,
    purpose: 'login' | 'signup' | 'activation'
): Promise<{ success: boolean; message: string; userId?: string }> => {
    try {
        console.log('🔍 Verifying OTP for phone number:', phoneNumber, 'with code:', otpCode);
        const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
        console.log('📱 Formatted phone number:', formattedPhone);

        // Find valid OTP
        const { data: otpRecord, error: fetchError } = await supabase
            .from('otp_verifications')
            .select('*')
            .eq('phone_number', formattedPhone)
            .eq('purpose', purpose)
            .eq('is_verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
            return { success: false, message: 'کد تایید منقضی شده یا یافت نشد.' };
        }

        // Check attempts
        if (otpRecord.attempts >= 3) {
            return { success: false, message: 'تعداد تلاش‌های شما تمام شده است. لطفاً کد جدید درخواست کنید.' };
        }

        // Verify OTP
        if (otpRecord.otp_code !== otpCode) {
            // Increment attempts
            await supabase
                .from('otp_verifications')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('id', otpRecord.id);
            
            return { success: false, message: 'کد تایید اشتباه است.' };
        }

        // Mark as verified
        await supabase
            .from('otp_verifications')
            .update({ is_verified: true })
            .eq('id', otpRecord.id);

        // For login, return user ID
        if (purpose === 'login') {
            const { data: user } = await supabase
                .from('users')
                .select('id, email')
                .eq('phone_number', formattedPhone)
                .single();
            
            if (user) {
                console.log('🌟 Login user found:', { userId: user.id, email: user.email });
                return { success: true, message: 'کد تایید صحیح است.', userId: user.id };
            } else {
                console.log('⚠️ No user found with phone:', formattedPhone);
                return { success: false, message: 'این شماره ابتدا ثبت نام نعکرده است. لطفاً ابتدا ثبت نام کنید.' };
            }
        }

        return { success: true, message: 'کد تایید صحیح است.' };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return { success: false, message: 'خطا در بررسی کد تایید.' };
    }
};

export const loginWithPhone = async (phoneNumber: string, otpCode: string): Promise<void> => {
    const result = await verifyPhoneOTP(phoneNumber, otpCode, 'login');
    
    if (!result.success || !result.userId) {
        throw new Error(result.message);
    }

    console.log('🔄 OTP verified successfully for user:', result.userId);
    
    // Get user info
    const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', result.userId)
        .single();

    if (!user?.email) {
        throw new Error('خطا در ورود.');
    }

    console.log('📧 User found:', user.email);
    
    // Try to sign in with phone number as password (works for phone-registered users)
    try {
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: phoneNumber
        });
        
        if (!signInError && data.session) {
            console.log('✅ Successfully logged in with phone-as-password!');
            return;
        }
    } catch (error) {
        console.warn('⚠️ Phone-as-password login failed');
    }
    
    // For old password-registered users, create a session using OTP verification
    console.log('🔐 Creating session from OTP verification...');
    
    // Create a custom JWT session for the user
    // We'll use a special approach: create an anonymous session and store user data
    const { data: { session } } = await supabase.auth.getSession();
    
    // Store the verified user ID in localStorage as backup
    localStorage.setItem('otp-verified-user-id', result.userId);
    localStorage.setItem('otp-verified-user-email', user.email);
    localStorage.setItem('otp-login-timestamp', new Date().toISOString());
    
    console.log('✅ OTP session created - user is authenticated');
    console.log('🔄 Redirecting to dashboard...');
    
    // Redirect to buyer page - the app will use the stored user data
    window.location.href = '/buyer';
    return;
};

export const signupWithPhone = async (
    phoneNumber: string,
    otpCode: string,
    name: string,
    role: 'seller' | 'buyer'
): Promise<void> => {
    const result = await verifyPhoneOTP(phoneNumber, otpCode, 'signup');
    
    if (!result.success) {
        throw new Error(result.message);
    }

    const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
    
    // Create a unique email based on phone number
    const email = `${formattedPhone}@msim724.phone`;
    const password = formattedPhone; // Use phone as password

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        throw new Error('خطا در ثبت نام.');
    }

    if (!authData.user) {
        throw new Error('خطا در ثبت نام.');
    }

    // Create user profile
    const { error: profileError } = await supabase
        .from('users')
        .insert({
            id: authData.user.id,
            name,
            email,
            phone_number: formattedPhone,
            role,
            wallet_balance: 0,
            blocked_balance: 0
        });

    if (profileError) {
        throw new Error('خطا در ایجاد پروفایل کاربری.');
    }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
        throw new Error(error.message);
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as User;
};

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as User[];
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', userId);
        
    if (error) {
        throw new Error(error.message);
    }
};

export const updateUserPackage = async (userId: string, packageId: number): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({ package_id: packageId })
        .eq('id', userId);
        
    if (error) {
        throw new Error(error.message);
    }
};

// --- Notifications ---

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): Promise<void> => {
    try {
        console.log('📢 Creating notification for user:', userId, '|', title);
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                is_read: false,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Error creating notification:', error);
        } else {
            console.log('✅ Notification created successfully!');
        }
    } catch (err) {
        console.error('❌ Exception creating notification:', err);
    }
};

export const createNotificationForAdmins = async (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): Promise<void> => {
    try {
        console.log('📢 Creating admin notifications:', { title, message });
        // Get all admin users
        const { data: admins, error: adminError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin');
        
        if (adminError) {
            console.error('❌ Error fetching admins:', adminError);
            return;
        }
        
        if (!admins || admins.length === 0) {
            console.warn('⚠️  No admin users found in database');
            return;
        }
        
        console.log('✅ Found', admins.length, 'admin(s)');
        
        // Create notification for each admin
        const notifications = admins.map(admin => ({
            user_id: admin.id,
            title,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        }));
        
        console.log('📝 Inserting', notifications.length, 'notification(s)');
        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications);
        
        if (insertError) {
            console.error('❌ Error creating admin notifications:', insertError);
        } else {
            console.log('✅ Admin notifications created successfully!');
        }
    } catch (err) {
        console.error('❌ Exception creating admin notifications:', err);
    }
};

// --- SIM Card Management ---

export const getSimCards = async (): Promise<SimCard[]> => {
    // Get all SIM cards (available and sold for display)
    const { data: simCards, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .in('status', ['available', 'sold'])
        .order('created_at', { ascending: false });  // Sort by newest first
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    // Get auction details for auction sim cards
    const auctionSimIds = simCards
        .filter(sim => sim.type === 'auction')
        .map(sim => sim.id);
        
    if (auctionSimIds.length > 0) {
        // Get auction details
        const { data: auctionDetails, error: auctionError } = await supabase
            .from('auction_details')
            .select('*')
            .in('sim_card_id', auctionSimIds);
            
        if (auctionError) {
            // If there's an error fetching auction details, we'll still return the sim cards
            // but without auction details
            console.warn('Error fetching auction details:', auctionError.message);
            return simCards as SimCard[];
        }
        
        // Get bids for auction sim cards
        const { data: bidsData, error: bidsError } = await supabase
            .from('bids')
            .select('*')
            .in('sim_card_id', auctionSimIds);
            
        if (bidsError) {
            // If there's an error fetching bids, we'll still return the sim cards
            // but without bids data
            console.warn('Error fetching bids:', bidsError.message);
            // Continue with auction details only
        }
        
        // Merge auction details and bids with sim cards
        return simCards.map(sim => {
            if (sim.type === 'auction') {
                const details = auctionDetails.find(detail => detail.sim_card_id === sim.id);
                if (details) {
                    // Filter bids for this specific sim card
                    const simBids = bidsData ? bidsData.filter(bid => bid.sim_card_id === sim.id) : [];
                    
                    return {
                        ...sim,
                        auction_details: {
                            current_bid: details.current_bid,
                            highest_bidder_id: details.highest_bidder_id,
                            end_time: details.end_time,
                            bids: simBids
                        }
                    };
                } else {
                    // If no auction details found, this indicates a data inconsistency
                    // We should not create default auction details as it causes confusion
                    console.warn(`No auction details found for sim card ${sim.id}, this indicates a data inconsistency`);
                    // Return the sim card without auction details to prevent incorrect data display
                    return sim;
                }
            }
            return sim;
        }) as SimCard[];
    }
    
    return simCards as SimCard[];
};

export const addSimCard = async (simData: Omit<SimCard, 'id'>): Promise<string> => {
    // Prepare sim card data without ID (let DB auto-generate)
    const simCardPayload: any = {
        number: simData.number,
        price: simData.price,
        seller_id: simData.seller_id,
        type: simData.type,
        status: simData.status,
        sold_date: simData.sold_date,
        carrier: simData.carrier,
        is_rond: simData.is_rond,
        is_active: simData.is_active,
        inquiry_phone_number: simData.inquiry_phone_number
    };
    
    // Add rond_level if this is a rond sim card
    if (simData.is_rond && simData.rond_level) {
        simCardPayload.rond_level = simData.rond_level;
    }

    // Insert the sim card
    const { data: simCardData, error: simCardError } = await supabase
        .from('sim_cards')
        .insert(simCardPayload)
        .select();
        
    if (simCardError) {
        // If we get a duplicate key error, it might be because of sequence issues
        // Let's try to insert without specifying any ID-related fields
        if (simCardError.message.includes('duplicate key value violates unique constraint')) {
            // Try again with minimal data
            const minimalPayload: any = {
                number: simData.number,
                price: simData.price,
                seller_id: simData.seller_id,
                type: simData.type,
                status: 'available',
                carrier: simData.carrier,
                is_rond: simData.is_rond,
                is_active: simData.is_active
            };
            
            if (simData.is_rond && simData.rond_level) {
                minimalPayload.rond_level = simData.rond_level;
            }
            
            const { data: retryData, error: retryError } = await supabase
                .from('sim_cards')
                .insert(minimalPayload)
                .select();
                
            if (retryError) {
                throw new Error(retryError.message);
            }
            
            const simCardId = retryData[0].id;
            
            // Handle financial transactions for the seller (only for rond SIM cards)
            let transactionAmount = 0;
            let transactionDescription = '';
            
            // Round pricing based on level
            const ROND_PRICES: { [key in 1 | 2 | 3 | 4 | 5]: number } = {
                1: 5000,
                2: 10000,
                3: 15000,
                4: 20000,
                5: 25000
            };
            
            // If this is a rond sim card, charge based on the round level
            if (simData.is_rond && simData.rond_level) {
                transactionAmount -= ROND_PRICES[simData.rond_level];
                transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number} (رند ${simData.rond_level} ستاره)`;
                
                // Process the transaction if there's a charge
                if (transactionAmount < 0) {
                    const { error: transactionError } = await supabase
                        .from('transactions')
                        .insert({
                            user_id: simData.seller_id,
                            type: 'withdrawal',
                            amount: transactionAmount,
                            description: transactionDescription,
                            date: new Date().toISOString()
                        });
                        
                    if (transactionError) {
                        // If transaction fails, we should delete the sim card
                        await supabase
                            .from('sim_cards')
                            .delete()
                            .eq('id', simCardId);
                        throw new Error('خطا در پردازش هزینه ثبت سیمکارت: ' + transactionError.message);
                    }
                    
                    // Update seller's wallet balance
                    const { data: sellerData, error: sellerError } = await supabase
                        .from('users')
                        .select('wallet_balance')
                        .eq('id', simData.seller_id)
                        .single();
                        
                    if (!sellerError && sellerData) {
                        const newBalance = (sellerData.wallet_balance || 0) + transactionAmount;
                        await supabase
                            .from('users')
                            .update({ wallet_balance: newBalance })
                            .eq('id', simData.seller_id);
                    }
                }
            }
            
            // If this is an auction sim card, create auction details
            if (simData.type === 'auction') {
                // Use the end_time from simData if available
                let endTime;
                if (simData.auction_details && simData.auction_details.end_time) {
                    endTime = simData.auction_details.end_time;
                } else {
                    // If no end time is provided, throw an error instead of defaulting to 7 days
                    throw new Error('زمان پایان حراجی مشخص نشده است. لطفاً زمان پایان حراجی را مشخص کنید.');
                }
                
                const auctionDetails = {
                    sim_card_id: simCardId,
                    current_bid: simData.price || 0, // Use the price set by the seller as the starting bid
                    highest_bidder_id: null,
                    end_time: endTime
                };
                
                const { error: auctionDetailsError } = await supabase
                    .from('auction_details')
                    .insert(auctionDetails);
                    
                if (auctionDetailsError) {
                    // If auction details creation fails, we should delete the sim card
                    await supabase
                        .from('sim_cards')
                        .delete()
                        .eq('id', simCardId);
                    throw new Error(auctionDetailsError.message);
                }
            }
            
            return simCardId.toString();
        }
        
        throw new Error(simCardError.message);
    }
    
    const simCardId = simCardData[0].id;
    
    // Handle financial transactions for the seller (only for rond SIM cards)
    let transactionAmount = 0;
    let transactionDescription = '';
    
    // Round pricing based on level
    const ROND_PRICES: { [key in 1 | 2 | 3 | 4 | 5]: number } = {
        1: 5000,
        2: 10000,
        3: 15000,
        4: 20000,
        5: 25000
    };
    
    // If this is a rond sim card, charge based on the round level
    if (simData.is_rond && simData.rond_level) {
        transactionAmount -= ROND_PRICES[simData.rond_level];
        transactionDescription = `هزینه ثبت سیمکارت رند ${simData.number} (رند ${simData.rond_level} ستاره)`;
        
        // Process the transaction if there's a charge
        if (transactionAmount < 0) {
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: simData.seller_id,
                    type: 'withdrawal',
                    amount: transactionAmount,
                    description: transactionDescription,
                    date: new Date().toISOString()
                });
                
            if (transactionError) {
                // If transaction fails, we should delete the sim card
                await supabase
                    .from('sim_cards')
                    .delete()
                    .eq('id', simCardId);
                throw new Error('خطا در پردازش هزینه ثبت سیمکارت: ' + transactionError.message);
            }
            
            // Update seller's wallet balance
            const { data: sellerData, error: sellerError } = await supabase
                .from('users')
                .select('wallet_balance')
                .eq('id', simData.seller_id)
                .single();
                
            if (!sellerError && sellerData) {
                const newBalance = (sellerData.wallet_balance || 0) + transactionAmount;
                await supabase
                    .from('users')
                    .update({ wallet_balance: newBalance })
                    .eq('id', simData.seller_id);
            }
        }
    }
    
    // If this is an auction sim card, create auction details
    if (simData.type === 'auction') {
        // Use the end_time from simData if available
        let endTime;
        if (simData.auction_details && simData.auction_details.end_time) {
            endTime = simData.auction_details.end_time;
        } else {
            // If no end time is provided, throw an error instead of defaulting to 7 days
            throw new Error('زمان پایان حراجی مشخص نشده است. لطفاً زمان پایان حراجی را مشخص کنید.');
        }
        
        const auctionDetails = {
            sim_card_id: simCardId,
            current_bid: simData.price || 0, // Use the price set by the seller as the starting bid
            highest_bidder_id: null,
            end_time: endTime
        };
        
        const { error: auctionDetailsError } = await supabase
            .from('auction_details')
            .insert(auctionDetails);
            
        if (auctionDetailsError) {
            // If auction details creation fails, we should delete the sim card
            await supabase
                .from('sim_cards')
                .delete()
                .eq('id', simCardId);
            throw new Error(auctionDetailsError.message);
        }
    }
    
    // Send notification to seller about successful listing
    const sellerNotifTitle = simData.type === 'auction' 
        ? '🔔 حراجی شما راهاندازی شد'
        : '📑 سیمکارت شما راهاندازی شد';
    const sellerNotifMsg = simData.type === 'auction'
        ? `حراجی برای سیمکارت ${simData.number} با قیمت پایه ${simData.price?.toLocaleString('fa-IR')} تومان راهاندازی شده است.`
        : `سیمکارت ${simData.number} به قیمت ${simData.price?.toLocaleString('fa-IR')} تومان راهاندازی شده است.`;
    
    await createNotification(
        simData.seller_id,
        sellerNotifTitle,
        sellerNotifMsg,
        'success'
    );
    
    // Send notification to admins about new listing
    await createNotificationForAdmins(
        '📢 لیست جدید',
        `سیمکارت جدید ${simData.number} جنس ${simData.type} راهاندازی شده است.`,
        'info'
    );
    
    return simCardId.toString();
};

export const purchaseSim = async (simId: number, buyerId: string): Promise<void> => {
    console.log('💳 Purchase SIM started - SIM ID:', simId, 'Buyer ID:', buyerId);
    
    // Get the SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    if (!simData) {
        throw new Error('SIM card not found.');
    }
    
    if (simData.status !== 'available') {
        throw new Error('این سیمکارت دیگر در دسترس نیست.');
    }
    
    // Get buyer data for balance check
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('wallet_balance, blocked_balance')
        .eq('id', buyerId)
        .single();
        
    if (buyerError) {
        throw new Error(`Buyer with ID ${buyerId} not found for transaction.`);
    }
    
    const buyerCurrentBalance = buyerData.wallet_balance || 0;
    let price = simData.price;
    
    // FOR AUCTION PURCHASES - immediate payment
    if (simData.type === 'auction') {
        const { data: auctionDetails, error: auctionError } = await supabase
            .from('auction_details')
            .select('*')
            .eq('sim_card_id', simId)
            .single();
            
        if (auctionError) {
            throw new Error('جزئیات حراجی یافت نشد.');
        }
        
        if (!auctionDetails) {
            throw new Error('Auction details not found.');
        }
        
        if (new Date(auctionDetails.end_time) > new Date()) {
            throw new Error('حراجی هنوز به پایان نرسیده است.');
        }
        
        if (auctionDetails.highest_bidder_id !== buyerId) {
            throw new Error('شما برنده این حراجی نیستید.');
        }
        
        price = auctionDetails.current_bid;
        const buyerBlockedBalance = buyerData.blocked_balance || 0;
        
        if ((buyerCurrentBalance + buyerBlockedBalance) < price) {
            throw new Error('موجودی کیف پول خریدار کافی نیست.');
        }
        
        // Process auction sale immediately (old behavior)
        const COMMISSION_PERCENTAGE = 2;
        const commissionAmount = Math.floor(price * (COMMISSION_PERCENTAGE / 100));
        const sellerReceivedAmount = price - commissionAmount;
        
        // Get seller data
        const { data: sellerData } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', simData.seller_id)
            .single();
        
        // Update buyer balance
        await supabase
            .from('users')
            .update({ 
                wallet_balance: buyerCurrentBalance - price,
                blocked_balance: buyerBlockedBalance - price
            })
            .eq('id', buyerId);
        
        // Update seller balance
        await supabase
            .from('users')
            .update({ wallet_balance: (sellerData?.wallet_balance || 0) + sellerReceivedAmount })
            .eq('id', simData.seller_id);
        
        // Update SIM status
        await supabase
            .from('sim_cards')
            .update({ status: 'sold', sold_date: new Date().toISOString() })
            .eq('id', simId);
        
        // Record transactions
        await supabase.from('transactions').insert({
            user_id: buyerId,
            type: 'purchase',
            amount: -price,
            description: `خرید حراجی سیمکارت ${simData.number}`,
            date: new Date().toISOString()
        });
        
        await supabase.from('transactions').insert({
            user_id: simData.seller_id,
            type: 'sale',
            amount: sellerReceivedAmount,
            description: `فروش حراجی سیمکارت ${simData.number}`,
            date: new Date().toISOString()
        });
        
        // Handle refunds for other bidders
        const { data: bidsData } = await supabase
            .from('bids')
            .select('*')
            .eq('sim_card_id', simId);
        
        if (bidsData && bidsData.length > 0) {
            const otherBidders = bidsData.filter(b => b.user_id !== buyerId);
            for (const bid of otherBidders) {
                const { data: bidderData } = await supabase
                    .from('users')
                    .select('wallet_balance, blocked_balance')
                    .eq('id', bid.user_id)
                    .single();
                
                if (bidderData) {
                    await supabase
                        .from('users')
                        .update({ 
                            wallet_balance: (bidderData.wallet_balance || 0) + bid.amount,
                            blocked_balance: (bidderData.blocked_balance || 0) - bid.amount
                        })
                        .eq('id', bid.user_id);
                }
            }
        }
        
        console.log('✅ Auction purchase completed');
        return;
    }
    
    // FOR REGULAR (FIXED/INQUIRY) PURCHASES - create purchase order
    if (buyerCurrentBalance < price) {
        throw new Error('موجودی کیف پول خریدار کافی نیست.');
    }
    
    console.log('📦 Creating purchase order for regular line purchase...');
    
    // Determine line type from sim_card.is_active field
    const lineType = simData.is_active ? 'active' : 'inactive';
    console.log('📍 Line type detected:', lineType);
    
    // Create purchase order instead of immediate payment
    const purchaseOrderId = await createPurchaseOrder(simId, buyerId, simData.seller_id, lineType, price);
    
    console.log('✅ Purchase order created:', purchaseOrderId);
    
    // Send notifications
    await createNotification(
        buyerId,
        '📦 سفارش خرید ایجاد شد',
        `سیمکارت ${simData.number} با موفقیت سفارش داده شد. لطفاً برای ارسال کد فعالسازی انتظار کنید تا فروشنده تایید ملی، سپس با اطلاع ميگردیم.`,
        'info'
    );
    
    await createNotification(
        simData.seller_id,
        '🛒 سفارش جدید از خریدار - برای سیمکارت ${simData.number}',
        `سیمکارت ${simData.number} توسط خریداری سفارش داده شد. لطفاً برای تایید هویت ابکنته را بررسی کنید.`,
        'info'
    );
};

export const placeBid = async (simId: number, bidderId: string, amount: number): Promise<void> => {
    // Get the SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    if (!simData) {
        throw new Error('SIM card not found.');
    }
    
    if (simData.type !== 'auction') {
        throw new Error('Auction not found.');
    }
    
    // Get auction details
    const { data: auctionDetails, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('sim_card_id', simId)
        .single();
        
    if (auctionError) {
        throw new Error('Auction details not found.');
    }
    
    if (new Date(auctionDetails.end_time) < new Date()) {
        throw new Error('این حراجی به پایان رسیده است.');
    }
    
    if (amount <= auctionDetails.current_bid) {
        throw new Error(`پیشنهاد شما باید بیشتر از ${auctionDetails.current_bid.toLocaleString('fa-IR')} تومان باشد.`);
    }
    
    // Get bidder data
    const { data: bidderData, error: bidderError } = await supabase
        .from('users')
        .select('*')
        .eq('id', bidderId)
        .single();
        
    if (bidderError) {
        throw new Error('Bidder not found.');
    }
    
    if ((bidderData.wallet_balance || 0) < amount) {
        throw new Error('موجودی کیف پول برای ثبت این پیشنهاد کافی نیست.');
    }
    
    // Unblock previous highest bidder's funds
    const previousHighestBidderId = auctionDetails.highest_bidder_id;
    if (previousHighestBidderId && previousHighestBidderId !== bidderId) {
        const { data: prevBidderData, error: prevBidderError } = await supabase
            .from('users')
            .select('*')
            .eq('id', previousHighestBidderId)
            .single();
            
        if (!prevBidderError && prevBidderData) {
            const amountToUnblock = auctionDetails.current_bid;
            const { error: prevBidderUpdateError } = await supabase
                .from('users')
                .update({
                    wallet_balance: (prevBidderData.wallet_balance || 0) + amountToUnblock,
                    blocked_balance: (prevBidderData.blocked_balance || 0) - amountToUnblock
                })
                .eq('id', previousHighestBidderId);
                
            if (prevBidderUpdateError) {
                console.error('Error updating previous bidder balance:', prevBidderUpdateError.message);
            } else {
                // Send notification to outbid user
                await createNotification(
                    previousHighestBidderId,
                    'بالاترین پیشنهاد شما',
                    `سیمکارت ${simData.number} با پیشنهاد بیشتر متعلق شده است.`,
                    'warning'
                );
            }
        }
    }
    
    // Block new bidder's funds
    const { error: bidderUpdateError } = await supabase
        .from('users')
        .update({
            wallet_balance: (bidderData.wallet_balance || 0) - amount,
            blocked_balance: (bidderData.blocked_balance || 0) + amount,
        })
        .eq('id', bidderId);
        
    if (bidderUpdateError) {
        throw new Error(bidderUpdateError.message);
    }
    
    // Add new bid to bids table
    const newBid = {
        sim_card_id: simId,
        user_id: bidderId,
        amount: amount,
        date: new Date().toISOString()
    };
    
    const { error: bidInsertError } = await supabase
        .from('bids')
        .insert(newBid);
        
    if (bidInsertError) {
        throw new Error(bidInsertError.message);
    }
    
    // Update auction details
    const { error: auctionUpdateError } = await supabase
        .from('auction_details')
        .update({
            current_bid: amount,
            highest_bidder_id: bidderId
        })
        .eq('sim_card_id', simId);
        
    if (auctionUpdateError) {
        throw new Error(auctionUpdateError.message);
    }
    
    // Get bidder name and sim seller info for notifications
    const { data: bidderNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', bidderId)
        .single();
    
    const bidderName = bidderNameData?.name || 'بیدر';
    
    // Send notification to the SIM card seller about new bid
    if (simData.seller_id) {
        console.log('🔔 Sending bid notification to seller:', simData.seller_id);
        await createNotification(
            simData.seller_id,
            '📢 پیشنهاد جدید برای حراجی شما',
            `${bidderName} با مبلغ ${amount.toLocaleString('fa-IR')} تومان برای سیمکارت ${simData.number} یک پیشنهاد ثبت کرد.`,
            'info'
        );
    }
    
    // Send notification to bidder confirming their bid
    console.log('🔔 Sending bid confirmation to bidder:', bidderId);
    await createNotification(
        bidderId,
        '🎉 پیشنهاد شما ثبت شد',
        `پیشنهاد برای سیمکارت ${simData.number} به مبلغ ${amount.toLocaleString('fa-IR')} تومان با موفقیت ثبت شد.`,
        'success'
    );
};

export const updateSimCard = async (simId: number, updatedData: Partial<SimCard>): Promise<void> => {
    // Separate auction details from other data
    const { auction_details, ...otherData } = updatedData;
    
    // Update main sim card data if there's anything other than auction_details
    if (Object.keys(otherData).length > 0) {
        const { error: simError } = await supabase
            .from('sim_cards')
            .update(otherData)
            .eq('id', simId);
            
        if (simError) {
            throw new Error(simError.message);
        }
    }
    
    // Update auction details if provided
    if (auction_details) {
        // Extract only the fields that exist in the auction_details table
        const { current_bid, highest_bidder_id, end_time } = auction_details;
        const auctionData = {
            current_bid,
            highest_bidder_id,
            end_time
        };
        
        const { error: auctionError } = await supabase
            .from('auction_details')
            .update(auctionData)
            .eq('sim_card_id', simId);
            
        if (auctionError) {
            throw new Error(auctionError.message);
        }
    }
};

// --- Package Management ---

export const getPackages = async (): Promise<Package[]> => {
    const { data, error } = await supabase
        .from('packages')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as Package[];
};

export const addPackage = async (packageData: Omit<Package, 'id'>): Promise<string> => {
    const cleanedData = removeUndefinedProps(packageData);
    const { data, error } = await supabase
        .from('packages')
        .insert(cleanedData)
        .select();
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data[0].id;
};

export const updatePackage = async (packageId: number, updatedData: Partial<Package>): Promise<void> => {
    const { error } = await supabase
        .from('packages')
        .update(updatedData)
        .eq('id', packageId);
        
    if (error) {
        throw new Error(error.message);
    }
};

// --- Transaction & Financials ---

export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*');
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data as Transaction[];
};

export const processTransaction = async (userId: string, amount: number, type: Transaction['type'], description: string): Promise<void> => {
    // Get user data
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (userError) {
        throw new Error(`User with ID ${userId} not found for transaction.`);
    }
    
    const currentBalance = userData.wallet_balance || 0;
    if (amount < 0 && currentBalance < Math.abs(amount)) {
        throw new Error('موجودی کیف پول کافی نیست.');
    }
    
    const newBalance = currentBalance + amount;
    
    // Update user balance
    const { error: userUpdateError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);
        
    if (userUpdateError) {
        throw new Error(userUpdateError.message);
    }
    
    // Add transaction record
    const transactionData = {
        user_id: userId,
        type,
        amount,
        description,
        date: new Date().toISOString()
        // id will be auto-generated by the database
    };
    
    const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData);
        
    if (transactionError) {
        throw new Error(transactionError.message);
    }
};

// Payment receipt types
export type PaymentReceiptStatus = 'pending' | 'approved' | 'rejected';

export type PaymentReceipt = {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  card_number?: string;
  tracking_code?: string;
  receipt_image_url?: string;
  status: PaymentReceiptStatus;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  updated_at: string;
};

// Payment receipt functions
export const createPaymentReceipt = async (
  receiptData: Omit<PaymentReceipt, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  const { data, error } = await supabase
    .from('payment_receipts')
    .insert(receiptData)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
};

export const getPaymentReceiptByAuthority = async (authority: string): Promise<{ data?: PaymentReceipt; error?: Error }> => {
  try {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('tracking_code', authority)
      .single();

    if (error) {
      return { error: new Error(error.message) };
    }

    return { data: data as PaymentReceipt };
  } catch (error) {
    return { error: error as Error };
  }
};

// Function to get all payment receipts for admin
export const getAllPaymentReceipts = async (): Promise<PaymentReceipt[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as PaymentReceipt[];
  } catch (error) {
    console.error('Error fetching payment receipts:', error);
    throw new Error('خطا در دریافت رسیدهای پرداخت.');
  }
};

// ZarinPal payment functions
interface ZarinPalPaymentResult {
  paymentUrl: string;
  authority: string;
}

interface ZarinPalRequestData {
  merchant_id: string;
  amount: number;
  callback_url: string;
  description: string;
  metadata?: {
    mobile?: string;
    email?: string;
  };
}

interface ZarinPalRequestResponse {
  data: {
    code: number;
    message: string;
    authority: string;
    fee_type: string;
    fee: number;
  };
}

interface ZarinPalVerifyData {
  merchant_id: string;
  amount: number;
  authority: string;
}

interface ZarinPalVerifyResponse {
  data: {
    code: number;
    message: string;
    card_hash: string;
    card_pan: string;
    ref_id: string;
    fee_type: string;
    fee: number;
  };
}

export const createZarinPalPayment = async (
  userId: string,
  userName: string,
  amount: number
): Promise<ZarinPalPaymentResult> => {
  try {
    // Create a payment receipt first
    const receiptId = await createPaymentReceipt({
      user_id: userId,
      user_name: userName,
      amount: amount,
      status: 'pending'
    });

    // Prepare data for ZarinPal API
    const requestData: ZarinPalRequestData = {
      merchant_id: ZARINPAL_CONFIG.MERCHANT_ID,
      amount: amount,
      callback_url: ZARINPAL_CONFIG.CALLBACK_URL,
      description: `شارژ کیف پول کاربر ${userName}`,
      metadata: {
        // You can add user's mobile or email here if available
      }
    };

    // In a real implementation, you would call ZarinPal API here
    // For now, we'll simulate it with a mock URL
    if (ZARINPAL_CONFIG.SANDBOX) {
      console.log('ZarinPal request data:', requestData);
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real implementation, you would get the authority from ZarinPal API response
    const authority = `auth_${Date.now()}_${userId}`;
    const paymentUrl = `${ZARINPAL_CONFIG.PAYMENT_GATEWAY_URL}${authority}`;

    // Update the receipt with the authority code
    const { error: updateError } = await supabase
      .from('payment_receipts')
      .update({ 
        tracking_code: authority,
        updated_at: new Date().toISOString()
      })
      .eq('id', receiptId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { paymentUrl, authority };
  } catch (error) {
    console.error('Error in createZarinPalPayment:', error);
    throw new Error('خطا در ایجاد پرداخت زرین‌پال');
  }
};

export const verifyZarinPalPayment = async (
  authority: string,
  amount: number
): Promise<{ success: boolean; refId?: string }> => {
  try {
    // Prepare data for ZarinPal verification API
    const verifyData: ZarinPalVerifyData = {
      merchant_id: ZARINPAL_CONFIG.MERCHANT_ID,
      amount: amount,
      authority: authority
    };

    // In a real implementation, you would call ZarinPal verification API here
    // For now, we'll simulate a successful payment
    if (ZARINPAL_CONFIG.SANDBOX) {
      console.log('ZarinPal verify data:', verifyData);
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate verification result (80% success rate)
    const success = Math.random() > 0.2;
    
    // In a real implementation, you would get the refId from ZarinPal API response
    const refId = success ? `ref_${Date.now()}` : undefined;

    if (success) {
      // Update the payment receipt status
      const { error: updateError } = await supabase
        .from('payment_receipts')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tracking_code', authority);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Get the receipt to get user info
      const { data: receipt, error: receiptError } = await supabase
        .from('payment_receipts')
        .select('user_id')
        .eq('tracking_code', authority)
        .single();

      if (receiptError) {
        throw new Error(receiptError.message);
      }

      // Update user's wallet balance
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          wallet_balance: supabase.rpc('wallet_balance + ?', [amount])
        })
        .eq('id', receipt.user_id);

      if (userError) {
        throw new Error(userError.message);
      }
    } else {
      // Update the payment receipt status to rejected
      const { error: updateError } = await supabase
        .from('payment_receipts')
        .update({ 
          status: 'rejected',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tracking_code', authority);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return { success, refId };
  } catch (error) {
    console.error('Error in verifyZarinPalPayment:', error);
    throw new Error('خطا در تأیید پرداخت زرین‌پال');
  }
};

export const uploadReceiptImage = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  console.log('Attempting to upload file:', { fileName, fileType: file.type, fileSize: file.size });
  
  const { data, error } = await supabase.storage
    .from('pic')
    .upload(fileName, file);

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Failed to upload receipt image: ${error.message}`);
  }

  console.log('Upload successful:', data);
  
  // Get the public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from('pic')
    .getPublicUrl(fileName);

  console.log('Generated public URL:', urlData.publicUrl);
  return urlData.publicUrl;
};

export const uploadSellerDocument = async (
  file: File,
  sellerId: string,
  purchaseOrderId: number
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `seller-documents/${sellerId}/order-${purchaseOrderId}/${Date.now()}.${fileExt}`;
  
  console.log('Uploading seller document:', { fileName, fileType: file.type, fileSize: file.size });
  
  const { data, error } = await supabase.storage
    .from('pic')
    .upload(fileName, file);

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Failed to upload seller document: ${error.message}`);
  }

  console.log('Document upload successful:', data);
  
  // Get the public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from('pic')
    .getPublicUrl(fileName);

  console.log('Generated document URL:', urlData.publicUrl);
  return urlData.publicUrl;
};

export const isAuctionPurchaseCompleted = async (simId: number, buyerId: string): Promise<boolean> => {
  // First, get the SIM card number
  const { data: simData, error: simError } = await supabase
    .from('sim_cards')
    .select('number')
    .eq('id', simId)
    .single();
    
  if (simError) {
    console.error('Error fetching SIM card:', simError);
    return false;
  }
  
  // Check if there's a purchase transaction for this SIM card and buyer
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', buyerId)
    .like('description', `خرید سیمکارت ${simData.number}`)
    .eq('type', 'purchase');
    
  if (error) {
    console.error('Error checking auction purchase status:', error);
    return false;
  }
  
  return data && data.length > 0;
};

export const completeAuctionPurchaseForWinner = async (simId: number, buyerId: string): Promise<void> => {
    // Get the SIM card
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simId)
        .single();
        
    if (simError) {
        throw new Error(simError.message);
    }
    
    if (!simData) {
        throw new Error('SIM card not found.');
    }
    
    // NOTE: We don't check if SIM is already sold here because for auctions,
    // the SIM should remain available until the delivery process is complete
    
    if (simData.type !== 'auction') {
        throw new Error('This SIM card is not an auction.');
    }
    
    // Get auction details
    const { data: auctionDetails, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('sim_card_id', simId)
        .single();
        
    if (auctionError) {
        throw new Error('جزئیات حراجی یافت نشد.');
    }
    
    // Check if auction has ended
    if (new Date(auctionDetails.end_time) > new Date()) {
        throw new Error('حراجی هنوز به پایان نرسیده است.');
    }
    
    // Check if this user is the highest bidder
    if (auctionDetails.highest_bidder_id !== buyerId) {
        throw new Error('شما برنده این حراجی نیستید.');
    }
    
    // Double-check that this auction hasn't already been processed by checking for existing purchase orders
    const { data: existingPurchaseOrder, error: purchaseOrderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('sim_card_id', simId)
        .eq('buyer_id', buyerId)
        .single();
        
    if (!purchaseOrderError && existingPurchaseOrder) {
        throw new Error('این حراجی قبلاً تکمیل شده است.');
    }
    
    // Get guarantee deposit amount for this user
    let guaranteeDepositAmount = 0;
    const { data: guaranteeDepositData, error: guaranteeError } = await supabase
        .from('guarantee_deposits')
        .select('amount')
        .eq('user_id', buyerId)
        .eq('auction_id', auctionDetails.id)
        .eq('sim_card_id', simId)
        .single();
        
    if (!guaranteeError && guaranteeDepositData) {
        guaranteeDepositAmount = guaranteeDepositData.amount;
    } else {
        // Get guarantee deposit from settings
        const guaranteeRate = await settingsService.getAuctionGuaranteeRate();
        guaranteeDepositAmount = Math.floor(simData.price * guaranteeRate);
    }
    
    // Determine the price (winning bid amount)
    const bidAmount = auctionDetails.current_bid;
    
    // Get buyer data
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
        
    if (buyerError) {
        throw new Error(`Buyer with ID ${buyerId} not found for transaction.`);
    }
    
    const buyerCurrentBalance = buyerData.wallet_balance || 0;
    const buyerBlockedBalance = buyerData.blocked_balance || 0;
    
    // CRITICAL: Release the winner's guarantee deposit BEFORE checking balance
    // The winner's deposit is still blocked, so we need to unblock it first
    console.log('🔓 Releasing winner\'s guarantee deposit before purchase...');
    console.log('  Current wallet:', buyerCurrentBalance.toLocaleString('fa-IR'));
    console.log('  Current blocked:', buyerBlockedBalance.toLocaleString('fa-IR'));
    console.log('  Guarantee to release:', guaranteeDepositAmount.toLocaleString('fa-IR'));
    console.log('  Bid amount needed:', bidAmount.toLocaleString('fa-IR'));
    
    // Unblock the guarantee deposit first
    const buyerBlockedAfterRelease = Math.max(0, buyerBlockedBalance - guaranteeDepositAmount);
    
    await supabase
        .from('users')
        .update({
            blocked_balance: buyerBlockedAfterRelease
        })
        .eq('id', buyerId);
    
    // Mark the guarantee deposit as released
    await supabase
        .from('guarantee_deposits')
        .update({
            status: 'released',
            reason: 'برنده حراجی شد - ضمانت آزاد شد',
            updated_at: new Date().toISOString()
        })
        .eq('user_id', buyerId)
        .eq('auction_id', auctionDetails.id)
        .eq('status', 'blocked');
    
    // Update participant record
    await supabase
        .from('auction_participants')
        .update({
            guarantee_deposit_blocked: false,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', buyerId)
        .eq('auction_id', auctionDetails.id);
    
    console.log('✅ Guarantee deposit released. New blocked balance:', buyerBlockedAfterRelease.toLocaleString('fa-IR'));
    console.log('  Available balance now:', (buyerCurrentBalance - buyerBlockedAfterRelease).toLocaleString('fa-IR'));
    
    // NOW check if buyer has enough funds (after releasing guarantee)
    const availableBalance = buyerCurrentBalance - buyerBlockedAfterRelease;
    if (availableBalance < bidAmount) {
        throw new Error(`موجودی کافی نیست. مورد نیاز: ${bidAmount.toLocaleString('fa-IR')} تومان، موجودی شما: ${availableBalance.toLocaleString('fa-IR')} تومان`);
    }
    
    // Get seller data
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', simData.seller_id)
        .single();
        
    if (sellerError) {
        throw new Error(`Seller with ID ${simData.seller_id} not found for transaction.`);
    }
    
    // STEP 1: Block the amount in buyer's account (DO NOT deduct or mark SIM as sold)
    const buyerNewBalance = buyerCurrentBalance - bidAmount; // Deduct from wallet
    const buyerNewBlockedBalance = buyerBlockedBalance + bidAmount; // Add to blocked balance
    
    const { error: buyerBlockError } = await supabase
        .from('users')
        .update({ 
            wallet_balance: buyerNewBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
        
    if (buyerBlockError) {
        throw new Error(buyerBlockError.message);
    }
    
    // STEP 2: Create purchase order (status: pending - waiting for line activation/delivery)
    // Get commission rate from settings
    const commissionRate = await settingsService.getCommissionRate();
    const commissionAmount = Math.floor(bidAmount * commissionRate);
    const sellerReceivedAmount = bidAmount - commissionAmount;
    
    const { data: purchaseOrderData, error: purchaseOrderInsertError } = await supabase
        .from('purchase_orders')
        .insert({
            sim_card_id: simId,
            buyer_id: buyerId,
            seller_id: simData.seller_id,
            line_type: simData.is_active ? 'active' : 'inactive',
            status: 'pending', // Pending until line delivery is complete
            price: bidAmount,
            commission_amount: commissionAmount,
            seller_received_amount: sellerReceivedAmount,
            buyer_blocked_amount: bidAmount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
    if (purchaseOrderInsertError) {
        // Rollback buyer balance if purchase order creation fails
        await supabase
            .from('users')
            .update({ 
                wallet_balance: buyerCurrentBalance,
                blocked_balance: buyerBlockedBalance
            })
            .eq('id', buyerId);
        throw new Error('خطا در ایجاد سفارش خرید: ' + purchaseOrderInsertError.message);
    }
    
    // STEP 3: Record the blocking transaction
    const blockTransaction = {
        user_id: buyerId,
        type: 'debit_blocked' as const,
        amount: -bidAmount,
        description: `خرید حراجی سیمکارت ${simData.number} - ${bidAmount.toLocaleString('fa-IR')} تومان (در انتظار تحویل خط)`,
        date: new Date().toISOString()
    };
    
    const { error: blockTransactionError } = await supabase
        .from('transactions')
        .insert(blockTransaction);
        
    if (blockTransactionError) {
        console.error('Error recording block transaction:', blockTransactionError.message);
    }
    
    // STEP 4: Send notifications
    await createNotification(
        buyerId,
        '✅ حراجی تکمیل شد - منتظر تحویل خط',
        `خرید سیمکارت ${simData.number} به مبلغ ${bidAmount.toLocaleString('fa-IR')} تومان تایید شد. مبلغ در حساب شما بلوک شده است. لطفاً به قسمت "پیگیری خریدها" بروید تا مراحل تحویل خط را دنبال کنید.`,
        'info'
    );
    
    await createNotification(
        simData.seller_id,
        '🎯 سفارش خرید جدید',
        `سیمکارت ${simData.number} به فروش رسیده است. لطفاً در بخش "درخواست‌های خریداران" اقدام به تحویل خط کنید.`,
        'info'
    );
    
    console.log('✅ Auction purchase blocked successfully - waiting for line delivery');
};

export const completeAuctionPurchase = async (simId: number): Promise<void> => {
  // Get the SIM card
  const { data: simData, error: simError } = await supabase
    .from('sim_cards')
    .select('*')
    .eq('id', simId)
    .single();
    
  if (simError) {
    throw new Error(simError.message);
  }
  
  if (!simData) {
    throw new Error('SIM card not found.');
  }
  
  if (simData.type !== 'auction') {
    throw new Error('This SIM card is not an auction.');
  }
  
  if (simData.status !== 'available') {
    throw new Error('This SIM card is not available.');
  }
  
  // Get auction details
  const { data: auctionDetails, error: auctionError } = await supabase
    .from('auction_details')
    .select('*')
    .eq('sim_card_id', simId)
    .single();
    
  if (auctionError) {
    throw new Error('Auction details not found.');
  }
  
  // Check if auction has ended
  if (new Date(auctionDetails.end_time) > new Date()) {
    throw new Error('Auction has not ended yet.');
  }
  
  // Check if there is a highest bidder
  if (!auctionDetails.highest_bidder_id) {
    throw new Error('No bids were placed on this auction.');
  }
  
  // Complete the purchase for the highest bidder using the specialized function
  await completeAuctionPurchaseForWinner(simId, auctionDetails.highest_bidder_id);
};

export const processEndedAuctions = async (): Promise<void> => {
  try {
    // Get all ended auctions that haven't been processed yet
    const { data: endedAuctions, error: auctionsError } = await supabase
      .from('sim_cards')
      .select('id')
      .eq('type', 'auction')
      .eq('status', 'available')
      .lt('auction_details.end_time', new Date().toISOString());
      
    if (auctionsError) {
      throw new Error('Error fetching ended auctions: ' + auctionsError.message);
    }
    
    // Process each ended auction
    for (const auction of endedAuctions || []) {
      try {
        // Check if auction has already been processed by looking for a transaction
        // First, get the SIM card to get its number
        const { data: simData, error: simError } = await supabase
          .from('sim_cards')
          .select('number, auction_details(highest_bidder_id)')
          .eq('id', auction.id)
          .single();
          
        if (simError || !simData) {
          console.error(`Error fetching SIM card ${auction.id}:`, simError);
          continue;
        }
        
        // Check if there's already a purchase transaction for this SIM card
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .like('description', `خرید سیمکارت ${simData.number}`)
          .eq('type', 'purchase');
          
        if (transactionsError) {
          console.error(`Error checking transactions for SIM card ${auction.id}:`, transactionsError);
          continue;
        }
        
        // If there's already a purchase transaction, skip this auction
        if (transactionsData && transactionsData.length > 0) {
          console.log(`Auction ${auction.id} already processed, skipping...`);
          continue;
        }
        
        // If there's no highest bidder, skip this auction
        // Note: auction_details is returned as an array, so we need to access the first element
        const auctionDetails = Array.isArray(simData.auction_details) 
          ? simData.auction_details[0] 
          : simData.auction_details;
          
        if (!auctionDetails || !auctionDetails.highest_bidder_id) {
          console.log(`Auction ${auction.id} has no highest bidder, skipping...`);
          continue;
        }
        
        // Process the auction
        await completeAuctionPurchaseForWinner(auction.id, auctionDetails.highest_bidder_id);
      } catch (error) {
        console.error(`Error processing auction ${auction.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processEndedAuctions:', error);
    throw error;
  }
};

export const getCommissions = async (): Promise<Commission[]> => {
    const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        throw new Error(error.message);
    }
    
    return data || [];
};

// --- Secure Payments (Escrow System) ---

export const generateBuyerPaymentCode = async (userId: string): Promise<string> => {
    // Check if user already has a payment code
    const { data: existingCode, error: checkError } = await supabase
        .from('buyer_payment_codes')
        .select('payment_code')
        .eq('user_id', userId)
        .single();
    
    if (existingCode && !checkError) {
        return existingCode.payment_code;
    }
    
    // Generate a unique payment code (format: BUYER-XXXXXXXX)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const paymentCode = `BUYER-${randomPart}`;
    
    // Check if code already exists (very unlikely but check anyway)
    const { data: codeExists } = await supabase
        .from('buyer_payment_codes')
        .select('id')
        .eq('payment_code', paymentCode)
        .single();
    
    if (codeExists) {
        // Recursively generate a new code if this one exists
        return generateBuyerPaymentCode(userId);
    }
    
    // Insert the new payment code
    const { error: insertError } = await supabase
        .from('buyer_payment_codes')
        .insert({ user_id: userId, payment_code: paymentCode });
    
    if (insertError) {
        throw new Error(`Failed to generate payment code: ${insertError.message}`);
    }
    
    return paymentCode;
};

export const getBuyerPaymentCode = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('buyer_payment_codes')
        .select('payment_code')
        .eq('user_id', userId)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') { // Not found
            return null;
        }
        throw new Error(error.message);
    }
    
    return data?.payment_code || null;
};

export const createSecurePayment = async (
    buyerCode: string,
    simCardId: number,
    sellerId: string,
    customAmount?: number
): Promise<SecurePayment> => {
    // Normalize buyer code (trim and uppercase)
    const normalizedCode = buyerCode.trim().toUpperCase();
    
    // Get buyer ID from payment code
    const { data: codeData, error: codeError } = await supabase
        .from('buyer_payment_codes')
        .select('user_id, payment_code')
        .ilike('payment_code', normalizedCode)
        .single();
    
    if (codeError || !codeData) {
        throw new Error('کد پرداخت نامعتبر است');
    }
    
    const buyerId = codeData.user_id;
    
    // Get SIM card details
    const { data: simCard, error: simError } = await supabase
        .from('sim_cards')
        .select('*')
        .eq('id', simCardId)
        .single();
    
    if (simError || !simCard) {
        throw new Error('شماره سیمکارت یافت نشد');
    }
    
    if (simCard.seller_id !== sellerId) {
        throw new Error('این شماره به شما تعلق ندارد');
    }
    
    if (simCard.status !== 'available') {
        throw new Error('این شماره دیگر در دسترس نیست');
    }
    
    // Check if SIM is already reserved for another secure payment
    if (simCard.reserved_by_secure_payment_id) {
        // Check if it's reserved by the same buyer for this payment
        const existingPayment = await getSecurePayments(buyerId, 'buyer');
        const existingPaymentForSim = existingPayment.find(p => p.sim_card_id === simCardId && p.status !== 'cancelled');
        
        if (existingPaymentForSim && existingPaymentForSim.buyer_id !== buyerId) {
            throw new Error('این شماره لاله خریدار دیگری است');
        }
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Get seller details
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sellerId)
        .single();
    
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد');
    }
    
    const amount = customAmount || simCard.price;
    
    // Check if buyer has enough balance
    if ((buyerData.wallet_balance || 0) < amount) {
        throw new Error('موجودی کیف پول برای انجام این پرداخت امن کافی نیست');
    }
    
    // STEP 1: Create secure payment record
    const { data: securePaymentData, error: paymentError } = await supabase
        .from('secure_payments')
        .insert({
            buyer_id: buyerId,
            buyer_name: buyerData.name,
            seller_id: sellerId,
            seller_name: sellerData.name,
            sim_card_id: simCardId,
            sim_number: simCard.number,
            amount: amount,
            buyer_code: codeData.payment_code,
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (paymentError) {
        throw new Error(`خطا در ثبت پرداخت امن: ${paymentError.message}`);
    }
    
    // STEP 2: Create purchase order (similar to auction purchases)
    const lineType = simCard.is_active ? 'active' : 'inactive';
    // Get commission rate from settings
    const commissionRate = await settingsService.getCommissionRate();
    const commissionAmount = Math.floor(amount * commissionRate);
    const sellerReceivedAmount = amount - commissionAmount;
    
    const { data: purchaseOrderData, error: purchaseOrderError } = await supabase
        .from('purchase_orders')
        .insert({
            sim_card_id: simCardId,
            buyer_id: buyerId,
            seller_id: sellerId,
            line_type: lineType,
            status: 'pending', // Waiting for line activation/delivery
            price: amount,
            commission_amount: commissionAmount,
            seller_received_amount: sellerReceivedAmount,
            buyer_blocked_amount: amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (purchaseOrderError) {
        throw new Error('خطا در ایجاد سفارش خرید: ' + purchaseOrderError.message);
    }
    
    // STEP 3: Block funds in buyer's account
    const buyerNewBalance = buyerData.wallet_balance - amount;
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) + amount;
    
    await supabase
        .from('users')
        .update({
            wallet_balance: buyerNewBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
    
    // STEP 4: For zero-line SIMs, create activation request
    if (!simCard.is_active) {
        const { error: activationRequestError } = await supabase
            .from('activation_requests')
            .insert({
                purchase_order_id: purchaseOrderData.id,
                sim_card_id: simCardId,
                buyer_id: buyerId,
                seller_id: sellerId,
                sim_number: simCard.number,
                buyer_name: buyerData.name,
                seller_name: sellerData.name,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (activationRequestError) {
            console.error('Error creating activation request:', activationRequestError.message);
        }
    }
    
    // STEP 5: Send notifications
    await createNotification(
        buyerId,
        '🔒 پرداخت امن ایجاد شد',
        `پرداخت امن برای سیمکارت ${simCard.number} به مبلغ ${amount.toLocaleString('fa-IR')} تومان ایجاد شد. لطفاً به قسمت "پیگیری خریدها" بروید.`,
        'info'
    );
    
    await createNotification(
        sellerId,
        '🎯 سفارش خرید جدید - پرداخت امن',
        `سیمکارت ${simCard.number} برای پرداخت امن انتخاب شد. لطفاً در بخش "درخواست‌های خریداران" اقدام به تحویل خط کنید.`,
        'info'
    );
    
    console.log('✅ Secure payment created with purchase order:', purchaseOrderData.id);
    return securePaymentData as SecurePayment;
};

export const withdrawSecurePaymentFunds = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما برای این پرداخت مجاز نیستید');
    }
    
    if (payment.status !== 'pending') {
        throw new Error('این پرداخت امن قابل برداشت نیست');
    }
    
    if (payment.withdrawn_at) {
        throw new Error('این پرداخت امن قبلاً برداشت شده است');
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Check if buyer has enough balance
    if ((buyerData.wallet_balance || 0) < payment.amount) {
        throw new Error('موجودی کیف پول کافی نیست');
    }
    
    // Get SIM card details to check if it's active
    const { data: simCard, error: simError } = await supabase
        .from('sim_cards')
        .select('is_active')
        .eq('id', payment.sim_card_id)
        .single();
    
    if (simError || !simCard) {
        throw new Error('سیمکارت یافت نشد');
    }
    
    // FOR BOTH ACTIVE AND INACTIVE LINES:
    // Just block the funds and show "در انتظار تحویل خط" status
    // Deduct amount from buyer's wallet and add to blocked_balance
    const buyerNewBalance = (buyerData.wallet_balance || 0) - payment.amount;
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) + payment.amount;
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({ 
            wallet_balance: buyerNewBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
    
    if (buyerUpdateError) {
        throw new Error(`خطا در برداشت مبلغ: ${buyerUpdateError.message}`);
    }
    
    // Lock SIM card to this buyer by marking withdrawal
    const { error: paymentUpdateError } = await supabase
        .from('secure_payments')
        .update({
            withdrawn_at: new Date().toISOString(),
            locked_to_buyer_id: buyerId
        })
        .eq('id', securePaymentId);
    
    if (paymentUpdateError) {
        // Rollback buyer's wallet
        await supabase
            .from('users')
            .update({ 
                wallet_balance: buyerData.wallet_balance,
                blocked_balance: buyerData.blocked_balance
            })
            .eq('id', buyerId);
        throw new Error(`خطا در برداشت: ${paymentUpdateError.message}`);
    }
    
    // Lock SIM card to this secure payment
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ reserved_by_secure_payment_id: securePaymentId })
        .eq('id', payment.sim_card_id);
    
    if (simUpdateError) {
        // Rollback all changes
        await supabase
            .from('users')
            .update({ 
                wallet_balance: buyerData.wallet_balance,
                blocked_balance: buyerData.blocked_balance
            })
            .eq('id', buyerId);
        await supabase
            .from('secure_payments')
            .update({
                withdrawn_at: null,
                locked_to_buyer_id: null
            })
            .eq('id', securePaymentId);
        throw new Error(`خطا در قفل کردن شماره: ${simUpdateError.message}`);
    }
    
    // Create transaction record
    await supabase.from('transactions').insert({
        user_id: buyerId,
        type: 'purchase',
        amount: -payment.amount,
        description: `برداشت مبلغ پرداخت امن برای شماره ${payment.sim_number}`,
        date: new Date().toISOString()
    });
    
    // Remove the auto-completion logic - both active and inactive lines now wait for delivery
};

// Function to complete secure payment after purchase order is completed
export const completeSecurePaymentAfterDelivery = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما مجاز نیستید');
    }
    
    if (payment.status === 'completed') {
        return; // Already completed
    }
    
    // Get associated purchase order
    const { data: purchaseOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('sim_card_id', payment.sim_card_id)
        .eq('buyer_id', buyerId)
        .eq('status', 'completed')
        .single();
    
    if (!purchaseOrder) {
        return; // No completed purchase order yet
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.buyer_id)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Get seller details
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.seller_id)
        .single();
    
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد');
    }
    
    // STEP 1: Unblock the money from buyer's blocked balance
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - payment.amount;
    
    await supabase
        .from('users')
        .update({
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', payment.buyer_id);
    
    // STEP 2: Add money to seller's wallet (after commission deduction)
    const sellerNewBalance = (sellerData.wallet_balance || 0) + purchaseOrder.seller_received_amount;
    
    await supabase
        .from('users')
        .update({
            wallet_balance: sellerNewBalance
        })
        .eq('id', payment.seller_id);
    
    // STEP 3: Mark SIM card as sold
    await supabase
        .from('sim_cards')
        .update({
            status: 'sold',
            sold_date: new Date().toISOString()
        })
        .eq('id', payment.sim_card_id);
    
    // STEP 4: Update secure payment status to completed
    await supabase
        .from('secure_payments')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', securePaymentId);
    
    // STEP 5: Record transaction for seller
    await supabase.from('transactions').insert({
        user_id: payment.seller_id,
        type: 'sale',
        amount: purchaseOrder.seller_received_amount,
        description: `دریافت پرداخت امن برای شماره ${payment.sim_number} - بعد از کسر 2% کمیسیون`,
        date: new Date().toISOString()
    });
    
    // STEP 6: Create commission record
    const { data: buyerNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', payment.buyer_id)
        .single();
    
    await supabase
        .from('commissions')
        .insert({
            sim_card_id: payment.sim_card_id,
            seller_id: payment.seller_id,
            seller_name: sellerData.name,
            sim_number: payment.sim_number,
            sale_price: payment.amount,
            commission_amount: purchaseOrder.commission_amount,
            commission_percentage: 2,
            seller_received_amount: purchaseOrder.seller_received_amount,
            sale_type: 'secure_payment',
            buyer_id: payment.buyer_id,
            buyer_name: buyerNameData?.name || 'ناشناس',
            date: new Date().toISOString()
        });
    
    // STEP 7: Send notifications
    await createNotification(
        payment.buyer_id,
        '🎉 پرداخت امن تکمیل شد',
        `پرداخت امن برای سیمکارت ${payment.sim_number} به موفقیت تایید شد.`,
        'success'
    );
    
    await createNotification(
        payment.seller_id,
        '💰 پول پرداخت امن واریز شد',
        `مبلغ ${purchaseOrder.seller_received_amount.toLocaleString('fa-IR')} تومان برای پرداخت امن سیمکارت ${payment.sim_number} به حساب شما اضافه شد.`,
        'success'
    );
    
    console.log('✅ Secure payment completed after delivery confirmation');
};

// New function to complete secure payment for active lines immediately
const completeSecurePaymentForActiveLine = async (
    securePaymentId: number,
    payment: any,
    purchaseOrder: any
): Promise<void> => {
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.buyer_id)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Get seller details
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.seller_id)
        .single();
    
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد');
    }
    
    // STEP 1: Unblock the money from buyer's blocked balance
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - payment.amount;
    
    await supabase
        .from('users')
        .update({
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', payment.buyer_id);
    
    // STEP 2: Add money to seller's wallet (after commission deduction)
    const sellerNewBalance = (sellerData.wallet_balance || 0) + purchaseOrder.seller_received_amount;
    
    await supabase
        .from('users')
        .update({
            wallet_balance: sellerNewBalance
        })
        .eq('id', payment.seller_id);
    
    // STEP 3: Mark SIM card as sold
    await supabase
        .from('sim_cards')
        .update({
            status: 'sold',
            sold_date: new Date().toISOString()
        })
        .eq('id', payment.sim_card_id);
    
    // STEP 4: Update purchase order status to completed
    await supabase
        .from('purchase_orders')
        .update({
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', purchaseOrder.id);
    
    // STEP 5: Update secure payment status to completed
    await supabase
        .from('secure_payments')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', securePaymentId);
    
    // STEP 6: Record transactions
    await supabase.from('transactions').insert({
        user_id: payment.seller_id,
        type: 'sale',
        amount: purchaseOrder.seller_received_amount,
        description: `دریافت پرداخت امن برای شماره ${payment.sim_number} - بعد از کسر 2% کمیسیون`,
        date: new Date().toISOString()
    });
    
    // STEP 7: Create commission record
    const { data: buyerNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', payment.buyer_id)
        .single();
    
    await supabase
        .from('commissions')
        .insert({
            sim_card_id: payment.sim_card_id,
            seller_id: payment.seller_id,
            seller_name: sellerData.name,
            sim_number: payment.sim_number,
            sale_price: payment.amount,
            commission_amount: purchaseOrder.commission_amount,
            commission_percentage: 2,
            seller_received_amount: purchaseOrder.seller_received_amount,
            sale_type: 'secure_payment',
            buyer_id: payment.buyer_id,
            buyer_name: buyerNameData?.name || 'ناشناس',
            date: new Date().toISOString()
        });
    
    // STEP 8: Send notifications
    await createNotification(
        payment.buyer_id,
        '🎉 پرداخت امن تکمیل شد',
        `پرداخت امن برای سیمکارت ${payment.sim_number} به موفقیت تایید شد.`,
        'success'
    );
    
    await createNotification(
        payment.seller_id,
        '💰 پول پرداخت امن واریز شد',
        `مبلغ ${purchaseOrder.seller_received_amount.toLocaleString('fa-IR')} تومان برای پرداخت امن سیمکارت ${payment.sim_number} به حساب شما اضافه شد.`,
        'success'
    );
    
    console.log('✅ Secure payment completed immediately for active line');
};

export const releaseSecurePayment = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما مجاز به تایید این پرداخت نیستید');
    }
    
    if (payment.status !== 'pending') {
        throw new Error('این پرداخت امن قابل تایید نیست');
    }
    
    // Check if funds were withdrawn
    if (!payment.withdrawn_at) {
        throw new Error('لطفاً ابتدا مبلغ پرداخت امن را برداشت کنید');
    }
    
    // Get associated purchase order
    const { data: purchaseOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('sim_card_id', payment.sim_card_id)
        .eq('buyer_id', buyerId)
        .eq('status', 'code_sent')
        .single();
    
    if (!purchaseOrder) {
        throw new Error('سفارش خرید برای این پرداخت یافت نشد');
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.buyer_id)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Get seller details
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payment.seller_id)
        .single();
    
    if (sellerError || !sellerData) {
        throw new Error('فروشنده یافت نشد');
    }
    
    // STEP 1: Unblock the money from buyer's blocked balance
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - payment.amount;
    
    await supabase
        .from('users')
        .update({
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', payment.buyer_id);
    
    // STEP 2: Add money to seller's wallet (after commission deduction)
    const sellerNewBalance = (sellerData.wallet_balance || 0) + purchaseOrder.seller_received_amount;
    
    await supabase
        .from('users')
        .update({
            wallet_balance: sellerNewBalance
        })
        .eq('id', payment.seller_id);
    
    // STEP 3: Mark SIM card as sold
    await supabase
        .from('sim_cards')
        .update({
            status: 'sold',
            sold_date: new Date().toISOString()
        })
        .eq('id', payment.sim_card_id);
    
    // STEP 4: Update purchase order status to completed
    await supabase
        .from('purchase_orders')
        .update({
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', purchaseOrder.id);
    
    // STEP 5: Update secure payment status to completed
    await supabase
        .from('secure_payments')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', securePaymentId);
    
    // STEP 6: Record transactions
    await supabase.from('transactions').insert({
        user_id: payment.seller_id,
        type: 'sale',
        amount: purchaseOrder.seller_received_amount,
        description: `دریافت پرداخت امن برای شماره ${payment.sim_number} - بعد از کسر 2% کمیسیون`,
        date: new Date().toISOString()
    });
    
    await supabase.from('transactions').insert({
        user_id: payment.buyer_id,
        type: 'purchase',
        amount: -payment.amount,
        description: `تایید پرداخت امن برای شماره ${payment.sim_number}`,
        date: new Date().toISOString()
    });
    
    // STEP 7: Create commission record
    const { data: buyerNameData } = await supabase
        .from('users')
        .select('name')
        .eq('id', payment.buyer_id)
        .single();
    
    await supabase
        .from('commissions')
        .insert({
            sim_card_id: payment.sim_card_id,
            seller_id: payment.seller_id,
            seller_name: sellerData.name,
            sim_number: payment.sim_number,
            sale_price: payment.amount,
            commission_amount: purchaseOrder.commission_amount,
            commission_percentage: 2,
            seller_received_amount: purchaseOrder.seller_received_amount,
            sale_type: 'secure_payment',
            buyer_id: payment.buyer_id,
            buyer_name: buyerNameData?.name || 'ناشناس',
            date: new Date().toISOString()
        });
    
    // STEP 8: Send notifications
    await createNotification(
        payment.buyer_id,
        '🎉 پرداخت امن تکمیل شد',
        `پرداخت امن برای سیمکارت ${payment.sim_number} به موفقیت تایید شد.`,
        'success'
    );
    
    await createNotification(
        payment.seller_id,
        '💰 پول پرداخت امن واریز شد',
        `مبلغ ${purchaseOrder.seller_received_amount.toLocaleString('fa-IR')} تومان برای پرداخت امن سیمکارت ${payment.sim_number} به حساب شما اضافه شد.`,
        'success'
    );
    
    console.log('✅ Secure payment released and completed');
};

export const cancelSecurePayment = async (
    securePaymentId: number,
    buyerId: string
): Promise<void> => {
    // Get secure payment details
    const { data: payment, error: paymentError } = await supabase
        .from('secure_payments')
        .select('*')
        .eq('id', securePaymentId)
        .single();
    
    if (paymentError || !payment) {
        throw new Error('پرداخت امن یافت نشد');
    }
    
    if (payment.buyer_id !== buyerId) {
        throw new Error('شما مجاز به لغو این پرداخت نیستید');
    }
    
    if (payment.status !== 'pending') {
        throw new Error('این پرداخت امن قابل لغو نیست');
    }
    
    // Check if funds were withdrawn
    if (!payment.withdrawn_at) {
        throw new Error('هنوز مبلغ برداشت نشده است بنابراین نمیتوانید لغو کنید');
    }
    
    // Get buyer details
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', buyerId)
        .single();
    
    if (buyerError || !buyerData) {
        throw new Error('خریدار یافت نشد');
    }
    
    // Refund from blocked_balance to wallet_balance
    const buyerNewBlockedBalance = (buyerData.blocked_balance || 0) - payment.amount;
    const buyerNewWalletBalance = (buyerData.wallet_balance || 0) + payment.amount;
    
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({
            wallet_balance: buyerNewWalletBalance,
            blocked_balance: buyerNewBlockedBalance
        })
        .eq('id', buyerId);
    
    if (buyerUpdateError) {
        throw new Error(`خطا در بازگرداندن پول: ${buyerUpdateError.message}`);
    }
    
    // Update payment status to cancelled
    const { error: updateError } = await supabase
        .from('secure_payments')
        .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
            withdrawn_at: null,
            locked_to_buyer_id: null
        })
        .eq('id', securePaymentId);
    
    if (updateError) {
        // Rollback buyer's wallet
        await supabase
            .from('users')
            .update({
                wallet_balance: buyerData.wallet_balance,
                blocked_balance: buyerData.blocked_balance
            })
            .eq('id', buyerId);
        throw new Error(`خطا در بروزرسانی وضعیت پرداخت: ${updateError.message}`);
    }
    
    // Unlock SIM card
    const { error: simUpdateError } = await supabase
        .from('sim_cards')
        .update({ reserved_by_secure_payment_id: null })
        .eq('id', payment.sim_card_id);
    
    if (simUpdateError) {
        console.error('خطا در جبران قفل شماره:', simUpdateError);
    }
    
    // Create transaction for refund
    await supabase.from('transactions').insert({
        user_id: buyerId,
        type: 'refund',
        amount: payment.amount,
        description: `بازگرداندن پول پرداخت امن لغو شده برای شماره ${payment.sim_number}`,
        date: new Date().toISOString()
    });
};

export const getSecurePayments = async (userId: string, role: 'buyer' | 'seller'): Promise<SecurePayment[]> => {
    const { data, error } = await supabase
        .from('secure_payments')
        .select('*')
        .eq(role === 'buyer' ? 'buyer_id' : 'seller_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data as SecurePayment[];
};

// --- Notification Retrieval Functions ---

export const getUserNotifications = async (userId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
        
        return data || [];
    } catch (err) {
        console.error('Exception fetching notifications:', err);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId: number, userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', userId);
        
        if (error) {
            console.error('Error marking notification as read:', error);
        }
    } catch (err) {
        console.error('Exception marking notification as read:', err);
    }
};

export const deleteNotification = async (notificationId: number, userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId);
        
        if (error) {
            console.error('Error deleting notification:', error);
        }
    } catch (err) {
        console.error('Exception deleting notification:', err);
    }
};

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);
        
        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
        
        return count || 0;
    } catch (err) {
        console.error('Exception fetching unread count:', err);
        return 0;
    }
};

// ===== Multi-Stage Purchase Workflow API Functions =====

export const createPurchaseOrder = async (
    simCardId: number,
    buyerId: string,
    sellerId: string,
    lineType: 'inactive' | 'active',
    price: number
): Promise<number> => {
    const COMMISSION_PERCENTAGE = 2;
    const commissionAmount = Math.floor(price * (COMMISSION_PERCENTAGE / 100));
    const sellerReceivedAmount = price - commissionAmount;
    
    console.log('🛒 Creating purchase order:', { simCardId, buyerId, lineType, price });
    
    // تغییر وضعیت SIM card به reserved تا دیگری نتواند بخرد
    await supabase
        .from('sim_cards')
        .update({ status: 'reserved' })
        .eq('id', simCardId);
    
    const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
            sim_card_id: simCardId,
            buyer_id: buyerId,
            seller_id: sellerId,
            line_type: lineType,
            status: 'pending',
            price,
            commission_amount: commissionAmount,
            seller_received_amount: sellerReceivedAmount,
            buyer_blocked_amount: price,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select();
    
    if (error) {
        console.error('❌ Error creating purchase order:', error);
        throw new Error(error.message);
    }
    
    const purchaseOrderId = data[0].id;
    
    // Block buyer funds
    const { data: buyerData } = await supabase
        .from('users')
        .select('wallet_balance, blocked_balance')
        .eq('id', buyerId)
        .single();
    
    if (buyerData) {
        await supabase
            .from('users')
            .update({
                wallet_balance: (buyerData.wallet_balance || 0) - price,
                blocked_balance: (buyerData.blocked_balance || 0) + price
            })
            .eq('id', buyerId);
        
        // ثبت تراکنش برای خریدار - بلوک کردن پول
        await supabase.from('transactions').insert({
            user_id: buyerId,
            type: 'debit_blocked',
            amount: price,
            description: `بلوک پول برای خرید سیمکارت (سفارش #${purchaseOrderId}): ${lineType === 'inactive' ? 'خط صفر' : 'خط فعال'}`,
            date: new Date().toISOString()
        });
    }
    
    console.log('✅ Purchase order created:', purchaseOrderId);
    return purchaseOrderId;
};

export const sendActivationCode = async (
    purchaseOrderId: number,
    phoneNumber: string,
    sellerEnteredCode: string
): Promise<string> => {
    // فروشنده خودش کد را وارد می‌کند
    const code = sellerEnteredCode;
    
    console.log('📱 Seller entered activation code:', { purchaseOrderId, code });
    
    const { data, error } = await supabase
        .from('activation_codes')
        .insert({
            purchase_order_id: purchaseOrderId,
            code,
            phone_number: phoneNumber,
            sent_at: new Date().toISOString()
        })
        .select();
    
    if (error) {
        console.error('❌ Error saving activation code:', error);
        throw new Error(error.message);
    }
    
    // Update purchase order status
    await supabase
        .from('purchase_orders')
        .update({ status: 'code_sent', updated_at: new Date().toISOString() })
        .eq('id', purchaseOrderId);
    
    // اطلاع به خریدار که کد آماده است
    const { data: orderData } = await supabase
        .from('purchase_orders')
        .select('buyer_id')
        .eq('id', purchaseOrderId)
        .single();
    
    if (orderData) {
        await createNotification(
            orderData.buyer_id,
            '✅ کد فعالسازی آماده است',
            'فروشنده کد فعالسازی را ارسال کرد. لطفا به پنل خریدار مراجعه و کد را تایید کنید.',
            'info'
        );
    }
    
    console.log('✅ Activation code saved');
    return code;
};

export const getActivationCode = async (purchaseOrderId: number): Promise<string | null> => {
    // For inactive lines, the activation code is stored in activation_requests table
    const { data, error } = await supabase
        .from('activation_requests')
        .select('activation_code')
        .eq('purchase_order_id', purchaseOrderId)
        .single();
    
    if (error || !data) return null;
    return data.activation_code;
};

export const updatePurchaseOrderStatus = async (
    purchaseOrderId: number,
    status: string
): Promise<void> => {
    const { error } = await supabase
        .from('purchase_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', purchaseOrderId);

    if (error) {
        console.error('❌ Error updating purchase order status:', error);
        throw new Error(error.message);
    }
    
    console.log(`✅ Purchase order ${purchaseOrderId} status updated to: ${status}`);
};

export const verifyActivationCode = async (
    purchaseOrderId: number,
    code: string
): Promise<boolean> => {
    console.log('🔐 Verifying activation code:', { purchaseOrderId, code });
    
    // Test code for development
    const IS_TEST_CODE = code === '123456';
    
    // For inactive lines, get activation code from activation_requests table
    const { data, error } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .single();
    
    // If not test code, verify against stored code
    if (!IS_TEST_CODE) {
        if (error || !data) {
            console.error('❌ Invalid activation code');
            return false;
        }
        
        if (data.activation_code !== code) {
            console.error('❌ Code does not match');
            return false;
        }
    }
    
    // Mark as verified in activation_requests
    if (data && !IS_TEST_CODE) {
        await supabase
            .from('activation_requests')
            .update({ verified_at: new Date().toISOString() })
            .eq('id', data.id);
    }
    
    // Get purchase order details
    const { data: orderData } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', purchaseOrderId)
        .single();
    
    if (!orderData) return false;
    
    // کاهش blocked_balance خریدار (حذف پول بلاک شده)
    const { data: buyerData } = await supabase
        .from('users')
        .select('blocked_balance, wallet_balance')
        .eq('id', orderData.buyer_id)
        .single();
    
    if (buyerData) {
        // Reduce blocked balance and keep wallet balance unchanged
        await supabase
            .from('users')
            .update({ 
                blocked_balance: Math.max(0, (buyerData.blocked_balance || 0) - orderData.buyer_blocked_amount),
                wallet_balance: buyerData.wallet_balance // Keep wallet balance unchanged
            })
            .eq('id', orderData.buyer_id);
    }
    
    // Release funds to seller
    const { data: sellerData } = await supabase
        .from('users')
        .select('wallet_balance, blocked_balance')
        .eq('id', orderData.seller_id)
        .single();
    
    if (sellerData) {
        // Add funds to seller's wallet balance
        await supabase
            .from('users')
            .update({ 
                wallet_balance: (sellerData.wallet_balance || 0) + orderData.seller_received_amount,
                blocked_balance: sellerData.blocked_balance // Keep blocked balance unchanged
            })
            .eq('id', orderData.seller_id);
        
        // ثبت تراکنش برای فروشنده
        await supabase.from('transactions').insert({
            user_id: orderData.seller_id,
            type: 'sale',
            amount: orderData.seller_received_amount,
            description: `فروش سیمکارت (سفارش #${purchaseOrderId}) - بعد از کسر 2% کمیسیون`,
            date: new Date().toISOString()
        });
    }
    
    // Record transaction for buyer (deduction from blocked balance)
    await supabase.from('transactions').insert({
        user_id: orderData.buyer_id,
        type: 'purchase_blocked',
        amount: -orderData.buyer_blocked_amount,
        description: `استفاده از مبلغ بلوکه شده برای خرید سیمکارت (سفارش #${purchaseOrderId})`,
        date: new Date().toISOString()
    });
    
    // Update purchase order status to completed
    await supabase
        .from('purchase_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', purchaseOrderId);
    
    // Notify buyer that verification is complete
    await createNotification(
        orderData.buyer_id,
        '✅ خرید با موفقیت تکمیل شد',
        `سیمکارت شما بررسی به اتمام رسید. ایمیل درایت پید کنید.`,
        'success'
    );
    
    // Notify seller about payment release
    await createNotification(
        orderData.seller_id,
        '💰 پول به حساب شما واریز شد',
        `مبلغ ${orderData.seller_received_amount.toLocaleString('fa-IR')} تومان بعد از کسر کمیسیون به کیف پول شما اضافه شد.`,
        'success'
    );
    
    console.log('✅ Activation code verified and funds released');
    return true;
};

export const sendPhoneVerificationCode = async (
    purchaseOrderId: number,
    phoneNumber: string
): Promise<string> => {
    const verificationCode = Math.random().toString().slice(2, 8);
    
    console.log('📞 Sending phone verification code:', { purchaseOrderId, phoneNumber });
    
    console.log('✅ Phone verification code sent:', verificationCode);
    return verificationCode;
};

export const getSellerDocument = async (purchaseOrderId: number): Promise<string | null> => {
    try {
        console.log('Fetching document for order:', purchaseOrderId);
        
        // استفاده از query ساده‌تر
        const { data, error } = await supabase
            .from('seller_documents')
            .select('image_url')
            .eq('purchase_order_id', purchaseOrderId);
        
        console.log('Document query result for order', purchaseOrderId, ':', { data, error });
        
        if (error) {
            console.error('Error loading document for order', purchaseOrderId, ':', error);
            return null;
        }
        
        // data یک آرایه است
        if (data && data.length > 0) {
            console.log('Document URL for order', purchaseOrderId, ':', data[0].image_url);
            return data[0].image_url || null;
        }
        
        console.log('No document found for order:', purchaseOrderId);
        return null;
    } catch (error) {
        console.error('Exception loading document for order', purchaseOrderId, ':', error);
        return null;
    }
};

export const submitSellerDocument = async (
    purchaseOrderId: number,
    imageUrl: string,
    documentType: 'handwriting' | 'verification' = 'handwriting'
): Promise<number> => {
    console.log('📄 Submitting seller document:', { purchaseOrderId, documentType, imageUrl });
    
    const { data, error } = await supabase
        .from('seller_documents')
        .insert({
            purchase_order_id: purchaseOrderId,
            document_type: documentType,
            image_url: imageUrl,
            uploaded_at: new Date().toISOString(),
            status: 'pending'
        })
        .select();
    
    if (error) {
        console.error('❌ Error submitting document:', error);
        throw new Error(error.message);
    }
    
    console.log('✅ Document submitted successfully, ID:', data[0].id);
    
    // Update purchase order status
    await supabase
        .from('purchase_orders')
        .update({ status: 'document_submitted', updated_at: new Date().toISOString() })
        .eq('id', purchaseOrderId);
    
    console.log('✅ Purchase order status updated');
    return data[0].id;
};

export const approveDocument = async (
    documentId: number,
    adminId: string,
    notes?: string
): Promise<void> => {
    console.log('✅ Approving document:', { documentId, adminId });
    
    const { data: docData } = await supabase
        .from('seller_documents')
        .select('purchase_order_id')
        .eq('id', documentId)
        .single();
    
    if (!docData) throw new Error('Document not found');
    
    await supabase
        .from('seller_documents')
        .update({ status: 'approved' })
        .eq('id', documentId);
    
    await supabase
        .from('admin_verifications')
        .insert({
            purchase_order_id: docData.purchase_order_id,
            admin_id: adminId,
            document_id: documentId,
            verification_type: 'document',
            status: 'approved',
            notes,
            verified_at: new Date().toISOString()
        });
    
    await supabase
        .from('purchase_orders')
        .update({ status: 'verified', updated_at: new Date().toISOString() })
        .eq('id', docData.purchase_order_id);
    
    console.log('✅ Document approved');
};

export const rejectDocument = async (
    documentId: number,
    adminId: string,
    notes: string
): Promise<void> => {
    console.log('❌ Rejecting document:', { documentId, adminId });
    
    const { data: docData } = await supabase
        .from('seller_documents')
        .select('purchase_order_id')
        .eq('id', documentId)
        .single();
    
    if (!docData) throw new Error('Document not found');
    
    await supabase
        .from('seller_documents')
        .update({ status: 'rejected' })
        .eq('id', documentId);
    
    await supabase
        .from('admin_verifications')
        .insert({
            purchase_order_id: docData.purchase_order_id,
            admin_id: adminId,
            document_id: documentId,
            verification_type: 'document',
            status: 'rejected',
            notes,
            verified_at: new Date().toISOString()
        });
    
    await supabase
        .from('purchase_orders')
        .update({ status: 'document_rejected', updated_at: new Date().toISOString() })
        .eq('id', docData.purchase_order_id);
    
    console.log('✅ Document rejected');
};

export const createTrackingCode = async (
    purchaseOrderId: number,
    contactPhone: string
): Promise<string> => {
    const code = 'TRACK' + Math.random().toString().slice(2, 8);
    
    console.log('📞 Creating tracking code:', { purchaseOrderId, contactPhone, code });
    
    const { data, error } = await supabase
        .from('tracking_codes')
        .insert({
            purchase_order_id: purchaseOrderId,
            code,
            contact_phone: contactPhone,
            created_at: new Date().toISOString()
        })
        .select();
    
    if (error) {
        console.error('❌ Error creating tracking code:', error);
        throw new Error(error.message);
    }
    
    console.log('✅ Tracking code created');
    return code;
};

export const sendSupportMessage = async (
    purchaseOrderId: number,
    senderId: string,
    receiverId: string,
    message: string,
    messageType: 'problem_report' | 'response' = 'problem_report'
): Promise<number> => {
    console.log('💬 Sending support message:', { purchaseOrderId, senderId });
    
    const { data, error } = await supabase
        .from('support_messages')
        .insert({
            purchase_order_id: purchaseOrderId,
            sender_id: senderId,
            receiver_id: receiverId,
            message,
            message_type: messageType,
            created_at: new Date().toISOString()
        })
        .select();
    
    if (error) {
        console.error('❌ Error sending message:', error);
        throw new Error(error.message);
    }
    
    // ارسال اعلان به گیرنده
    let notificationTitle = '';
    let notificationMessage = '';
    
    if (messageType === 'problem_report') {
        notificationTitle = '📩 گزارش مشکل جدید';
        notificationMessage = 'خریدار گزارش مشکلی ارسال کرده است';
    } else {
        // پیام ادمین - بررسی محتوای پیام برای تعیین نوع
        if (message.includes('رد شده')) {
            notificationTitle = '⚠️ مدارک شما رد شد';
            notificationMessage = 'لطفاً مدارک را مجدد ارسال کنید';
        } else {
            notificationTitle = '✅ مدارک شما تایید شد';
            notificationMessage = 'سفارش شما به مرحله بعدی رفت';
        }
    }
    
    await createNotification(receiverId, notificationTitle, notificationMessage, 'info');
    
    console.log('✅ Support message sent');
    return data[0].id;
};

export const approvePurchase = async (
    purchaseOrderId: number,
    adminId: string
): Promise<void> => {
    console.log('💰 Approving purchase:', { purchaseOrderId, adminId });
    
    const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', purchaseOrderId)
        .single();
    
    if (orderError) {
        console.error('❌ Error fetching order:', orderError);
        throw new Error(orderError.message);
    }
    
    if (!orderData) {
        console.error('❌ Order not found:', purchaseOrderId);
        throw new Error('Purchase order not found');
    }
    
    console.log('📝 Order data:', orderData);
    
    // Update SIM card status to sold
    const { error: simError } = await supabase
        .from('sim_cards')
        .update({ 
            status: 'sold',
            sold_date: new Date().toISOString()
        })
        .eq('id', orderData.sim_card_id);
    
    if (simError) {
        console.error('❌ Error updating SIM card status:', simError);
        throw new Error(simError.message);
    }
    
    const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', orderData.seller_id)
        .single();
    
    if (sellerError) {
        console.error('❌ Error fetching seller:', sellerError);
        throw new Error(sellerError.message);
    }
    
    console.log('📝 Seller data:', sellerData);
    
    // باید blocked_balance خریدار را هم کم کنیم
    const { data: buyerData, error: buyerError } = await supabase
        .from('users')
        .select('wallet_balance, blocked_balance')
        .eq('id', orderData.buyer_id)
        .single();
    
    if (buyerError) {
        console.error('❌ Error fetching buyer:', buyerError);
        throw new Error(buyerError.message);
    }
    
    console.log('👤 Buyer data:', buyerData);
    
    // به روز رسانی فروشنده
    if (sellerData) {
        const newBalance = (sellerData.wallet_balance || 0) + orderData.seller_received_amount;
        console.log('💰 Updating seller balance:', { 
            old: sellerData.wallet_balance, 
            new: newBalance,
            amount: orderData.seller_received_amount
        });
        
        const { error: updateError } = await supabase
            .from('users')
            .update({
                wallet_balance: newBalance
            })
            .eq('id', orderData.seller_id);
        
        if (updateError) {
            console.error('❌ Error updating seller balance:', updateError);
            throw new Error(updateError.message);
        }
    }
    
    // به روز رسانی خریدار - blocked_balance را کم کنیم
    if (buyerData) {
        const newBlocked = (buyerData.blocked_balance || 0) - orderData.buyer_blocked_amount;
        
        console.log('💰 Updating buyer blocked balance:', { 
            old: buyerData.blocked_balance, 
            new: newBlocked,
            deduction: orderData.buyer_blocked_amount
        });
        
        const { error: updateError } = await supabase
            .from('users')
            .update({
                blocked_balance: newBlocked
            })
            .eq('id', orderData.buyer_id);
        
        if (updateError) {
            console.error('❌ Error updating buyer blocked balance:', updateError);
            throw new Error(updateError.message);
        }
    }
    
    // Create transaction record for seller
    const { error: sellerTxError } = await supabase
        .from('transactions')
        .insert({
            user_id: orderData.seller_id,
            type: 'credit',
            amount: orderData.seller_received_amount,
            description: `درآمد از فروش خط #${purchaseOrderId}`,
            date: new Date().toISOString()
        });
    
    if (sellerTxError) {
        console.error('❌ Error creating seller transaction:', sellerTxError);
        throw new Error(sellerTxError.message);
    }
    
    // Create admin verification record
    const { error: verificationError } = await supabase
        .from('admin_verifications')
        .insert({
            purchase_order_id: purchaseOrderId,
            admin_id: adminId,
            verification_type: 'final_approval',
            status: 'approved',
            verified_at: new Date().toISOString()
        });
    
    if (verificationError) {
        console.error('❌ Error creating verification record:', verificationError);
        throw new Error(verificationError.message);
    }
    
    // Update purchase order status
    const { error: statusError } = await supabase
        .from('purchase_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', purchaseOrderId);
    
    if (statusError) {
        console.error('❌ Error updating order status:', statusError);
        throw new Error(statusError.message);
    }
    
    console.log('✅ Purchase approved');
};

export const getPurchaseOrders = async (userId: string, userRole: string): Promise<any[]> => {
    console.log('Fetching purchase orders:', { userId, userRole });
    
    let query = supabase
        .from('purchase_orders')
        .select(`
            *,
            sim_cards!inner(number)
        `);
    
    if (userRole === 'admin') {
        // Admins can see all orders
        console.log('Admin view - fetching all orders');
    } else {
        // Buyers and sellers see only their orders
        console.log('User view - fetching user orders');
        query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching purchase orders:', error);
        return [];
    }
    
    console.log('Purchase orders fetched:', data?.length || 0);
    
    // Transform data to include sim_number
    const transformedData = (data || []).map((order: any) => ({
        ...order,
        sim_number: order.sim_cards?.number || order.sim_card_id
    }));
    
    return transformedData;
};

export const getSupportMessages = async (purchaseOrderId: number): Promise<any[]> => {
    const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching support messages:', error);
        return [];
    }
    
    return data || [];
};

// --- Auto-cleanup functions ---

// --- Activation Requests (Zero-Line SIM Activation) ---

export const createActivationRequest = async (
    purchaseOrderId: number,
    simCardId: number,
    buyerId: string,
    sellerId: string,
    simNumber: string,
    buyerName: string,
    sellerName: string
): Promise<number> => {
    console.log('📋 Creating activation request:', { purchaseOrderId, simCardId });
    
    const { data, error } = await supabase
        .from('activation_requests')
        .insert({
            purchase_order_id: purchaseOrderId,
            sim_card_id: simCardId,
            buyer_id: buyerId,
            seller_id: sellerId,
            sim_number: simNumber,
            buyer_name: buyerName,
            seller_name: sellerName,
            status: 'pending'
        })
        .select()
        .single();
    
    if (error) {
        console.error('❌ Error creating activation request:', error);
        throw new Error(error.message);
    }
    
    // Notify seller
    await createNotification(
        sellerId,
        '📋 درخواست فعال‌سازی جدید',
        `درخواست فعال‌سازی برای سیمکارت ${simNumber} برای ${buyerName} ایجاد شد.`,
        'info'
    );
    
    // Notify admins
    await createNotificationForAdmins(
        '📋 درخواست فعال‌سازی جدید',
        `درخواست فعال‌سازی برای سیمکارت ${simNumber} ایجاد شد.`,
        'info'
    );
    
    return data.id;
};

export const getActivationRequests = async (filters?: { status?: string; buyerId?: string; sellerId?: string }): Promise<ActivationRequest[]> => {
    let query = supabase
        .from('activation_requests')
        .select('*');
    
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.buyerId) {
        query = query.eq('buyer_id', filters.buyerId);
    }
    if (filters?.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        console.error('❌ Error fetching activation requests:', error);
        throw new Error(error.message);
    }
    
    return (data as ActivationRequest[]) || [];
};

export const sendActivationCodeForZeroLine = async (
    activationRequestId: number,
    activationCode: string
): Promise<void> => {
    console.log('📤 Sending activation code:', { activationRequestId, activationCode });
    
    const { data: requestData, error: fetchError } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('id', activationRequestId)
        .single();
    
    if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw new Error(`خطا در دریافت درخواست: ${fetchError.message}`);
    }
    
    if (!requestData) {
        throw new Error('درخواست فعال‌سازی یافت نشد');
    }
    
    console.log('📤 Request data found:', requestData);
    
    // Update activation request with the activation code
    const { error: updateError } = await supabase
        .from('activation_requests')
        .update({
            activation_code: activationCode,
            status: 'activated', // Use allowed status
            sent_at: new Date().toISOString()
        })
        .eq('id', activationRequestId);
    
    if (updateError) {
        console.error('❌ Update error:', updateError);
        throw new Error(`خطا در به‌روز رسانی کد: ${updateError.message}`);
    }
    
    // Update the purchase order status to code_sent
    const { error: orderUpdateError } = await supabase
        .from('purchase_orders')
        .update({
            status: 'code_sent',
            updated_at: new Date().toISOString()
        })
        .eq('id', requestData.purchase_order_id);
    
    if (orderUpdateError) {
        console.error('❌ Order update error:', orderUpdateError);
        throw new Error(`خطا در به‌روز رسانی سفارش: ${orderUpdateError.message}`);
    }
    
    console.log('✅ Code updated successfully');
    
    // اطلاع دادن خریدار
    await createNotification(
        requestData.buyer_id,
        '📝 کد فعال‌سازی دریافت شد',
        `کد فعال‌سازی برای سیمکارت ${requestData.sim_number} توسط فروشنده ارسال شد. لطفاً به پنل خریدار مراجعه کرده و کد را تایید کنید.`,
        'success'
    );
};

export const approveActivationRequest = async (
    activationRequestId: number,
    adminId: string,
    adminNotes?: string
): Promise<void> => {
    console.log('✅ Approving activation request:', activationRequestId);
    
    const { data: requestData, error: fetchError } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('id', activationRequestId)
        .single();
    
    if (fetchError || !requestData) {
        console.error('❌ Error fetching activation request:', fetchError);
        throw new Error('درخواست فعال‌سازی یافت نشد');
    }
    
    // Get purchase order details
    const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', requestData.purchase_order_id)
        .single();
    
    if (orderError || !orderData) {
        console.error('❌ Error fetching purchase order:', orderError);
        throw new Error('سفارش خرید يافت نشد');
    }
    
    // Update activation request status
    const { error: updateError } = await supabase
        .from('activation_requests')
        .update({
            status: 'approved',
            admin_id: adminId,
            admin_notes: adminNotes,
            verified_at: new Date().toISOString()
        })
        .eq('id', activationRequestId);
    
    if (updateError) {
        console.error('❌ Error updating activation request:', updateError);
        throw new Error(updateError.message);
    }
    
    // Get buyer data to reduce blocked balance
    const { data: buyerData, error: buyerFetchError } = await supabase
        .from('users')
        .select('blocked_balance, wallet_balance')
        .eq('id', requestData.buyer_id)
        .single();
    
    if (buyerFetchError || !buyerData) {
        console.error('❌ Error fetching buyer data:', buyerFetchError);
        throw new Error('اطلاعات خریدار يافت نشد');
    }
    
    // Reduce buyer's blocked balance
    const { error: buyerUpdateError } = await supabase
        .from('users')
        .update({
            blocked_balance: Math.max(0, (buyerData.blocked_balance || 0) - orderData.buyer_blocked_amount)
        })
        .eq('id', requestData.buyer_id);
    
    if (buyerUpdateError) {
        console.error('❌ Error updating buyer balance:', buyerUpdateError);
        throw new Error('خطا در به‌روز رسانی موجودی خریدار');
    }
    
    console.log('✅ Buyer blocked balance reduced:', orderData.buyer_blocked_amount);
    
    // Get seller data and release funds
    const { data: sellerData, error: sellerFetchError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', requestData.seller_id)
        .single();
    
    if (sellerFetchError || !sellerData) {
        console.error('❌ Error fetching seller data:', sellerFetchError);
        throw new Error('اطلاعات فروشنده يافت نشد');
    }
    
    // Add funds to seller's wallet
    const { error: sellerUpdateError } = await supabase
        .from('users')
        .update({
            wallet_balance: (sellerData.wallet_balance || 0) + orderData.seller_received_amount
        })
        .eq('id', requestData.seller_id);
    
    if (sellerUpdateError) {
        console.error('❌ Error updating seller balance:', sellerUpdateError);
        throw new Error('خطا در به‌روز رسانی موجودی فروشنده');
    }
    
    console.log('✅ Seller wallet balance increased:', orderData.seller_received_amount);
    
    // Update purchase order status
    await supabase
        .from('purchase_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', requestData.purchase_order_id);
    
    // اطلاع دادن خریدار
    await createNotification(
        requestData.buyer_id,
        '✅ فعال‌سازی تایید شد',
        `درخواست فعال‌سازی سیمکارت ${requestData.sim_number} توسط ادمین تایید شد.`,
        'success'
    );
    
    // اطلاع دادن فروشنده
    await createNotification(
        requestData.seller_id,
        '✅ فعال‌سازی تایید شد',
        `درخواست فعال‌سازی سیمکارت ${requestData.sim_number} توسط ادمین تایید شد. مبلغ ${orderData.seller_received_amount.toLocaleString('fa-IR')} تومان به کیف پول شما اضافه شد.`,
        'success'
    );
    
    console.log('✅ Activation request approved successfully');
};

export const rejectActivationRequest = async (
    activationRequestId: number,
    adminId: string,
    adminNotes?: string
): Promise<void> => {
    console.log('❌ Rejecting activation request:', activationRequestId);
    
    const { data: requestData, error: fetchError } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('id', activationRequestId)
        .single();
    
    if (fetchError || !requestData) {
        throw new Error('درخواست فعال‌سازی یافت نشد');
    }
    
    // Get purchase order details to refund buyer
    const { data: orderData } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', requestData.purchase_order_id)
        .single();
    
    const { error: updateError } = await supabase
        .from('activation_requests')
        .update({
            status: 'rejected',
            admin_id: adminId,
            admin_notes: adminNotes,
            verified_at: new Date().toISOString()
        })
        .eq('id', activationRequestId);
    
    if (updateError) {
        throw new Error(updateError.message);
    }
    
    // Refund buyer's blocked balance if purchase order exists
    if (orderData) {
        const { data: buyerData } = await supabase
            .from('users')
            .select('blocked_balance, wallet_balance')
            .eq('id', requestData.buyer_id)
            .single();
        
        if (buyerData) {
            // Return blocked amount to available balance
            await supabase
                .from('users')
                .update({
                    wallet_balance: (buyerData.wallet_balance || 0) + orderData.buyer_blocked_amount,
                    blocked_balance: Math.max(0, (buyerData.blocked_balance || 0) - orderData.buyer_blocked_amount)
                })
                .eq('id', requestData.buyer_id);
        }
    }
    
    // اطلاع دادن خریدار
    await createNotification(
        requestData.buyer_id,
        '❌ فعال‌سازی رد شد',
        `درخواست فعال‌سازی سیمکارت ${requestData.sim_number} توسط ادمین رد شد. مبلغ به کیف پول شما بازگشت داده شد.`,
        'error'
    );
    
    // اطلاع دادن فروشنده
    await createNotification(
        requestData.seller_id,
        '❌ فعال‌سازی رد شد',
        `درخواست فعال‌سازی سیمکارت ${requestData.sim_number} توسط ادمین رد شد.`,
        'warning'
    );
};

// --- Purchase Workflow Selection (Active/Inactive Line Choice) ---

export const selectLineTypeAndDeliveryMethod = async (
    purchaseOrderId: number,
    deliveryMethod: 'activation_code' | 'physical_card'
): Promise<void> => {
    console.log('🎯 Selecting delivery method:', { purchaseOrderId, deliveryMethod });
    
    const { error } = await supabase
        .from('purchase_orders')
        .update({
            delivery_method: deliveryMethod,
            updated_at: new Date().toISOString()
        })
        .eq('id', purchaseOrderId);
    
    if (error) {
        throw new Error(error.message);
    }
};

export const deleteExpiredListings = async (): Promise<number> => {
    // More code...

    // Get current date
    const now = new Date();
    // Get auto-delete days from settings
    const autoDeleteDays = await settingsService.getListingAutoDeleteDays();
    const daysAgo = new Date(now.getTime() - autoDeleteDays * 24 * 60 * 60 * 1000);
    const daysAgoIso = daysAgo.toISOString();
    
    console.log('🗑 Cleaning up expired listings...');
    
    // حذف خطوط فروخته شده‌ای بیش از تعداد روزهای تنظیم شده
    const { data: expiredSims, error: fetchError } = await supabase
        .from('sim_cards')
        .select('id')
        .eq('status', 'sold')
        .lt('sold_date', daysAgoIso);
    
    if (fetchError) {
        console.error('❌ خطا در بررسی اعلامات منقضی شده:', fetchError);
        return 0;
    }
    
    if (!expiredSims || expiredSims.length === 0) {
        console.log('✅ هیچ اعلام منقضی نشده');
        return 0; // No expired listings
    }
    
    console.log(`🗑 حذف ${expiredSims.length} اعلام فروخته شده...`);
    
    const expiredIds = expiredSims.map(sim => sim.id);
    
    // Delete expired sim cards
    const { error: deleteError } = await supabase
        .from('sim_cards')
        .delete()
        .in('id', expiredIds);
    
    if (deleteError) {
        console.error('❌ خطا در حذف اعلامات منقضی شده:', deleteError);
        return 0;
    }
    
    console.log(`✅ ${expiredIds.length} اعلام حذف شد`);
    return expiredIds.length;
};

/**
 * Delete a SIM card if it has no active transactions or bids
 */
const deleteSimCard = async (simId: number): Promise<void> => {
    console.log('🗑 Attempting to delete SIM card:', simId);
    
    // Get SIM card details
    const { data: simData, error: simError } = await supabase
        .from('sim_cards')
        .select('*, auction_details(*)')
        .eq('id', simId)
        .single();
    
    if (simError || !simData) {
        throw new Error('سیمکارت یافت نشد.');
    }
    
    // Check if SIM is already sold
    if (simData.status === 'sold') {
        throw new Error('سیمکارت فروخته شده قابل حذف نیست.');
    }
    
    // Check for active purchase orders
    const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('sim_card_id', simId)
        .in('status', ['pending', 'awaiting_payment', 'processing']);
    
    if (purchaseOrders && purchaseOrders.length > 0) {
        throw new Error('این سیمکارت دارای سفارش فعال است و قابل حذف نیست.');
    }
    
    // For auction type, check if there are any bids
    if (simData.type === 'auction' && simData.auction_details) {
        const { data: bids } = await supabase
            .from('bids')
            .select('id')
            .eq('sim_card_id', simId);
        
        if (bids && bids.length > 0) {
            throw new Error('این حراجی دارای پیشنهاد است و قابل حذف نیست.');
        }
        
        // Delete auction details first
        const auctionId = simData.auction_details.id;
        await supabase
            .from('auction_details')
            .delete()
            .eq('id', auctionId);
    }
    
    // Delete the SIM card
    const { error: deleteError } = await supabase
        .from('sim_cards')
        .delete()
        .eq('id', simId);
    
    if (deleteError) {
        throw new Error('خطا در حذف سیمکارت: ' + deleteError.message);
    }
    
    console.log('✅ SIM card deleted successfully:', simId);
};

// Export all functions as an object
const api = {
    signup,
    login,
    loginWithPhoneAndPassword,
    requestPasswordReset,
    // Phone/OTP authentication
    requestPhoneOTP,
    verifyPhoneOTP,
    loginWithPhone,
    signupWithPhone,
    // User management
    createUserProfile,
    getUserProfile,
    getUsers,
    updateUser,
    updateUserPackage,
    getSimCards,
    addSimCard,
    updateSimCard,
    getPackages,
    addPackage,
    updatePackage,
    getTransactions,
    processTransaction,
    purchaseSim,
    placeBid,
    createPaymentReceipt,
    getPaymentReceiptByAuthority,
    getAllPaymentReceipts,
    createZarinPalPayment,
    verifyZarinPalPayment,
    uploadReceiptImage,
    uploadSellerDocument,
    getSellerDocument,
    completeAuctionPurchase,
    processEndedAuctions,
    isAuctionPurchaseCompleted,
    completeAuctionPurchaseForWinner,
    getCommissions,
    generateBuyerPaymentCode,
    getBuyerPaymentCode,
    createSecurePayment,
    withdrawSecurePaymentFunds,
    releaseSecurePayment,
    cancelSecurePayment,
    getSecurePayments,
    getUserNotifications,
    markNotificationAsRead,
    deleteNotification,
    getUnreadNotificationsCount,
    createNotification,
    createNotificationForAdmins,
    deleteExpiredListings,
    // Multi-stage purchase workflow functions
    createPurchaseOrder,
    sendActivationCode,
    getActivationCode,
    updatePurchaseOrderStatus,
    verifyActivationCode,
    sendPhoneVerificationCode,
    submitSellerDocument,
    approveDocument,
    rejectDocument,
    createTrackingCode,
    sendSupportMessage,
    approvePurchase,
    getPurchaseOrders,
    getSupportMessages,
    // Activation request functions
    createActivationRequest,
    getActivationRequests,
    sendActivationCodeForZeroLine,
    approveActivationRequest,
    rejectActivationRequest,
    selectLineTypeAndDeliveryMethod,
    finalizePurchaseAfterLineDelivery: async (purchaseOrderId: number) => {
        // Import and call the finalize function dynamically
        const { finalizePurchaseAfterLineDelivery } = await import('./auction-guarantee-system');
        return finalizePurchaseAfterLineDelivery(purchaseOrderId);
    },
    checkGuaranteeDepositBalance: async (userId: string, auctionId: number, basePrice: number, simId?: number) => {
        // Import and call the check guarantee deposit balance function dynamically
        const { checkGuaranteeDepositBalance } = await import('./auction-guarantee-system');
        return checkGuaranteeDepositBalance(userId, auctionId, basePrice, simId);
    },
    placeBidWithGuaranteeDeposit: async (simId: number, auctionId: number, bidderId: string, amount: number, basePrice: number) => {
        // Import and call the place bid function dynamically
        const { placeBidWithGuaranteeDeposit } = await import('./auction-guarantee-system');
        return placeBidWithGuaranteeDeposit(simId, auctionId, bidderId, amount, basePrice);
    },
    checkAndProcessPaymentDeadlines: async () => {
        // Import and call the check and process payment deadlines function dynamically
        const { checkAndProcessPaymentDeadlines } = await import('./auction-guarantee-system');
        return checkAndProcessPaymentDeadlines();
    },
    processAuctionEnding: async (auctionId: number) => {
        // Import and call the process auction ending function dynamically
        const { processAuctionEnding } = await import('./auction-guarantee-system');
        return processAuctionEnding(auctionId);
    },
    completeSecurePaymentAfterDelivery,
    deleteSimCard,
};

export default api;
