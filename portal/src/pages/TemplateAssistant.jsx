/* eslint-disable react/prop-types -- page-local components */
import { useState } from 'react';
import { Sparkles, Undo2, Wand2 } from 'lucide-react';
import { Badge, Button, Modal, Textarea, useToast } from '../components/ui';
import { cn } from '../lib/cn';

const errorOf = (err, fallback) => err.response?.data?.message || fallback;

// Word-level diff (LCS). Returns null for very long texts, shown without highlights.
function diffWords(before, after) {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  if (a.length * b.length > 400_000) return null;
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ text: a[i], kind: 'same' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ text: a[i], kind: 'removed' });
      i += 1;
    } else {
      out.push({ text: b[j], kind: 'added' });
      j += 1;
    }
  }
  a.slice(i).forEach((text) => out.push({ text, kind: 'removed' }));
  b.slice(j).forEach((text) => out.push({ text, kind: 'added' }));
  return out;
}

function DiffText({ before, after, side, inline = false }) {
  const Tag = inline ? 'span' : 'p';
  const parts = diffWords(before, after);
  const text = side === 'before' ? before : after;
  const hidden = side === 'before' ? 'added' : 'removed';
  return (
    <Tag className={cn('break-words whitespace-pre-wrap text-ink', !inline && 'text-body')}>
      {parts
        ? parts
            .filter((p) => p.kind !== hidden)
            .map((p, i) => (
              <span
                key={i}
                className={cn(
                  p.kind === 'removed' && 'rounded-sm bg-danger-bg text-danger line-through',
                  p.kind === 'added' && 'rounded-sm bg-success-bg text-success',
                )}
              >
                {p.text}
              </span>
            ))
        : text}
    </Tag>
  );
}

function Version({ label, tone, subject, beforeSubject, body, beforeBody, side, isEmail }) {
  return (
    <div className="min-w-0 rounded-card border border-line p-3">
      <div className="mb-2">
        <Badge tone={tone}>{label}</Badge>
      </div>
      {isEmail && (
        <div className="mb-2 border-b border-line pb-2 text-xs text-ink-3">
          Subject:{' '}
          <strong className="font-semibold">
            <DiffText inline before={beforeSubject} after={subject} side={side} />
          </strong>
        </div>
      )}
      <DiffText before={beforeBody} after={body} side={side} />
    </div>
  );
}

// Before/after view of a suggestion. Nothing changes unless the admin picks it.
function CompareModal({ suggestion, current, isEmail, onUse, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={suggestion.mode === 'refine' ? 'Refined version' : 'Regenerated version'}
      description={suggestion.notes}
      footer={
        <>
          <Button onClick={onClose}>Keep mine</Button>
          <Button variant="primary" onClick={onUse} data-autofocus>
            Use this version
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Version
          label="Before"
          tone="neutral"
          side="before"
          isEmail={isEmail}
          subject={suggestion.subject}
          beforeSubject={current.subject}
          body={suggestion.body}
          beforeBody={current.body}
        />
        <Version
          label="After"
          tone="success"
          side="after"
          isEmail={isEmail}
          subject={suggestion.subject}
          beforeSubject={current.subject}
          body={suggestion.body}
          beforeBody={current.body}
        />
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Red strikethrough is removed, green is added. Using it fills the editor; press Save to keep
        it.
      </p>
    </Modal>
  );
}

// Guidance chat for a template. Regenerate writes a fresh take; Refine polishes
// the current (possibly hand-edited) wording. Each reply is reviewed before use.
export default function TemplateAssistant({ template, form, onApply, assist }) {
  const toast = useToast();
  const [guidance, setGuidance] = useState('');
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [undo, setUndo] = useState(null);
  const isEmail = template.type === 'email';

  async function ask(mode) {
    if (!form.body.trim()) return toast.error('Write a message first');
    const words = guidance.trim();
    setBusy(mode);
    try {
      const draft = await assist({
        mode,
        type: template.type,
        category: template.category,
        difficultyLevel: form.difficultyLevel,
        subject: form.subject,
        body: form.body,
        guidance: words || undefined,
      });
      const suggestion = { ...draft, mode, guidance: words, id: Date.now() };
      setThread((t) => [...t, suggestion]);
      setGuidance('');
      setReviewing(suggestion);
    } catch (err) {
      toast.error(errorOf(err, 'The assistant could not respond'));
    } finally {
      setBusy(null);
    }
    return undefined;
  }

  function use(suggestion) {
    setUndo({ subject: form.subject, body: form.body });
    onApply({ subject: isEmail ? suggestion.subject : form.subject, body: suggestion.body });
    setReviewing(null);
    toast.success('Applied to the editor. Save to keep it');
  }

  return (
    <section
      className="rounded-card border border-line bg-page p-3"
      aria-label="Template assistant"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-label font-semibold text-ink">
          <Sparkles size={15} aria-hidden="true" className="text-brand-700" /> Assistant
        </p>
        {undo && (
          <Button
            size="sm"
            variant="ghost"
            icon={Undo2}
            onClick={() => {
              onApply(undo);
              setUndo(null);
            }}
          >
            Undo apply
          </Button>
        )}
      </div>

      {thread.length > 0 && (
        <ol className="mb-3 grid max-h-56 gap-2 overflow-y-auto">
          {thread.map((s) => (
            <li key={s.id} className="grid gap-1">
              <p className="justify-self-end rounded-card rounded-br-sm bg-brand-50 px-3 py-1.5 text-xs text-ink">
                {s.mode === 'refine' ? 'Refine' : 'Regenerate'}
                {s.guidance && <>: {s.guidance}</>}
              </p>
              <div className="flex items-start gap-2 rounded-card rounded-bl-sm bg-card px-3 py-2 shadow-card">
                <p className="flex-1 text-xs text-ink-2">{s.notes}</p>
                <Button size="sm" onClick={() => setReviewing(s)}>
                  Review
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Textarea
        rows={2}
        value={guidance}
        maxLength={500}
        onChange={(e) => setGuidance(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !busy) {
            e.preventDefault();
            ask('regenerate');
          }
        }}
        placeholder="Guiding words, e.g. more urgent, KRA deadline, friendlier tone"
        aria-label="Guidance for the assistant"
      />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          icon={Wand2}
          loading={busy === 'refine'}
          disabled={!!busy}
          onClick={() => ask('refine')}
        >
          Refine my edits
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={Sparkles}
          loading={busy === 'regenerate'}
          disabled={!!busy}
          onClick={() => ask('regenerate')}
        >
          Regenerate
        </Button>
      </div>

      {reviewing && (
        <CompareModal
          suggestion={reviewing}
          current={form}
          isEmail={isEmail}
          onUse={() => use(reviewing)}
          onClose={() => setReviewing(null)}
        />
      )}
    </section>
  );
}
