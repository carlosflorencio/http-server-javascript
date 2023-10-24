const net = require("net");

const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
    server.close();
  });

  socket.on("data", (data) => {
    const request = Request.fromBuffer(data);
    const response = new Response(request);

    handlers(request, response)

    response.writeToSocket(socket)
  })
});

server.listen(4221, "localhost");

server.on("error", err => {
  console.error(err)
})

function handlers(req, res) {
  if (req.path === "/") {
    res.setStatus(200)
    return
  }

  if (/^\/echo\/.*/.test(req.path)) {
    res.setBody(Buffer.from(req.path.slice(6)))
    return
  }

  res.setStatus(404)
}

class Request {
  constructor(method, path, proto, headers, body) {
    this.method = method;
    this.path = path;
    this.proto = proto;
    this.headers = headers;
    this.body = body;
  }

  /**
  * @param {Uint8Array} buffer
  */
  static fromBuffer(buffer) {
    const firstLine = buffer.toString().split("\r\n")[0];
    const [method, path, proto] = firstLine.split(" ");

    return new Request(method, path, proto, {}, null)
  }
}

class Response {
  constructor(request) {
    this.req = request
    this.status = 200
    this.headers = {
      "Content-Type": "text/plain"
    }
    this.body = null
  }

  setStatus(status) {
    this.status = status
    return this
  }

  setHeaders(key, value) {
    this.headers[key] = value
    return this
  }

  /**
  * @param {Uint8Array} body
  */
  setBody(body) {
    this.body = body
    this.headers["Content-Length"] = body.length
    return this
  }

  /**
  * @param {net.Socket} socket
  */
  writeToSocket(socket) {
    let payload = `${this.req.proto} ${this.status} ${statusString(this.status)}\r\n`;
    let headers = Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join("\r\n");
    payload += headers + "\r\n\r\n";

    if (this.body) {
      payload += this.body;
    }

    socket.end(payload)
  }
}

function statusString(status) {
  switch (status) {
    case 200:
      return "OK"
    case 404:
      return "Not Found"
    default:
      return "Unknown"
  }
}


