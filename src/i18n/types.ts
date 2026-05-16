export type Language = 'en' | 'es';

export type Translations = typeof import('./locales/en').en;
