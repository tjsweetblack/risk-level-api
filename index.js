require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze-risk', upload.single('image'), async (req, res) => {
  console.log('Received POST /analyze-risk');
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Missing title or description' });
  }
  try {
    const imageBytes = req.file.buffer;
    const prompt = `Analyze the image and report to assess the risk level of mosquito breeding, taking into account the following title: '${title}' and description: '${description}'. Rate the risk level on a scale of 1 to 3, where 1 is low risk, 2 is medium risk, and 3 is high risk. Respond with only a single number (1, 2, or 3) indicating the risk level.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const content = [
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: imageBytes.toString('base64') } }
    ];
    const result = await model.generateContent({ contents: [{ role: 'user', parts: content }] });
    const output = result.response.text().trim();
    const riskLevel = parseInt(output, 10);
    if ([1, 2, 3].includes(riskLevel)) {
      res.json({ riskLevel });
    } else {
      res.status(200).json({ riskLevel: 1, warning: 'AI did not return a valid number, defaulted to 1', aiResponse: output });
    }
  } catch (e) {
    console.error('Error in /analyze-risk:', e);
    res.status(500).json({ error: 'Erro ao analisar o risco: ' + e.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
