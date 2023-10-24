const net = require("net");
const path = require("path")
const fs = require("fs");

const DIRECTORY = process.argv?.[3]

const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
  });

  socket.on("data", (data) => {
    const request = Request.fromBuffer(data);
    const response = new Response(request, socket);

    handlers(request, response)
  })
});

server.listen(4221, "localhost");

server.on("error", err => {
  console.error(err)
})

function handlers(req, res) {
  if (req.path === "/") {
    res.setStatus(200)
    res.end()
    return
  }

  if (/^\/echo\/.+/.test(req.path)) {
    res.setBody(Buffer.from(req.path.slice(6)))
    res.end()
    return
  }

  if (req.path === "/user-agent") {
    res.setBody(Buffer.from(req.headers["User-Agent"]))
    res.end()
    return
  }

  if (/^\/files\/.+/.test(req.path)) {
    const filename = req.path.split("/")[2]
    const filePath = path.join(DIRECTORY, filename)

    if (req.method === "GET") {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.setStatus(404)
          res.end()
          return
        }

        res.setHeader("Content-Type", "application/octet-stream")
        res.setBody(data)
        res.end()
      })
    } else {
      fs.writeFile(filePath, req.body, (err) => {
        if (err) {
          res.setStatus(500)
          res.end()
          return
        }

        res.setStatus(201)
        res.end()
      })
    }

    return
  }

  res.setStatus(404)
  res.end()
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
    const contents = buffer.toString().split("\r\n");
    const firstLine = contents[0];
    const [method, path, proto] = firstLine.split(" ");

    const headers = {};
    for (let i = 1; i < contents.length; i++) {
      const [key, value] = contents[i].split(": ");
      headers[key] = value
    }

    const body = contents[contents.length - 1] ? contents[contents.length - 1] : null;

    return new Request(method, path, proto, headers, body);
  }
}

class Response {
  constructor(request, socket) {
    this.req = request
    this.status = 200
    this.headers = {
      "Content-Type": "text/plain"
    }
    this.body = null
    this.socket = socket
  }

  setStatus(status) {
    this.status = status
    return this
  }

  setHeader(key, value) {
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

  end() {
    let payload = `${this.req.proto} ${this.status} ${statusString(this.status)}\r\n`;
    let headers = Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join("\r\n");
    payload += headers + "\r\n\r\n";

    if (this.body) {
      payload += this.body;
    }

    this.socket.end(payload)
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


