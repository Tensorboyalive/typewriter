// AI endpoint disabled — not needed for current release.
// Re-enable when AI features are activated.

export default async function handler(_req: any, res: any) {
  return res.status(503).json({ error: 'AI features are currently disabled' })
}
