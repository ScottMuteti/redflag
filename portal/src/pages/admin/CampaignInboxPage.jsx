/* eslint-disable react/prop-types -- local presentational components */
import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { getCampaignInbox } from '../../api/campaigns';
import { Badge, Button, EmptyState, ErrorCard, PageHeader, Skeleton } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime } from '../../lib/format';

// Render an SMS body with its tracking URL as a real, clickable link. The link
// opens the public tracking endpoint, which records the click and serves the
// debrief — exactly what a tap on a real handset would do. This is why the mock
// inbox exists: the AT sandbox simulator shows SMS as plain, non-tappable text.
function MessageBody({ body, url }) {
  if (!url || !body.includes(url)) return <>{body}</>;
  const parts = body.split(url);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-brand-600 underline underline-offset-2 break-all hover:text-brand-700"
        >
          {url}
        </a>
      )}
    </Fragment>
  ));
}

function Phone({ msg }) {
  const status = msg.clickedAt
    ? { tone: 'danger', label: 'Clicked' }
    : msg.sentAt
      ? { tone: 'neutral', label: 'Delivered' }
      : msg.sendFailedAt
        ? { tone: 'danger', label: 'Send failed' }
        : msg.sendAfter
          ? { tone: 'neutral', label: 'Queued' }
          : { tone: 'neutral', label: 'Not sent' };

  return (
    <div className="mx-auto w-full max-w-xs rounded-[2rem] border-4 border-ink/80 bg-ink/90 p-2 shadow-lg">
      <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-card">
        {/* Sender header, like a messaging app conversation */}
        <div className="flex items-center gap-2 border-b border-line bg-neutral-bg px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-700">
            <MessageSquare size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-label font-semibold text-ink">{msg.sender}</span>
            <span className="block truncate text-xs text-ink-3">SMS · {msg.phoneNumber || 'no number'}</span>
          </span>
        </div>
        {/* The message bubble */}
        <div className="flex-1 space-y-2 px-4 py-4">
          <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-neutral-bg px-3 py-2 text-body text-ink whitespace-pre-wrap">
            <MessageBody body={msg.body} url={msg.trackingUrl} />
          </div>
          <p className="text-xs text-ink-3">{msg.sentAt ? formatDateTime(msg.sentAt) : 'Not delivered yet'}</p>
        </div>
        {/* Recipient + outcome footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
          <span className="min-w-0 truncate text-xs text-ink-2">
            {msg.employeeName}
            {msg.departmentName ? ` · ${msg.departmentName}` : ''}
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>
    </div>
  );
}

function CampaignInboxPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useAsync(() => getCampaignInbox(id), [id]);

  if (error) return <ErrorCard message={error} onRetry={reload} />;
  const messages = data?.messages || [];

  return (
    <>
      <PageHeader
        title={data?.campaign?.name ? `${data.campaign.name} — phone preview` : 'Phone preview'}
        subtitle="The exact SMS each recipient received, with a clickable tracking link. Tapping a link records the click and opens the debrief, just like a real handset."
        actions={
          <Button as={Link} to={`/admin/campaigns/${id}`} icon={ArrowLeft}>
            Back to results
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-[2rem]" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Launch this SMS campaign to see the messages recipients receive."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {messages.map((msg, i) => (
            <Phone key={`${msg.phoneNumber}-${i}`} msg={msg} />
          ))}
        </div>
      )}
    </>
  );
}

export default CampaignInboxPage;
