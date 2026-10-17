const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => res.send('Hello World!'));

const server = app.listen(PORT);

server.on('listening', () =>
  console.log(`Server is running on Port ${PORT}`)
);

// Same lesson as the client: an unhandled 'error' event kills the process.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is another server running?`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
