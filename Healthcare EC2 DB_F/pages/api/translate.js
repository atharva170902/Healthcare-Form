import bhashiniService from '../../lib/bhashiniService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, sourceLang = 'en', targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const translatedText = await bhashiniService.translateText(text, sourceLang, targetLang);
    res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
}