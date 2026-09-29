import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';

export const settingsGuard: CanActivateFn = () => {
  const settings = inject(SettingsService);
  const router = inject(Router);
  if (settings.isConfigured()) {
    return true;
  }
  return router.parseUrl('/settings');
};
