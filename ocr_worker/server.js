/**
 * ProcureAI OCR Worker
 * Tesseract.js microservice — no OS-level Tesseract installation required.
 * Runs on port 3001. Called by the Python FastAPI backend via HTTP.
 *
 * POST /ocr
 *   Body: { image: "<base64>", mimeType: "image/png" | "image/jpeg" }
 *   Response: { text: "...", confidence: 0-100 }
 */
const express = require('express');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// Initialize a single persistent Tesseract worker for efficiency
let worker = null;
let workerReady = false;

async function initWorker() {
  console.log('🔬 Initializing Tesseract.js worker...');
  worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r  OCR progress: ${Math.round(m.progress * 100)}%  `);
      }
    }
  });
  workerReady = true;
  console.log('\n✅ Tesseract.js worker ready');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', worker_ready: workerReady });
});

// OCR endpoint
app.post('/ocr', async (req, res) => {
  if (!workerReady) {
    return res.status(503).json({ error: 'OCR worker not ready yet. Please retry in a moment.' });
  }

  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Missing "image" field (base64 string)' });
  }

  try {
    // Decode base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');

    // Run OCR
    const result = await worker.recognize(imageBuffer);
    const text = result.data.text || '';
    const confidence = result.data.confidence || 0;

    console.log(`\n📄 OCR complete | Chars: ${text.length} | Confidence: ${confidence.toFixed(1)}%`);

    res.json({
      text: text.trim(),
      confidence: confidence,
      char_count: text.length
    });

  } catch (err) {
    console.error('OCR error:', err.message);
    res.status(500).json({ error: err.message, text: '' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (worker) {
    await worker.terminate();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (worker) {
    await worker.terminate();
  }
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 ProcureAI OCR Worker running on http://localhost:${PORT}`);
  console.log(`   Using Tesseract.js — no OS installation required`);
  await initWorker();
});
