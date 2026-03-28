import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient()
});

const PRICE_MAP: Record<string, string> = {
  price_1TFeUxKEGcZcVMwNTnqgIusz: 'pro',
  price_1TFeVfKEGcZcVMwNAHVc9yiP: 'master',
  price_1TFeW5KEGcZcVMwNw7xxTHXv: 'family'
};

function mapStripeStatus(status: string): 'active' | 'trial' | 'cancelled' | 'expired' {
  if (status === 'active') return 'active';
  if (status === 'trialing') return 'trial';
  if (status === 'canceled' || status === 'incomplete_expired') return 'cancelled';
  return 'expired';
}

function toIsoDateFromUnix(unixSeconds: number | null | undefined, fallbackIso: string): string {
  if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds)) return fallbackIso;
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return fallbackIso;
  return date.toISOString();
}

async function writeLog(supabaseAdmin: ReturnType<typeof createClient>, msg: string) {
  try {
    console.log(msg);
    const { error } = await supabaseAdmin.from('webhook_logs').insert({ log: msg });
    if (error) {
      console.error('writeLog DB error:', error.message);
    }
  } catch (e) {
    console.error('Failed to write log', e);
  }
}

async function resolveUserIdFromSubscription(subscription: Stripe.Subscription, supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  const fromMetadata = subscription.metadata?.user_id;
  if (fromMetadata) {
    await writeLog(supabaseAdmin, `resolveUserId: found in metadata -> ${fromMetadata}`);
    return fromMetadata;
  }
  const customerId = String(subscription.customer);
  await writeLog(supabaseAdmin, `resolveUserId: fetching customer -> ${customerId}`);
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) return null;
    return customer.metadata?.user_id || null;
  } catch (err) {
    return null;
  }
}

async function syncSubscriptionToDatabase(
  supabaseAdmin: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
  userId: string
) {
  await writeLog(supabaseAdmin, `syncStart: userId=${userId}`);
  
  const priceId = subscription.items?.data?.[0]?.price?.id;
  await writeLog(supabaseAdmin, `syncPriceId: ${priceId}`);

  const planCode = priceId ? PRICE_MAP[priceId] || 'basic' : 'basic';
  await writeLog(supabaseAdmin, `syncPlanCode: ${planCode}`);

  const nowIso = new Date().toISOString();
  const startIso = toIsoDateFromUnix(subscription.current_period_start as number | null | undefined, nowIso);
  const endIso = toIsoDateFromUnix(
    (subscription.current_period_end as number | null | undefined) ?? (subscription.ended_at as number | null | undefined),
    nowIso
  );

  const payload = {
    user_id: userId,
    stripe_customer_id: String(subscription.customer || ''),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId || null,
    plan_code: planCode,
    status: subscription.status,
    current_period_start: startIso,
    current_period_end: endIso,
    cancel_at_period_end: subscription.cancel_at_period_end
  };

  await writeLog(supabaseAdmin, `syncPayload: ${JSON.stringify(payload)}`);

  const { data: upsertedUserSub, error: userSubError } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert(payload, { onConflict: 'user_id' })
    .select('id,user_id,plan_code,status,stripe_subscription_id,updated_at')
    .maybeSingle();

  if (userSubError) {
    await writeLog(supabaseAdmin, `syncError user_subscriptions: ${userSubError.message}`);
    throw new Error(`user_subscriptions upsert failed: ${userSubError.message}`);
  }

  await writeLog(supabaseAdmin, `syncUpsertResult: ${JSON.stringify(upsertedUserSub)}`);

  const { data: planRow } = await supabaseAdmin.from('plans').select('id').eq('slug', planCode).maybeSingle();
  if (!planRow?.id) {
    await writeLog(supabaseAdmin, `syncError plan not found: ${planCode}`);
    throw new Error(`Plan slug not found in plans table: ${planCode}`);
  }

  const subscriptionPayload = {
    user_id: userId,
    plan_id: planRow.id,
    status: mapStripeStatus(subscription.status),
    start_date: startIso,
    end_date: endIso,
    payment_gateway: 'stripe',
    gateway_subscription_id: subscription.id
  };

  await writeLog(supabaseAdmin, `syncSubPayload: ${JSON.stringify(subscriptionPayload)}`);

  const { data: existingRecord } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingRecord?.id) {
    await writeLog(supabaseAdmin, `syncUpdate existing: ${existingRecord.id}`);
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(subscriptionPayload)
      .eq('id', existingRecord.id);
    if (updateError) throw new Error(`subscriptions update failed: ${updateError.message}`);
  } else {
    await writeLog(supabaseAdmin, `syncInsert new`);
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert(subscriptionPayload);
    if (insertError) {
      await writeLog(supabaseAdmin, `syncError subscriptions insert: ${insertError.message}`);
      throw new Error(`subscriptions insert failed: ${insertError.message}`);
    }
  }
  await writeLog(supabaseAdmin, `syncSuccess!`);
}

