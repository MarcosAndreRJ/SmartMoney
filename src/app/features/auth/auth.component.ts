import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule],
    template: `
    <div class="min-h-screen bg-[#F8F9FC]">
      <div class="min-h-screen grid lg:grid-cols-2">
        <section class="hidden lg:flex relative overflow-hidden bg-gradient-to-b from-[#860ED8] via-[#8D22D8] to-[#7C7CE4] text-white p-12 items-end">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_42%)]"></div>
          <div class="absolute -bottom-14 -right-12 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
          <div class="relative max-w-md">
            <img src="/assets/logo-smartkonta.png" alt="SmartKonta" class="w-16 h-16 object-contain mb-10" />
            <h2 class="text-5xl leading-tight font-extrabold">Comece a sua jornada com a SmartKonta</h2>
            <p class="mt-6 text-xl text-white/90 leading-relaxed">Junte-se a nos para atingir seus objetivos financeiros de forma rapida, segura e com uma experiencia totalmente digital e premium.</p>
          </div>
        </section>

        <section class="flex items-center justify-center p-4 md:p-10">
          <div class="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/70 p-8">
            @if (successMessage()) {
              <div class="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <mat-icon class="text-5xl w-auto h-auto">mark_email_read</mat-icon>
                </div>
                <div class="space-y-2">
                  <h2 class="text-2xl font-bold text-gray-900">Verifique seu e-mail</h2>
                  <p class="text-gray-500">Enviamos um link de confirmacao para <strong>{{ email }}</strong>.</p>
                </div>
                <button
                  (click)="successMessage.set(false); isSignUp.set(false)"
                  class="w-full h-12 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Voltar para entrar
                </button>
              </div>
            } @else {
              <div class="mb-8">
                <div class="flex items-center gap-3 mb-6 lg:hidden">
                  <img src="/assets/logo-smartkonta.png" alt="SmartKonta" class="w-9 h-9 object-contain" />
                  <h1 class="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#A21CAF]">SmartKonta</h1>
                </div>

                <h2 class="text-4xl font-extrabold text-slate-900 leading-tight">Bem-vindo de volta!</h2>
                <p class="text-slate-500 mt-3 text-lg">Por favor, insira seus detalhes para entrar na sua SmartKonta.</p>
              </div>

              <button
                (click)="signInWithGoogle()"
                class="w-full h-12 border border-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <span class="w-6 h-6 rounded-full bg-white border border-slate-200 text-[13px] grid place-items-center">G</span>
                Entrar com Google
              </button>

              <div class="my-6 flex items-center gap-4 text-slate-400 text-sm">
                <div class="h-px flex-1 bg-slate-200"></div>
                <span>ou entrar com e-mail</span>
                <div class="h-px flex-1 bg-slate-200"></div>
              </div>

              <form (ngSubmit)="handleAuth()" class="space-y-5">
                @if (isSignUp()) {
                  <div class="space-y-2">
                    <label for="fullName" class="text-sm font-semibold text-slate-700">Nome completo</label>
                    <input id="fullName" type="text" [(ngModel)]="fullName" name="fullName" class="input-brand" placeholder="Alex Thompson" required>
                  </div>
                }

                <div class="space-y-2">
                  <label for="email" class="text-sm font-semibold text-slate-700">E-mail</label>
                  <input id="email" type="email" [(ngModel)]="email" name="email" class="input-brand" placeholder="alex@example.com" required>
                </div>

                <div class="space-y-2">
                  <label for="password" class="text-sm font-semibold text-slate-700">Senha</label>
                  <input id="password" type="password" [(ngModel)]="password" name="password" class="input-brand" placeholder="Digite sua senha" required>
                </div>

                <div class="flex items-center justify-between text-sm text-slate-500">
                  <label class="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" class="accent-[#7C3AED]">
                    Lembrar-me
                  </label>
                  <button type="button" class="font-semibold text-[#7C3AED] hover:text-[#6C2BD9]">Esqueceu a senha?</button>
                </div>

                @if (error()) {
                  <p class="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{{ error() }}</p>
                }

                <button type="submit" [disabled]="loading()" class="w-full h-12 btn-brand disabled:opacity-50">
                  {{ loading() ? 'Processando...' : (isSignUp() ? 'Criar conta' : 'Entrar') }}
                </button>
              </form>

              <div class="text-center mt-6">
                <button
                  (click)="isSignUp.set(!isSignUp()); error.set(null)"
                  class="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {{ isSignUp() ? 'Ja tem uma conta? Entrar' : 'Nao tem uma conta? Cadastre-se gratis' }}
                </button>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `
})
export class AuthComponent {
    private supabase = inject(SupabaseService);

    fullName = '';
    email = '';
    password = '';
    loading = signal(false);
    isSignUp = signal(false);
    successMessage = signal(false);
    error = signal<string | null>(null);
    rememberMe = false;

    async signInWithGoogle() {
        this.error.set(null);
        const { error } = await this.supabase.client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            this.error.set(error.message);
        }
    }

    async handleAuth() {
        this.loading.set(true);
        this.error.set(null);

        try {
            if (this.isSignUp()) {
                const { error } = await this.supabase.client.auth.signUp({
                    email: this.email,
                    password: this.password,
                    options: {
                        data: {
                            full_name: this.fullName
                        }
                    }
                });
                if (error) throw error;
                this.successMessage.set(true);
            } else {
                const { error } = await this.supabase.client.auth.signInWithPassword({
                    email: this.email,
                    password: this.password,
                });
                if (error) throw error;
            }
        } catch (e: unknown) {
            this.error.set(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            this.loading.set(false);
        }
    }
}
