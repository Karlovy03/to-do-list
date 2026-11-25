/// <reference types="vite/client" />

declare module '*.yml' {
  const data: Record<string, unknown>;
  export default data;
}

interface ImportMetaEnv {
  /** Адреса сервера для мобільних застосунків, напр. https://kontrol.example.ua */
  readonly VITE_API_URL?: string;
}
