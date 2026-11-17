// Local-only, one-time key entry. No key file, browser storage, URL, or command argument.
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const port = 39401;
const origin = `http://127.0.0.1:${port}`;
const nonce = crypto.randomBytes(24).toString("hex");
let child;
let accepted = false;
const showError = (res, message) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><meta charset="utf-8"><title>입력 확인</title><p>${message}</p><p><a href="/">입력창 다시 열기</a></p>`);
};
const server = http.createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.headers.host !== `127.0.0.1:${port}`) { res.writeHead(403).end(); return; }
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>오늘바당 로컬 API 연결</title><style>body{font:18px system-ui;max-width:620px;margin:60px auto;padding:20px;line-height:1.7}input,button{font:inherit;padding:12px;margin:8px 0;width:100%;box-sizing:border-box}</style><h1>오늘바당 로컬 API 연결</h1><p>공공데이터포털의 일반 인증키를 붙여넣으세요. 이 Mac의 실행 메모리에만 전달하며, 코드·파일·채팅·브라우저 저장소에 저장하지 않습니다.</p><p>인증키는 승인된 공공데이터 API 조회에만 사용합니다. 서버 종료 후 다시 입력해야 합니다.</p><form method="post" action="/connect" autocomplete="off"><input type="hidden" name="nonce" value="${nonce}"><label>일반 인증키 (Decoding 또는 Encoding)<input type="password" name="key" required autocomplete="off" maxlength="300"></label><button>로컬 서버에 연결</button></form></html>`);
    return;
  }
  if (req.method !== "POST" || req.url !== "/connect" || accepted) { showError(res, "입력창을 다시 열어 주세요."); return; }
  // Native in-app navigation may omit Origin. The one-time unpredictable form token
  // and exact Host check still reject cross-site submissions; reject explicit foreign origins.
  if (req.headers.origin && req.headers.origin !== "null" && req.headers.origin !== origin) {
    console.log("Key entry rejected: foreign origin (no key logged).");
    showError(res, "다른 주소에서 열린 입력창입니다. 아래 링크로 다시 열어 주세요."); return;
  }
  let body = "";
  req.on("data", (part) => { body += part; if (body.length > 4096) req.destroy(); });
  req.on("end", () => {
    const data = new URLSearchParams(body);
    let key = data.get("key")?.trim();
    if (data.get("nonce") !== nonce) {
      console.log("Key entry rejected: form token (no key logged).");
      showError(res, "이전 입력창이 만료되었습니다. 아래 링크로 새 입력창을 열어 주세요."); return;
    }
    if (!key || !/^[A-Za-z0-9+/%=_-]{16,300}$/.test(key)) {
      console.log("Key entry rejected: format (no key logged).");
      showError(res, "인증키 문자만 복사해 주세요. 설명 문구·줄바꿈·공백은 포함하지 않습니다."); return;
    }
    try { key = decodeURIComponent(key); } catch { showError(res, "Encoding 키 형식이 잘못되었습니다. Decoding 키를 복사해 주세요."); return; }
    accepted = true;
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3001"], {
      cwd: process.cwd(), env: { ...process.env, DATA_GO_KR_KEY: key, ONEULBADANG_LIVE_DEV: "1" }, stdio: ["ignore", "pipe", "pipe"],
    });
    // Suppress raw framework output; do not risk logging credential-bearing errors.
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
    child.on("exit", (code) => { console.log(`Local server exited (${code}).`); process.exit(code ?? 0); });
    key = undefined;
    body = "";
    console.log("Key accepted in memory; starting local app at http://127.0.0.1:3001");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end('<!doctype html><meta charset="utf-8"><title>연결 준비 완료</title><p>키를 메모리로 전달했습니다. 잠시 후 <a href="http://127.0.0.1:3001">오늘바당 열기</a>를 눌러 주세요.</p><p>이 입력 창은 닫아도 됩니다.</p>');
    server.close();
    clearTimeout(expiry);
  });
});
const expiry = setTimeout(() => { if (!accepted) server.close(); }, 30 * 60000);
server.listen(port, "127.0.0.1", () => console.log(`Local key entry: ${origin}`));
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { child?.kill("SIGTERM"); server.close(); process.exit(); });
