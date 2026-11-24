const { publish, subscribe } = require('../src/realtime/bus');

describe('realtime bus', () => {
  it('delivers published events to a subscriber and stops after unsubscribe', () => {
    const received = [];
    const unsubscribe = subscribe((e) => received.push(e));

    publish({ type: 'clicked', campaignId: 1 });
    expect(received).toEqual([{ type: 'clicked', campaignId: 1 }]);

    unsubscribe();
    publish({ type: 'opened', campaignId: 1 });
    expect(received).toHaveLength(1); // nothing after unsubscribe
  });

  it('fans one event out to every subscriber', () => {
    const a = [];
    const b = [];
    const ua = subscribe((e) => a.push(e));
    const ub = subscribe((e) => b.push(e));

    publish({ type: 'submitted' });
    ua();
    ub();

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});
