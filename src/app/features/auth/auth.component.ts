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
    <div class="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-8">
        
        @if (successMessage()) {
          <div class="text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <mat-icon class="text-5xl w-auto h-auto">mark_email_read</mat-icon>
            </div>
            <div class="space-y-2">
              <h2 class="text-2xl font-bold text-gray-900">Check your inbox!</h2>
              <p class="text-gray-500">We've sent a confirmation link to <strong>{{ email }}</strong>. Please verify your email to continue.</p>
            </div>
            <button 
              (click)="successMessage.set(false); isSignUp.set(false)"
              class="w-full h-12 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              Back to Sign In
            </button>
          </div>
        } @else {
          <div class="text-center space-y-2">
            <div class="w-16 h-16 bg-[#1A1F2C] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <mat-icon class="text-white text-3xl w-auto h-auto">account_balance</mat-icon>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Welcome to SmartMoney</h1>
            <p class="text-gray-500">{{ isSignUp() ? 'Create your account to start' : 'Sign in to manage your finances' }}</p>
          </div>

          <form (ngSubmit)="handleAuth()" class="space-y-5">
            @if (isSignUp()) {
              <div class="space-y-2">
                <label for="fullName" class="text-sm font-semibold text-gray-700">Full Name</label>
                <input 
                  id="fullName"
                  type="text" 
                  [(ngModel)]="fullName" 
                  name="fullName"
                  class="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#1A1F2C] outline-none transition-all"
                  placeholder="Alex Thompson"
                  required
                >
              </div>
            }

            <div class="space-y-2">
              <label for="email" class="text-sm font-semibold text-gray-700">Email Address</label>
              <input 
                id="email"
                type="email" 
                [(ngModel)]="email" 
                name="email"
                class="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#1A1F2C] outline-none transition-all"
                placeholder="alex@example.com"
                required
              >
            </div>

            <div class="space-y-2">
              <label for="password" class="text-sm font-semibold text-gray-700">Password</label>
              <input 
                id="password"
                type="password" 
                [(ngModel)]="password" 
                name="password"
                class="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#1A1F2C] outline-none transition-all"
                placeholder="••••••••"
                required
              >
            </div>

            @if (error()) {
              <p class="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{{ error() }}</p>
            }

            <button 
              type="submit" 
              [disabled]="loading()"
              class="w-full h-12 bg-[#1A1F2C] text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg shadow-gray-200"
            >
              {{ loading() ? 'Processing...' : (isSignUp() ? 'Create Account' : 'Sign In') }}
            </button>
          </form>

          <div class="text-center">
            <button 
              (click)="isSignUp.set(!isSignUp()); error.set(null)" 
              class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {{ isSignUp() ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
            </button>
          </div>
        }
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
