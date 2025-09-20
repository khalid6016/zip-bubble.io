import formidable from "formidable";
import fs from "fs";
import archiver from "archiver";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const form = new formidable.IncomingForm({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: "File parsing error" });
      return;
    }

    const file = files.uploadedFile;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const zipPath = path.join(tempDir, `${Date.now()}-file.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      const zippedFile = fs.readFileSync(zipPath);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=file.zip");
      res.send(zippedFile);

      // Remove temp file
      fs.unlinkSync(zipPath);
      fs.unlinkSync(file.filepath);
    });

    archive.on("error", (err) => {
      res.status(500).json({ error: "Zip error", details: err.message });
    });

    archive.pipe(output);
    archive.file(file.filepath, { name: file.originalFilename });
    archive.finalize();
  });
};
