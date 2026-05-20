"""
Получение Access Token для DonationAlerts через OAuth2.

Использование:
  1. На https://www.donationalerts.com/application/clients открой своё приложение
  2. В «Redirect URI» добавь:  http://localhost:8765/callback
  3. Скопируй Client ID и Client Secret
  4. Запусти:
       python3 get_da_token.py <CLIENT_ID> <CLIENT_SECRET>
  5. В браузере откроется страница DA — авторизуйся и подтверди.
  6. Скрипт распечатает access_token и refresh_token.

Скопируй access_token в DONATIONALERTS_TOKEN в .env.
"""

import json
import ssl
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

import certifi
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


REDIRECT = "http://localhost:8765/callback"
SCOPES = "oauth-user-show oauth-donation-index oauth-donation-subscribe"


class CallbackHandler(BaseHTTPRequestHandler):
    code_holder = {}

    def do_GET(self):
        if not self.path.startswith("/callback"):
            self.send_response(404)
            self.end_headers()
            return
        qs = urllib.parse.urlparse(self.path).query
        params = dict(urllib.parse.parse_qsl(qs))
        CallbackHandler.code_holder["code"] = params.get("code")
        CallbackHandler.code_holder["error"] = params.get("error")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            "<h2>Готово. Можно закрыть вкладку и вернуться в терминал.</h2>".encode("utf-8")
        )

    def log_message(self, *_):
        pass


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 get_da_token.py <CLIENT_ID> <CLIENT_SECRET>")
        sys.exit(1)
    client_id, client_secret = sys.argv[1], sys.argv[2]

    auth_url = (
        "https://www.donationalerts.com/oauth/authorize?"
        + urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": REDIRECT,
            "response_type": "code",
            "scope": SCOPES,
        })
    )
    print("Откройте в браузере (если не открылось автоматически):")
    print(auth_url)
    print()

    server = HTTPServer(("localhost", 8765), CallbackHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    webbrowser.open(auth_url)

    print("Жду редирект на http://localhost:8765/callback ...")
    while "code" not in CallbackHandler.code_holder:
        pass
    server.shutdown()

    if CallbackHandler.code_holder.get("error"):
        print("ERROR:", CallbackHandler.code_holder["error"])
        sys.exit(2)

    code = CallbackHandler.code_holder["code"]
    print(f"Получен code: {code[:10]}...")

    body = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": REDIRECT,
        "scope": SCOPES,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://www.donationalerts.com/oauth/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
        payload = json.loads(r.read().decode("utf-8"))

    print()
    print("=== Скопируйте в .env: ===")
    print(f"DONATIONALERTS_TOKEN={payload['access_token']}")
    print()
    print("Refresh token (на случай протухания через 24ч):")
    print(payload.get("refresh_token", ""))


if __name__ == "__main__":
    main()
