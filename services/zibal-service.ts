import { ZIBAL_CONFIG, getZibalConfig } from '../config/zibal';

export interface ZibalRequestParams {
    amount: number;
    orderId: string;
    mobile?: string;
    description?: string;
    allowedCards?: string[];
}

export interface ZibalRequestResponse {
    result: number;
    message: string;
    trackId?: number;
    paymentUrl?: string;
}

export interface ZibalVerifyParams {
    trackId: number;
}

export interface ZibalVerifyResponse {
    result: number;
    message: string;
    paidAt?: string;
    amount?: number;
    status?: number;
    refNumber?: number;
    description?: string;
    cardNumber?: string;
    orderId?: string;
}

/**
 * ایجاد درخواست پرداخت در زیبال
 */
export const createZibalPayment = async (params: ZibalRequestParams): Promise<ZibalRequestResponse> => {
    try {
        // دریافت تنظیمات از دیتابیس
        const config = await getZibalConfig();
        
        if (!config.enabled) {
            throw new Error('درگاه زیبال غیرفعال است');
        }
        
        if (!config.merchantId) {
            throw new Error('Merchant ID زیبال تنظیم نشده است');
        }

        const requestBody = {
            merchant: config.merchantId,
            amount: params.amount,
            callbackUrl: ZIBAL_CONFIG.CALLBACK_URL,
            orderId: params.orderId,
            mobile: params.mobile,
            description: params.description || 'پرداخت',
            allowedCards: params.allowedCards
        };

        console.log('📤 Zibal Request:', { ...requestBody, merchant: config.sandbox ? 'zibal (sandbox)' : 'production' });

        const response = await fetch(ZIBAL_CONFIG.REQUEST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data: ZibalRequestResponse = await response.json();
        if (data.result === 100 && data.trackId) {
            // موفقیت - ساخت URL پرداخت
            data.paymentUrl = `${ZIBAL_CONFIG.START_URL}${data.trackId}`;
        }

        return data;
    } catch (error) {
        throw error instanceof Error ? error : new Error('خطا در ایجاد درخواست پرداخت زیبال');
    }
};

/**
 * تایید پرداخت در زیبال
 */
export const verifyZibalPayment = async (params: ZibalVerifyParams): Promise<ZibalVerifyResponse> => {
    try {
        // دریافت تنظیمات از دیتابیس
        const config = await getZibalConfig();
        
        if (!config.merchantId) {
            throw new Error('Merchant ID زیبال تنظیم نشده است');
        }

        const requestBody = {
            merchant: config.merchantId,
            trackId: params.trackId
        };
        const response = await fetch(ZIBAL_CONFIG.VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data: ZibalVerifyResponse = await response.json();
        return data;
    } catch (error) {
        throw error instanceof Error ? error : new Error('خطا در تایید پرداخت زیبال');
    }
};

/**
 * بررسی وضعیت نتیجه زیبال
 */
export const getZibalResultMessage = (result: number): string => {
    const messages: { [key: number]: string } = {
        100: 'با موفقیت تایید شد',
        102: 'merchant یافت نشد',
        103: 'merchant غیرفعال',
        104: 'merchant نامعتبر',
        201: 'قبلا تایید شده',
        105: 'amount بایستی بزرگتر از 1,000 ریال باشد',
        106: 'callbackUrl نامعتبر می‌باشد',
        113: 'amount مبلغ تراکنش از سقف میزان تراکنش بیشتر است',
        202: 'سفارش پرداخت نشده یا ناموفق بوده است',
        203: 'trackId نامعتبر می‌باشد'
    };
    
    return messages[result] || `خطای ناشناخته (کد: ${result})`;
};

/**
 * بررسی موفقیت درخواست
 */
export const isZibalRequestSuccessful = (result: number): boolean => {
    return result === 100;
};

/**
 * بررسی موفقیت تایید
 */
export const isZibalVerifySuccessful = (result: number): boolean => {
    return result === 100;
};
