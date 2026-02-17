-- بررسی حراجی شماره 44444422222

-- 1. پیدا کردن sim_card
SELECT 
    id as sim_id,
    phone_number,
    status,
    listing_type
FROM sim_cards
WHERE phone_number = '44444422222';

-- 2. بررسی auction_details
SELECT 
    ad.id as auction_id,
    ad.sim_card_id,
    ad.highest_bidder_id,
    ad.current_bid,
    ad.end_time,
    ad.status,
    u.phone_number as winner_phone
FROM auction_details ad
LEFT JOIN users u ON u.id = ad.highest_bidder_id
WHERE ad.sim_card_id IN (
    SELECT id FROM sim_cards WHERE phone_number = '44444422222'
);

-- 3. بررسی purchase_orders موجود
SELECT 
    po.id,
    po.sim_card_id,
    po.buyer_id,
    po.status,
    po.created_at,
    u.phone_number as buyer_phone,
    sc.phone_number as sim_phone
FROM purchase_orders po
LEFT JOIN users u ON u.id = po.buyer_id
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
WHERE po.sim_card_id IN (
    SELECT id FROM sim_cards WHERE phone_number = '44444422222'
)
ORDER BY po.created_at DESC;

-- 4. بررسی guarantee_deposits
SELECT 
    gd.id,
    gd.user_id,
    gd.auction_id,
    gd.sim_card_id,
    gd.amount,
    gd.status,
    u.phone_number as user_phone
FROM guarantee_deposits gd
LEFT JOIN users u ON u.id = gd.user_id
WHERE gd.sim_card_id IN (
    SELECT id FROM sim_cards WHERE phone_number = '44444422222'
)
ORDER BY gd.created_at DESC;
