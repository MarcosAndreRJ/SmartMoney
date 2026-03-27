import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const adminGuard: CanActivateFn = async (route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);
  
  const isAdmin = await adminService.isAdmin();
  
  if (!isAdmin) {
    router.navigate(['/']);
    return false;
  }
  
  return true;
};
