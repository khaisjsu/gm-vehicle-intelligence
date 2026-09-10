import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createUser, deleteExpiredSessions, deleteSession, findSessionUser, findUserByEmail, saveSession } from "./db.js";

const SESSION_COOKIE = "vector_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const attempts = new Map();
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
const clientIp = (req) => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
const secureRequest = (req) => process.env.NODE_ENV === "production" || req.headers["x-forwarded-proto"] === "https";

function passwordHash(password) { const salt = randomBytes(16); const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }); return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`; }
function verifyPassword(password, stored) { const [, saltHex, hashHex] = String(stored).split("$"); if (!saltHex || !hashHex) return false; const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 }); const expected = Buffer.from(hashHex, "hex"); return expected.length === actual.length && timingSafeEqual(expected, actual); }
function getCookie(req) { return (req.headers.cookie || "").split(";").map((part) => part.trim().split("=")).find(([key]) => key === SESSION_COOKIE)?.[1]; }
function setCookie(res, token, secure) { res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure ? "; Secure" : ""}`); }
function clearCookie(res, secure) { res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`); }
function rateLimited(req) { const key = clientIp(req); const cutoff = Date.now() - 15 * 60 * 1000; const recent = (attempts.get(key) || []).filter((time) => time > cutoff); recent.push(Date.now()); attempts.set(key, recent); return recent.length > 10; }
export function currentUser(req) { const token = getCookie(req); if (!token) return null; deleteExpiredSessions(); return findSessionUser(tokenHash(token)) || null; }
export function requireUser(req, res) { const user = currentUser(req); if (!user) { res.writeHead(302, { Location: "/login" }); res.end(); return null; } return user; }
export function handleAuth(req, res, url, body) {
  const secure = secureRequest(req); const authMutation = url.pathname === "/api/auth/login" || url.pathname === "/api/auth/register";
  if (authMutation && rateLimited(req)) return { status: 429, body: { error: "Too many attempts. Try again later." } };
  if (url.pathname === "/api/auth/me" && req.method === "GET") return { status: 200, body: { user: currentUser(req) } };
  if (url.pathname === "/api/auth/logout" && req.method === "POST") { const token = getCookie(req); if (token) deleteSession(tokenHash(token)); clearCookie(res, secure); return { status: 200, body: { ok: true } }; }
  if (authMutation && req.method === "POST") {
    const email = normalizeEmail(body.email); const password = String(body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return { status: 400, body: { error: "Enter a valid email and a password with at least 8 characters." } };
    if (url.pathname.endsWith("register")) { if (findUserByEmail(email)) return { status: 400, body: { error: "Unable to create account with those details." } }; const user = createUser(email, passwordHash(password)); return createSession(res, secure, user); }
    const user = findUserByEmail(email); if (!user || !verifyPassword(password, user.passwordHash)) return { status: 401, body: { error: "Invalid username or password." } }; return createSession(res, secure, { id: user.id, email: user.email });
  }
  return null;
}
function createSession(res, secure, user) { const token = randomBytes(32).toString("base64url"); saveSession(tokenHash(token), user.id, new Date(Date.now() + SESSION_TTL_MS).toISOString()); setCookie(res, token, secure); return { status: 200, body: { user } }; }
