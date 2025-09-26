// server.js - Un servidor web simple para desarrollo local
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 3000;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Parsear la URL correctamente
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Normalizar la URL solicitada
  let filePath = "." + pathname;
  if (filePath === "./") {
    filePath = "./index.html";
  }
  
  // Manejar parámetros de versión ya está incluido en el parseo de URL
  
  // Leer el archivo
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Archivo no encontrado
        fs.readFile("./index.html", (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end("Error: " + err.code);
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(content, "utf-8");
          }
        });
      } else if (err.code === "EISDIR") {
        // Es un directorio, intentar cargar index.html dentro del directorio
        const indexPath = path.join(filePath, "index.html");
        fs.readFile(indexPath, (err, content) => {
          if (err) {
            // No hay index.html en el directorio, redirigir a la ra�z
            fs.readFile("./index.html", (err, content) => {
              if (err) {
                res.writeHead(500);
                res.end("Error: " + err.code);
              } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(content, "utf-8");
              }
            });
          } else {
            // Encontramos index.html en el directorio
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(content, "utf-8");
          }
        });
      } else {
        // Error de servidor
        res.writeHead(500);
        res.end("Error: " + err.code);
      }
    } else {
      // Respuesta exitosa
      const extname = path.extname(filePath);
      let contentType = MIME_TYPES[extname] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
  
}).listen(PORT);

console.log(`Servidor ejecut�ndose en http://localhost:${PORT}`);
console.log("Para detener el servidor: presiona Ctrl + C");
