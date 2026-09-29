import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Hash-based routing avoids needing a server-side rewrite rule, which
    // static hosts like GitHub Pages don't provide.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
  ],
};
