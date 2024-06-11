const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors("*"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadBundleId = req.headers["x-upload-bundle-id"];
    const inputFilePath = path.join(__dirname, "uploads", uploadBundleId);

    fs.mkdir(inputFilePath, { recursive: true }, (err) => {
      if (err) {
        console.error("Error creating directory:", err);
      }
    });
    cb(null, inputFilePath);
  },
});
const upload = multer({ storage: storage });
const uploadSessions = new Map();

app.post("/upload", upload.single("chunk"), async (req, res) => {
  const { chunkIndex, totalChunks, fileName, uploadId } = req.body;
  const chunkPath = req.file.path;

  if (!uploadSessions.has(uploadId)) {
    uploadSessions.set(uploadId, {
      chunks: new Map(),
      totalChunks: Number(totalChunks),
      fileName: fileName,
    });
  }

  const session = uploadSessions.get(uploadId);
  session.chunks.set(Number(chunkIndex), chunkPath);

  if (session.chunks.size == totalChunks) {
    const finalFilePath = path.join(__dirname, "uploads", uploadId, fileName);
    let writeStream = fs.createWriteStream(finalFilePath, { flags: "w" });
    for (let chunk of session.chunks.values()) {
      const data = fs.readFileSync(chunk);
      writeStream.write(data);
    }
    writeStream.end();
    uploadSessions.clear();
  }

  res.status(200).send("Chunk uploaded");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
