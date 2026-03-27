import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _loading = signal<boolean>(false);
  private _message = signal<string>('Sincronizando dados...');

  isLoading = this._loading.asReadonly();
  message = this._message.asReadonly();

  show(message?: string) {
    if (message) this._message.set(message);
    this._loading.set(true);
  }

  hide() {
    this._loading.set(false);
    // Reset message after a small delay to avoid text jump
    setTimeout(() => this._message.set('Sincronizando dados...'), 300);
  }
}
