import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY nao configurada');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient()
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const ALLOWED_PRICE_IDS = new Set([
  'price_1TFeUxKEGcZcVMwNTnqgIusz',
  'price_1TFeVfKEGcZcVMwNAHVc9yiP',
  'price_1TFeW5KEGcZcVMwNw7xxTHXv'
]);

function resolveOrigin(req: Request): string {
  const reqOrigin = req.headers.get('origin');
  if (reqOrigin) return reqOrigin;
  return Deno.env.get('APP_URL') || 'http://localhost:4200';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId } = await req.json();

    if (!priceId) {
      throw new Error('priceId nao fornecido');
    }

    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      throw new Error('Plano invalido para checkout: ' + priceId);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header nao encontrado');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      throw new Error('Token de acesso ausente');
    }

    const supabaseUrl = new URL(req.url).origin;
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('SERVICE_ROLE_KEY nao configurada');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      throw new Error('Erro ao verificar usuario: ' + userError.message);
    }

    if (!user) {
      throw new Error('Usuario nao encontrado. Faça login novamente.');
    }

    console.log('Usuario autenticado:', user.id);

    let customerId: string | undefined;

    const { data: existingSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subError && existingSub) {
      customerId = existingSub.stripe_customer_id;
      console.log('Cliente existente encontrado:', customerId);
    }

    if (!customerId) {
      console.log('Criando novo cliente Stripe para:', user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      console.log('Novo cliente criado:', customerId);
    }

    const origin = resolveOrigin(req);

    console.log('Criando sessao de checkout para priceId:', priceId);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=canceled`,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id }
      }
    });

    console.log('Sessao criada:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar checkout';
    console.error('Erro:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
