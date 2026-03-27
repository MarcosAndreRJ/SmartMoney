import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private nextId = 0;

    show(type: ToastType, title: string, message: string) {
        const id = this.nextId++;
        const toast: Toast = { id, type, title, message };
        this.toasts.update(t => [...t, toast]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.remove(id);
        }, 5000);
    }

    success(title: string, message: string) {
        this.show('success', title, message);
    }

    error(title: string, message: string) {
        this.show('error', title, message);
    }

    remove(id: number) {
        this.toasts.update(t => t.filter(toast => toast.id !== id));
    }
}
