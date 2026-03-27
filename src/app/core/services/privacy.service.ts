import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PrivacyService {
    isPrivate = signal(false);

    togglePrivacy() {
        this.isPrivate.update(v => !v);
    }

    maskValue(value: string | number): string {
        if (!this.isPrivate()) return value.toString();
        return 'R$ ****';
    }
}
