# Notifications System Setup Guide

## Problem
You're seeing "هیچ اعلانی یافت نشد." (No notifications found) because the `notifications` table hasn't been created in Supabase yet.

## Solution - Create the Notifications Table

### Step 1: Go to Supabase Console
1. Visit: https://app.supabase.com
2. Select your **Msim724** project
3. Click on **SQL Editor** (in the left sidebar)

### Step 2: Create New Query
1. Click on **"New Query"** button
2. Name it: `Create notifications table` (or any name)

### Step 3: Copy and Paste SQL
Copy the entire contents of this file:
```
e:\code\msim\supabase\add-notifications-table.sql
```

And paste it into the Supabase SQL editor.

### Step 4: Execute the Query
1. Click the **"Execute"** button (green play icon) or press Ctrl+Enter
2. Wait for it to complete
3. You should see a success message

## What This SQL Does
- ✅ Creates the `notifications` table
- ✅ Adds proper indexes for performance
- ✅ Enables Row Level Security (RLS)
- ✅ Creates RLS policies so:
  - Users can view their own notifications
  - Users can mark their notifications as read
  - Users can delete their notifications
  - The system can insert notifications for any user

## Verify It Works
After running the SQL:
1. Go back to your app
2. Have a seller list a SIM card
3. Have a buyer purchase it or place a bid
4. Check the notifications bell in the header (top right)
5. You should now see notifications!

## If It Still Doesn't Work

### Check 1: Verify Table Exists
In Supabase SQL Editor, run:
```sql
SELECT COUNT(*) FROM notifications;
```
If you get an error saying "relation notifications does not exist", the SQL wasn't executed properly.

### Check 2: Check for RLS Errors
The browser console might show RLS policy errors. If so, ensure the entire `add-notifications-table.sql` was pasted and executed.

### Check 3: Test Manually
In the Supabase SQL Editor, try inserting a test notification:
```sql
INSERT INTO notifications (user_id, title, message, type, is_read)
VALUES ('your-user-id', 'Test', 'This is a test', 'info', false);
```

## Contact Support
If you still have issues after following these steps, the problem likely requires direct Supabase intervention.
