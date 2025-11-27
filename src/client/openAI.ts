import OpenAI from 'openai';

const LLM = {
  model: 'gpt-5-mini' as const,
  supportsCustomTemperature: false,
};

export interface Message {
  role: 'system' | 'user';
  content: string;
}

export async function openaiChat(messages: Message[]) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: LLM.model,
    messages,
    response_format: { type: 'json_object' },
  });

  return completion.choices[0]?.message?.content ?? '{}';
}
