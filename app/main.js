const net = require("net");

const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
    server.close();
  });

  socket.on("data", () => {
    socket.end("HTTP/1.1 200 OK\r\n\r\n")
  })
});

server.listen(4221, "localhost");

server.on("error", err => {
  console.error(err)
})
