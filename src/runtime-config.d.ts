type ArisRuntimeConfig = {
  sentryDsn?: string;
  sentryEnvironment?: string;
  sentryRelease?: string;
  sentryDebug?: boolean;
  sentryTracesSampleRate?: number;
  sentryReplaysSessionSampleRate?: number;
  sentryReplaysOnErrorSampleRate?: number;
};

declare global {
  interface Window {
    __ARIS_RUNTIME_CONFIG__?: ArisRuntimeConfig;
  }
}

export {};
