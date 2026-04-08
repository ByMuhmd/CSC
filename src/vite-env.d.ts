/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_WEB3FORMS_ACCESS_KEY: string
    readonly PROD: boolean
    readonly DEV: boolean
    readonly MODE: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
