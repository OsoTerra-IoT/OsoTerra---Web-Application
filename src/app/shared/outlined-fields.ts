import { Provider } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

/**
 * Serene theme: outlined fields on the white cards and the ivory background. Provided by the
 * lazy layouts and auth routes, so the form field code stays out of the initial bundle.
 */
export const OUTLINED_FIELDS: Provider = {
  provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
  useValue: { appearance: 'outline' },
};