serve(async (req) => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  try {
    // FIX: Using Deno.env.get('SUPABASE_URL') prevents URL resolution issues in edge functions
    // caused by internal load balancers returning local origin IPs (which fail database network requests silently).
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://niobxjtufruqliakyydv.supabase.co';
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!serviceRoleKey) return new Response('SERVICE_ROLE_KEY nao configurada', { status: 500 });
    
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    await writeLog(supabaseAdmin, `Webhook Request Received. req.url=${req.url}, supabaseUrl=${supabaseUrl}`);

    const signature = req.headers.get('Stripe-Signature');
    if (!signature) {
      await writeLog(supabaseAdmin, `400: No Stripe-Signature`);
      return new Response('No Signature', { status: 400 });
    }

    const rawBody = await req.text();
    const webhookSecrets = (Deno.env.get('STRIPE_WEBHOOK_SECRET') || '').split(',').map((s) => s.trim()).filter((s) => s.length > 0);

    let event: Stripe.Event | null = null;
    let signatureError: string | null = null;

    for (const secret of webhookSecrets) {
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret, undefined, Stripe.createSubtleCryptoProvider());
        signatureError = null;
        break;
      } catch (err) {
        signatureError = err instanceof Error ? err.message : 'Invalid webhook signature';
      }
    }

    if (signatureError || !event) {
      await writeLog(supabaseAdmin, `400: Signature validation failed: ${signatureError}`);
      return new Response(`Webhook Error: ${signatureError || 'Invalid webhook signature'}`, { status: 400 });
    }

    await writeLog(supabaseAdmin, `Event Validated: ${event.type}`);

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdFromSubscription(subscription, supabaseAdmin);
      
      if (!userId) {
        await writeLog(supabaseAdmin, `400: Sem user_id no metadata`);
        return new Response('Sem user_id no metadado da assinatura', { status: 400 });
      }

      await syncSubscriptionToDatabase(supabaseAdmin, subscription, userId);
    } 
    else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      await writeLog(supabaseAdmin, `checkout: subscriptionId=${subscriptionId}`);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = await resolveUserIdFromSubscription(subscription, supabaseAdmin);
        if (!userId) {
          await writeLog(supabaseAdmin, `400: Sem user_id no checkout session!`);
          return new Response(JSON.stringify({ error: 'No user_id found' }), { status: 400 });
        }
        await syncSubscriptionToDatabase(supabaseAdmin, subscription, userId);
      }
    } else {
       await writeLog(supabaseAdmin, `Event ignored: ${event.type}`);
    }

    await writeLog(supabaseAdmin, `Returning 200 OK`);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 });

  } catch (globalError: any) {
    if (supabaseAdmin) await writeLog(supabaseAdmin, `500 GLOBAL ERROR: ${globalError?.message}`);
    return new Response(JSON.stringify({ error: globalError?.message || 'Internal Error' }), { status: 500 });
  }
});
