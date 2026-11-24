// POST .../templates/assist — returns a suggested rewrite; nothing is saved.
// The admin compares it with their version and chooses whether to use it.
const rateLimit = require('express-rate-limit');
const { rewriteTemplate, TemplateWriterError } = require('../../integrations/ai/templateWriter');

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_BODY = 20_000;
const MAX_GUIDANCE = 500;

const assistLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many assistant requests; wait a minute' },
});

async function assist(req, res, next) {
  const { mode, type, category, difficultyLevel, subject, body, guidance } = req.body;
  if (!['regenerate', 'refine'].includes(mode)) {
    return res.status(400).json({ message: 'mode must be regenerate or refine' });
  }
  if (!['email', 'sms'].includes(type)) {
    return res.status(400).json({ message: 'type must be email or sms' });
  }
  if (typeof body !== 'string' || !body.trim() || body.length > MAX_BODY) {
    return res.status(400).json({ message: 'body is required (max 20,000 characters)' });
  }
  if (guidance && (typeof guidance !== 'string' || guidance.length > MAX_GUIDANCE)) {
    return res.status(400).json({ message: 'guidance must be under 500 characters' });
  }
  if (difficultyLevel && !DIFFICULTIES.includes(difficultyLevel)) {
    return res.status(400).json({ message: 'difficultyLevel must be easy, medium or hard' });
  }

  try {
    const draft = await rewriteTemplate({
      mode,
      type,
      category: typeof category === 'string' ? category.slice(0, 60) : undefined,
      difficultyLevel,
      subject: typeof subject === 'string' ? subject.slice(0, 300) : '',
      body,
      guidance: guidance?.trim(),
    });
    return res.json(draft);
  } catch (err) {
    if (err instanceof TemplateWriterError) {
      return res.status(err.status).json({ message: err.message });
    }
    return next(err);
  }
}

module.exports = { assistLimiter, assist };
