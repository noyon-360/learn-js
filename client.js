const net = require('net');

const SERVER_IP = '127.0.0.1';
const SERVER_PORT = 3000;

const REQUEST_BUFFER = Buffer.from(
  'GET / HTTP/1.1\r\n' +
  'Host: localhost:3000\r\n' +
  'Connection: close\r\n' +
  '\r\n'
);

const socket = new net.Socket();

socket.connect(SERVER_PORT, SERVER_IP, () => {
  socket.write(REQUEST_BUFFER);
});

socket.on('data', (data) => console.log(data.toString()));
socket.on('end', () => console.log('Connection closed'));
socket.on('error', (err) => console.error('Could not connect:', err.message));
