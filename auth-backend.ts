import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.AUTH_BACKEND_PORT || 3002;

// Initialize Supabase admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(cors());
app.use(express.json());

/**
 * Update user password using admin API
 * This allows us to set phone number as password for users who registered with email/password
 */
app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Missing userId or newPassword' });
    }

    console.log(`🔐 Updating password for user: ${userId}`);

    // Update user password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      console.error('❌ Password update failed:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Password updated successfully');
    return res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('❌ Error updating password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Auth Backend' });
});

app.listen(port, () => {
  console.log(`🔐 Auth Backend running on http://localhost:${port}`);
  console.log('📝 Endpoints:');
  console.log('  - POST /api/auth/update-password - Update user password');
  console.log('  - GET /health - Health check');
});
