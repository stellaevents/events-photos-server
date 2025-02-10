require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const mime = require('mime-types'); // Cambia esta línea

const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain'
  };
  return types[ext] || 'application/octet-stream';
};

// Middlewares
app.use(cors());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  abortOnLimit: true
}));

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Endpoint de subida
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const files = req.files.file; // Cambiar a array de archivos
  const uploadResults = [];

  // Si solo se sube 1 archivo, convertirlo en array
  const filesArray = Array.isArray(files) ? files : [files];

  filesArray.forEach((file) => {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    file.mv(filePath, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error saving file' });
      }
      
      uploadResults.push({
        filename: fileName,
        size: file.size,
        mimetype: file.mimetype
      });

      // Cuando todos los archivos se han procesado
      if (uploadResults.length === filesArray.length) {
        res.json({
          message: 'Files uploaded successfully',
          files: uploadResults
        });
      }
    });
  });
});

// Endpoint para listar archivos

// app.get('/files', (req, res) => {
//   fs.readdir(uploadsDir, async (err, filenames) => {
//     if (err) return res.status(500).json({ error: 'Error reading directory' });
    
//     const filesData = await Promise.all(
//       filenames.map(async filename => {
//         const stats = await fs.promises.stat(path.join(uploadsDir, filename));
//         return {
//           filename,
//           size: stats.size,
//           mimetype: mime.default?.getType(filename) || 'application/octet-stream',
//           uploadedAt: stats.birthtime
//         };
//       })
//     );
    
//     res.json(filesData);
//   });
// });

app.get('/files', (req, res) => {
  fs.readdir(uploadsDir, async (err, filenames) => {
    if (err) return res.status(500).json({ error: 'Error reading directory' });
    
    const filesData = await Promise.all(
      filenames.map(async filename => {
        const stats = await fs.promises.stat(path.join(uploadsDir, filename));
        return {
          filename,
          size: stats.size,
          // Usar content-type en lugar de mimetype
          mimetype: getFileType(filename),
          uploadedAt: stats.birthtime
        };
      })
    );
    
    res.json(filesData);
  });
});

// Agregar nuevo endpoint DELETE
app.delete('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error deleting file' });
    }
    res.json({ message: 'File deleted successfully' });
  });
});

// Servir archivos estáticos
app.use('/files', express.static(uploadsDir));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});