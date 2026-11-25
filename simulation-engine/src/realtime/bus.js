// In-process pub/sub for live dashboard updates. A single EventEmitter carries
// every tracked simulation event; SSE connections (see campaigns.routes.js
// GET /events) subscribe and filter by organisation. This is process-local: if
// the engine is ever run as more than one instance, swap this for Redis pub/sub
// or Postgres LISTEN/NOTIFY without changing the callers.
const { EventEmitter } = require('events');

const emitter = new EventEmitter();
// Many dashboards may be open at once; lift the default 10-listener warning cap.
emitter.setMaxListeners(0);

const CHANNEL = 'attempt';

// Broadcast one tracked event, e.g.
// { organizationId, campaignId, employeeId, type: 'clicked', at }.
function publish(event) {
  emitter.emit(CHANNEL, event);
}

// Subscribe to every event; returns an unsubscribe function.
function subscribe(listener) {
  emitter.on(CHANNEL, listener);
  return () => emitter.off(CHANNEL, listener);
}

module.exports = { publish, subscribe };
