// pages/api/llm-suggest.js
import { invokeLLM } from './llm';

export default async function handler(req, res) {
  const { transcript, model, context = 'General Medicine' } = req.body;

  if (!transcript || !model) {
    return res.status(400).json({ error: 'Transcript and model are required' });
  }

  console.log('🧠 Getting suggestions from LLM for:', transcript);

  const prompt = `
You are a clinical assistant LLM specializing in ${context}. Given the partial transcription of a conversation with a patient, suggest 1-2 relevant follow-up questions or clinical probes for the doctor to ask.

Partial Transcript:
"${transcript}"

Format your response as a bullet list of only 2 to 3 questions or probes.`;

try {
  const suggestions = await invokeLLM(prompt, model, false);
  res.status(200).json({ suggestions });
} catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Failed to generate suggestions.' });
}
}
