import * as Sentry from "@sentry/browser";
import type { User } from "../api/auth";

type SentryScopeContext = {
  area?: string;
  action?: string;
  extras?: Record<string, unknown>;
};

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAYS_SESSION_SAMPLE_RATE = 0.05;
const DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE = 1.0;

function getRuntimeConfig() {
  return window.__ARIS_RUNTIME_CONFIG__ ?? {};
}

function getSentryDsn(): string {
  return getRuntimeConfig().sentryDsn ?? "";
}

function getSentryEnvironment(): string {
  const runtimeEnvironment = getRuntimeConfig().sentryEnvironment;

  if (runtimeEnvironment) {
    return runtimeEnvironment;
  }

  return window.location.hostname === "localhost" ? "development" : "production";
}

function getSentryRelease(): string {
  return getRuntimeConfig().sentryRelease ?? "";
}

function getSentryDebug(): boolean {
  return Boolean(getRuntimeConfig().sentryDebug);
}

function getSentryTracesSampleRate(): number {
  return getRuntimeConfig().sentryTracesSampleRate ?? DEFAULT_TRACES_SAMPLE_RATE;
}

function getSentryReplaysSessionSampleRate(): number {
  return getRuntimeConfig().sentryReplaysSessionSampleRate ?? DEFAULT_REPLAYS_SESSION_SAMPLE_RATE;
}

function getSentryReplaysOnErrorSampleRate(): number {
  return getRuntimeConfig().sentryReplaysOnErrorSampleRate ?? DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE;
}

function getTracePropagationTargets(): Array<string | RegExp> {
  return [window.location.origin, "https://arisnet.ru", "http://localhost:8080", /^\/api\//];
}

export function isSentryEnabled(): boolean {
  return Boolean(getSentryDsn());
}

export function initSentry(): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    release: getSentryRelease() || undefined,
    debug: getSentryDebug(),
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: getSentryTracesSampleRate(),
    tracePropagationTargets: getTracePropagationTargets(),
    replaysSessionSampleRate: getSentryReplaysSessionSampleRate(),
    replaysOnErrorSampleRate: getSentryReplaysOnErrorSampleRate(),
  });
}

export function captureAppException(error: unknown, context: SentryScopeContext = {}): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.area) {
      scope.setTag("area", context.area);
    }

    if (context.action) {
      scope.setTag("action", context.action);
    }

    Object.entries(context.extras ?? {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    Sentry.captureException(error);
  });
}

export function syncSentryUser(user: User | null): void {
  if (!isSentryEnabled()) {
    return;
  }

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    ...(user.login ? { username: user.login } : {}),
    ...(user.email ? { email: user.email } : {}),
    ...(`${user.firstName} ${user.lastName}`.trim()
      ? { name: `${user.firstName} ${user.lastName}`.trim() }
      : {}),
  });
}
