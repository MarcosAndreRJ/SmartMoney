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

const PRICE_MAP: Record<string, string> = {
  price_1TFeUxKEGcZcVMwNTnqgIusz: 'pro',
  price_1TFeVfKEGcZcVMwNAHVc9yiP: 'master',
  price_1TFeW5KEGcZcVMwNw7xxTHXv: 'family'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, priceId, cancelAtPeriodEnd } = await req.json();

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

    const { data: userSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, plan_code, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'incomplete'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      throw new Error('Erro ao buscar assinatura: ' + subError.message);
    }

    if (!userSub?.stripe_subscription_id) {
      throw new Error('Nenhuma assinatura ativa encontrada para este usuario');
    }

    const subscription = await stripe.subscriptions.retrieve(userSub.stripe_subscription_id);

    if (action === 'cancel') {
      const updateData: Stripe.SubscriptionUpdateParams = {
        cancel_at_period_end: cancelAtPeriodEnd !== false
      };

      const updated = await stripe.subscriptions.update(
        userSub.stripe_subscription_id,
        updateData
      );

      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: updated.cancel_at_period_end,
          status: updated.status,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', userSub.stripe_subscription_id);

      if (updateError) {
        throw new Error('Erro ao atualizar cancelamento: ' + updateError.message);
      }

      console.log('Assinatura cancelada para:', user.id, 'cancel_at_period_end:', updated.cancel_at_period_end);

      return new Response(JSON.stringify({
        success: true,
        message: updated.cancel_at_period_end
          ? 'Cancelamento agendado para o final do período'
          : 'Assinatura cancelada imediatamente',
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (action === 'update') {
      if (!priceId) {
        throw new Error('priceId é obrigatório para atualização de plano');
      }

      const newPlanCode = PRICE_MAP[priceId];
      if (!newPlanCode) {
        throw new Error('Price ID inválido: ' + priceId);
      }

      const subscriptionItemId = subscription.items.data[0]?.id;
      if (!subscriptionItemId) {
        throw new Error('Item de assinatura não encontrado');
      }

      const updated = await stripe.subscriptions.update(
        userSub.stripe_subscription_id,
        {
          items: [{
            id: subscriptionItemId,
            price: priceId
          }],
          proration_behavior: 'none'
        }
      );

      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          stripe_price_id: priceId,
          plan_code: newPlanCode,
          status: updated.status,
          cancel_at_period_end: updated.cancel_at_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', userSub.stripe_subscription_id);

      if (updateError) {
        throw new Error('Erro ao atualizar plano: ' + updateError.message);
      }

      console.log('Plano atualizado para:', user.id, 'novo plano:', newPlanCode);

      return new Response(JSON.stringify({
        success: true,
        message: updated.cancel_at_period_end
          ? 'Plano será alterado ao final do período atual'
          : 'Plano atualizado com sucesso',
        new_plan: newPlanCode,
        status: updated.status,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    throw new Error('Ação inválida. Use: cancel ou update');

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerenciar assinatura';
    console.error('Erro:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
