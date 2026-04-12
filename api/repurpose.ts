import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a content repurposing expert for social media creators. Take a single script and transform it into multiple platform-specific formats.

Generate EXACTLY these 5 formats, using the exact markdown headers shown:

## Tweet Thread
A Twitter/X thread (3-7 tweets). Number each tweet. Keep under 280 characters each. Include relevant hashtags on the last tweet only.

## Carousel Slides
Instagram carousel text (5-8 slides). Number each slide. Keep each slide punchy, scannable — one key idea per slide.

## YouTube Short
A 60-second voiceover script. Tighter, punchier version of the original. Add [VISUAL CUE] hints in brackets for what should appear on screen.

## Podcast Talking Points
5-8 bullet points for discussing this topic conversationally. Include opener hooks and audience engagement questions.

## Newsletter Blurb
A 150-200 word email newsletter segment. Conversational tone. End with a clear CTA.

Rules:
- Maintain the creator's voice and core message
- Be creative with platform-specific conventions
- Make each format feel native to its platform, not like a copy-paste
- No preamble or explanation — jump straight into the first format`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { script, title, contentType } = req.body || {}

  if (!script?.trim()) {
    return res.status(400).json({ error: 'Script content is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const client = new Anthropic({ apiKey })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Repurpose this ${contentType || 'content'} script titled "${title || 'Untitled'}":\n\n${script}`,
        },
      ],
    })

    stream.on('text', (text: string) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    })

    await stream.finalMessage()
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: any) {
    if (!res.headersSent) {
      return res.status(500).json({
        error: error?.message || 'Failed to generate content',
      })
    }
    res.write(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`)
    res.end()
  }
}
