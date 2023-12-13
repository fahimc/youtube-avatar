const express = require("express");
const { WebSocketServer } = require("ws");
const { exec } = require("child_process");
const fs = require("fs");
const app = express();
const port = 6000;
const path = require("path");

// Create HTTP server with Express
app.listen(port, () => console.log(`Server running on port ${port}`));

// Create a WebSocket Server
const wss = new WebSocketServer({ port: 8080 });

let isGenerating = false;

wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
    console.log(message == "ping");
    if (message == "ping") {
      ws.send(JSON.stringify({ isGenerating }));
      return;
    }

    // Parse the message
    const { content, filename } = JSON.parse(message);
    if (filename) {
      isGenerating = true;
      const filePath = path.resolve("public", `${filename}.txt`);
      fs.writeFileSync(filePath, content);

      // Execute the Python script
      exec(
        `python utils/ms-text-to-speech.py ${filePath} ${path.resolve(
          "public/",
          `${filename}.mp3`
        )}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            ws.send(JSON.stringify({ isGenerating: false }));
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          exec(
            `python utils/transcript.py ${path.resolve(
              "public/",
              `${filename}.mp3`
            )} ${path.resolve("public/", `${filename}-transcript.json`)}`,
            (error, stdout, stderr) => {
              if (error) {
                console.error(`exec error: ${error}`);
                ws.send(JSON.stringify({ isGenerating: false }));
                return;
              }
              console.log(`stdout: ${stdout}`);
              console.error(`stderr: ${stderr}`);
              isGenerating = false;
              // Send completion message
              ws.send(JSON.stringify({ isGenerating: false }));
            }
          );
        }
      );
    }
  });
});
