# Raw HTTP over TCP

A tiny web server, and a client that talks to it **without any HTTP library** —
no `fetch`, no `axios`, not even Node's built-in `http` module. Just a network
socket and the right bytes.

The point is to see what a web request actually is: a few lines of plain text
sent over a connection. Everything else is built on top of this.

---

## Part 1 — Before you start

You need **Node.js**. Node lets you run JavaScript outside the browser, in a
terminal. Check whether you already have it:

```bash
node -v
npm -v
```

If both print version numbers (anything `18.x` or higher is fine), skip ahead.

If you get `command not found`, install it:

- **Any system:** download the **LTS** version from <https://nodejs.org> and run
  the installer. LTS means "long-term support" — the stable one.
- **macOS with Homebrew:** `brew install node`
- **Windows:** the installer from nodejs.org, or `winget install OpenJS.NodeJS.LTS`
- **Linux (Debian/Ubuntu):** `sudo apt install nodejs npm`

**Close and reopen your terminal afterwards**, then run `node -v` again. A new
`PATH` only reaches terminals opened after the install.

`npm` comes bundled with Node — it's the package manager, the tool that
downloads libraries other people wrote.

### A terminal, briefly

You'll be typing commands into a terminal (Terminal on macOS, PowerShell on
Windows, or the panel inside VS Code: **View → Terminal**). Two commands are
enough to get around:

```bash
cd some/folder   # change directory — move into a folder
ls               # list files here  (Windows PowerShell: dir)
```

---

## Part 2 — Setting up this project

If you already have this folder with the files in it, run **one** command:

```bash
npm install
```

That reads `package.json`, downloads Express, and creates a `node_modules/`
folder. You only do this once. If you see a `node_modules` folder already, you
can skip even that.

<details>
<summary>Building it from scratch instead (click to expand)</summary>

```bash
mkdir learn && cd learn   # create a folder and move into it
npm init -y               # creates package.json — the project's ID card
npm install express       # downloads Express into node_modules/
```

Then create `server.js` and `client.js` and paste in the code from this repo.

You should end up with:

```
learn/
├── node_modules/      ← downloaded libraries (never edit, never commit)
├── package.json       ← project name, scripts, list of dependencies
├── package-lock.json  ← exact versions, so installs are reproducible
├── server.js
└── client.js
```

Note the spelling: `node_modules` with an **underscore**. And `npm install
express` is enough — the old `-S` / `--save` flag has been the default since
npm 5.
</details>

---

## Part 3 — Running it

This project needs **two terminals open at the same time**, because the server
keeps running and never exits. In VS Code, click the **`+`** in the terminal
panel to open a second one. Both must be in the project folder.

### Terminal 1 — start the server

```bash
npm start
```

You should see:

```
Server is running on Port 3000
```

The cursor then just sits there. **That's correct** — the server is waiting for
requests. Leave this terminal alone.

### Terminal 2 — run the client

```bash
npm run client
```

---

## Part 4 — What "done" looks like

Terminal 2 should print this, then return you to the prompt:

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 12
ETag: W/"c-Lve95gjOVATpfV8EL5X4nxwjKHE"
Date: Sat, 17 Oct 2026 10:49:15 GMT
Connection: close

Hello World!
Connection closed
```

If you see that, **the project is complete.** You wrote an HTTP request by hand
and a real web server answered it.

Reading the output:

| Line | Meaning |
| --- | --- |
| `HTTP/1.1 200 OK` | The status line. `200` means success. |
| `Content-Type` | The body is HTML text, encoded as UTF-8. |
| `Content-Length: 12` | The body is 12 bytes — `Hello World!` is 12 characters. This is how the client knows where the response ends. |
| *(blank line)* | Separates the headers from the body. |
| `Hello World!` | The body — what the server actually sent back. |
| `Connection closed` | Printed by our own code when the server hung up. |

### Stopping the server

In Terminal 1, press **Ctrl + C**. That's how you stop any running program in a
terminal.

---

## When it doesn't work

**`Error: connect ECONNREFUSED 127.0.0.1:3000`**
Nothing is listening on port 3000 — the server isn't running. Start it in
Terminal 1 *first*, then run the client. "Connection refused" means the address
was reachable but no program was there to answer.

**`Port 3000 is already in use.`**
A server is already running, probably in a terminal you forgot about. Either use
that one, or stop it with Ctrl + C. To find it:
`lsof -nP -iTCP:3000 -sTCP:LISTEN` (macOS/Linux).

**`Cannot find module 'express'`**
You skipped `npm install`, or you're in the wrong folder. Run `ls` and check you
can see `package.json`.

**`command not found: node`**
Node isn't installed, or your terminal was open before you installed it. Reopen
the terminal.

**Nothing happens / it hangs**
If the client prints the response but takes about 5 seconds to return, the
`Connection: close` header is missing from the request. See below.

---

## How it actually works

### The server (`server.js`)

```js
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello World!'));
```

`require` loads a library. `app.get('/', ...)` says: when someone sends a `GET`
request for the path `/`, run this function and reply `Hello World!`.

### The client (`client.js`)

An HTTP request is plain text. Every line ends with `\r\n` (called CRLF — a
carriage return plus a newline, the line ending the HTTP spec requires):

```
GET / HTTP/1.1\r\n          ← request line: method, path, version
Host: localhost:3000\r\n    ← required in HTTP/1.1 — without it you get 400
Connection: close\r\n       ← tells the server to hang up after replying
\r\n                        ← blank line: "headers finished"
```

So the request ends with **two** CRLFs — the last header's own, plus the empty
line. `Buffer.from(...)` turns that text into the raw bytes a socket sends,
because networks move bytes, not JavaScript strings.

Then we open a socket, send those bytes, and print whatever comes back:

```js
const socket = new net.Socket();
socket.connect(SERVER_PORT, SERVER_IP, () => socket.write(REQUEST_BUFFER));
socket.on('data', (data) => console.log(data.toString()));
```

`net` is built into Node — nothing to install. `.connect()` opens the
connection, and its callback runs once the connection is established, which is
why the write happens inside it.

Why `Connection: close`? HTTP/1.1 keeps connections open by default, so it can
reuse them for more requests. Without that header the response arrives
immediately but the socket stays open for about 5 seconds before timing out.

### One Node rule worth memorising

Sockets and servers emit events. If an **`'error'`** event fires and nothing is
listening for it, Node crashes the whole program with a stack trace. That's why
both files attach one — the client to its socket:

```js
socket.on('error', (err) => console.error('Could not connect:', err.message));
```

and the server to its listener, which is how you get a readable "port already in
use" message instead of a crash. Always attach an error listener.

---

## Experiments

Each is a one-line change to `client.js`. Restart the client after each
(the server can keep running).

1. Delete the `Host` header → `400 Bad Request`. It really is mandatory.
2. Change `GET / HTTP/1.1` to `GET /nope HTTP/1.1` → `404 Not Found`.
3. Change `GET` to `POST` → also `404`, because only `app.get('/')` exists. The
   method is part of the route.
4. Remove `Connection: close` → the response arrives, then a ~5 second pause.
5. Add `app.get('/json', (req, res) => res.json({ ok: true }))` to the server,
   restart it, and request `/json` → `Content-Type` becomes `application/json`.

Do at least 1 and 4. Watching a request fail in a *specific* way teaches the
protocol better than one that succeeds.

---

## What you've learned

`fetch()` and `axios` do exactly what `client.js` does: open a TCP connection,
write those text lines, read the bytes back, and parse them into an object.
HTTP is a text protocol riding on TCP. Nothing more.
