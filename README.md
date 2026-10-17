# Raw HTTP over TCP

A minimal Express server and a hand-written HTTP client built on Node's `net`
module. The point is to send an HTTP request **without** `fetch`, `axios`, or
even Node's `http` module — just a TCP socket and the right bytes.

## Files

| File | What it is |
| --- | --- |
| `server.js` | Express server on port 3000, one route: `GET /` → `Hello World!` |
| `client.js` | Raw TCP client that writes an HTTP request by hand and prints the response |

## Running it

Two terminals, server first — the listener has to exist before the client knocks.

```bash
npm start     # terminal 1 → Server is running on Port 3000
npm run client # terminal 2
```

Expected client output:

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 12
ETag: W/"c-Lve95gjOVATpfV8EL5X4nxwjKHE"
Date: ...
Connection: close

Hello World!
Connection closed
```

## How the request is built

An HTTP/1.1 request is plain ASCII, with every line ending in CRLF (`\r\n`):

```
GET / HTTP/1.1\r\n          request line: method, path, version
Host: localhost:3000\r\n    mandatory in HTTP/1.1 — without it you get 400
Connection: close\r\n       tells the server to hang up after responding
\r\n                        blank line: "headers done, no body follows"
```

So the request ends in **two** CRLFs — the last header's own, plus the empty
line. `Buffer.from(...)` encodes that string to the bytes the socket sends.

Without `Connection: close`, HTTP/1.1 defaults to keep-alive: the response
arrives, then the socket idles for about 5 seconds until Express's keep-alive
timeout fires.

## Things worth knowing

- `net` is a core module — `require('net')`, lowercase, nothing to install.
- Sockets are `EventEmitter`s. An `'error'` event with no listener is thrown as
  an uncaught exception and kills the process. Always attach `socket.on('error')`.
- `'data'` hands you a `Buffer`, so `.toString()` it. A real client would
  accumulate chunks until it had the full body.
- `Content-Length: 12` is how a client knows where the body ends.

## Experiments

Each is a one-line change to `client.js`:

1. Delete the `Host` header → `400 Bad Request`.
2. Request `/nope` → `404` with Express's HTML error page.
3. Change `GET` to `POST` → `404`, because only `app.get('/')` is registered.
4. Remove `Connection: close` → response arrives, then a ~5s pause.
5. Add `app.get('/json', (req, res) => res.json({ ok: true }))` to the server
   and request `/json` → `Content-Type` becomes `application/json`.

Do at least 1 and 4. Seeing a request fail in a specific way teaches the
protocol better than one that succeeds.
