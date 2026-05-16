export type Language = 'en' | 'es';

type Stringify<T> = T extends string ? string : { [K in keyof T]: Stringify<T[K]> };

export type Translations = Stringify<typeof import('./locales/en').en>;
