import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch(() => {
  document.body.textContent = 'No se pudo iniciar la aplicación. Recarga la página e inténtalo de nuevo.';
});
