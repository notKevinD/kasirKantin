type LoginAttempt = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, LoginAttempt>();
const windowMs = 10 * 60 * 1000;
const maxAttempts = 5;

export function getLoginRateLimitKey(request: Request, username: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  return `${ip}:${username.toLowerCase()}`;
}

export function isLoginRateLimited(key: string) {
  const attempt = attempts.get(key);

  if (!attempt) return false;

  if (Date.now() > attempt.resetAt) {
    attempts.delete(key);
    return false;
  }

  return attempt.count >= maxAttempts;
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || now > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  attempts.set(key, { ...current, count: current.count + 1 });
}

export function clearFailedLogin(key: string) {
  attempts.delete(key);
}
