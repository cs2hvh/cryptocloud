import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Get wallet balance and transactions
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!bearer) {
    return Response.json({ ok: false, error: 'Authorization required' }, { status: 401 });
  }

  try {
    // Create supabase client with service role for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user token using the admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(bearer);
    if (userError) {
      console.error('Wallet API - User auth error:', userError);
      return Response.json({ ok: false, error: `Authentication failed: ${userError.message}` }, { status: 401 });
    }

    if (!user) {
      return Response.json({ ok: false, error: 'No user found' }, { status: 401 });
    }

    // Get or create wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', 'USD')
      .maybeSingle();

    if (walletError) {
      return Response.json({ ok: false, error: walletError.message }, { status: 500 });
    }

    let walletData = wallet;
    if (!wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 0.00,
          currency: 'USD'
        })
        .select('*')
        .single();

      if (createError) {
        return Response.json({ ok: false, error: createError.message }, { status: 500 });
      }
      walletData = newWallet;
    }

    // Get recent transactions
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) {
      return Response.json({ ok: false, error: txError.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      wallet: walletData,
      transactions: transactions || []
    });

  } catch (error: any) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// Add funds to wallet (for testing/demo purposes)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!bearer) {
    return Response.json({ ok: false, error: 'Authorization required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { amount, description = 'Manual deposit' } = body;

  if (!amount || amount <= 0) {
    return Response.json({ ok: false, error: 'Valid amount required' }, { status: 400 });
  }

  try {
    // Create supabase client with service role for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user token using the admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(bearer);
    if (userError) {
      console.error('Wallet POST API - User auth error:', userError);
      return Response.json({ ok: false, error: `Authentication failed: ${userError.message}` }, { status: 401 });
    }

    if (!user) {
      return Response.json({ ok: false, error: 'No user found' }, { status: 401 });
    }

    // Get or create wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', 'USD')
      .maybeSingle();

    if (walletError) {
      return Response.json({ ok: false, error: walletError.message }, { status: 500 });
    }

    let walletData = wallet;
    if (!wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 0.00,
          currency: 'USD'
        })
        .select('*')
        .single();

      if (createError) {
        return Response.json({ ok: false, error: createError.message }, { status: 500 });
      }
      walletData = newWallet;
    }

    // Update wallet balance
    const newBalance = parseFloat(walletData.balance) + parseFloat(amount);
    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', walletData.id);

    if (updateError) {
      return Response.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    // Create transaction record
    const { error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: walletData.id,
        user_id: user.id,
        type: 'deposit',
        amount: parseFloat(amount),
        currency: 'USD',
        status: 'completed',
        description
      });

    if (txError) {
      return Response.json({ ok: false, error: txError.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      balance: newBalance,
      message: `Added $${amount} to wallet`
    });

  } catch (error: any) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}