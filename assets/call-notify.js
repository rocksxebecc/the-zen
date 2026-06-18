/* ═══════════════════════════════════════════════════════════
   call-notify.js — Global incoming call banner  (FIXED v2)
   Works on ANY page (dashboard, profile, servers, etc.)
   Include AFTER supabase.js on every non-chat page.
   On chat.html this script is skipped (chat handles calls natively).

   FIX SUMMARY:
   • _joinShared now awaits SUBSCRIBED before resolving (prevents missed ICE)
   • offer is always waited for with a 6 s deadline before enabling Answer
   • pendingIce is flushed correctly into sessionStorage
   • iOS Safari: Answer button waits for offer before redirecting
═══════════════════════════════════════════════════════════ */
(async function () {
  // Skip on chat.html — it has its own full call engine
  if (location.pathname.replace(/\\/g, '/').endsWith('chat.html')) return;

  // Wait for ZenAuth to be ready
  if (typeof ZenAuth === 'undefined') {
    console.warn('[CallNotify] ZenAuth not found — call notifications disabled');
    return;
  }

  await ZenAuth.initSupabase();
  const session = await ZenAuth.getSession();
  if (!session) return; // Not logged in

  const myUserId = session.user.id;
  const client   = ZenAuth.getSupabaseClient();

  // ── Pending call state ──────────────────────────────────
  let _pc = {
    friendId:      null,
    callType:      null,
    offer:         null,
    pendingIce:    [],
    friendProfile: null,
  };
  let _sharedCh     = null;
  let _offerWaiters = []; // resolve callbacks waiting for the offer

  // ── Inject CSS ──────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #gcn-wrap {
      display: none;
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      background: var(--surface, #fff);
      border: 1.5px solid var(--border, #e5e7eb);
      border-radius: 18px;
      box-shadow: 0 12px 40px rgba(0,0,0,.22);
      padding: 18px 20px;
      min-width: 280px; max-width: 320px;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif);
      animation: gcn-pop .2s ease;
    }
    #gcn-wrap.gcn-open { display: block; }
    @keyframes gcn-pop {
      from { opacity: 0; transform: translateY(10px) scale(.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    @keyframes gcn-pulse {
      0%,100% { box-shadow: 0 0 0 0   rgba(34,197,94,.45); }
      50%      { box-shadow: 0 0 0 14px rgba(34,197,94,0);  }
    }
    #gcn-avatar {
      width:44px; height:44px; border-radius:50%;
      background: #1a1a1a;
      display:flex; align-items:center; justify-content:center;
      font-size:1.3rem; flex-shrink:0;
      animation: gcn-pulse 1.2s ease infinite;
    }
    #gcn-top  { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
    #gcn-name { font-size:.92rem; font-weight:700; color: var(--ink,#111); }
    #gcn-type { font-size:.74rem; color: var(--ink-muted,#666); margin-top:2px; }
    #gcn-btns { display:flex; gap:10px; }
    .gcn-btn  {
      flex:1; height:40px; border-radius:10px; border:none;
      font-weight:700; font-size:.84rem; cursor:pointer;
      font-family: inherit; transition: background .15s, transform .1s;
    }
    .gcn-btn:hover  { transform: scale(1.03); }
    .gcn-accept { background:#22c55e; color:#fff; }
    .gcn-accept:hover { background:#16a34a; }
    .gcn-accept:disabled { background:#6ee7a0; cursor:wait; }
    .gcn-decline { background:#e53e3e; color:#fff; }
    .gcn-decline:hover { background:#c53030; }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ─────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.id = 'gcn-wrap';
  wrap.innerHTML = `
    <div id="gcn-top">
      <div id="gcn-avatar">👤</div>
      <div>
        <div id="gcn-name">Someone</div>
        <div id="gcn-type">Incoming call…</div>
      </div>
    </div>
    <div id="gcn-btns">
      <button class="gcn-btn gcn-decline" id="gcn-decline-btn">✕ Decline</button>
      <button class="gcn-btn gcn-accept"  id="gcn-accept-btn" >📞 Answer</button>
    </div>`;
  document.body.appendChild(wrap);

  // ── Await-offer helper ───────────────────────────────────
  // Returns the offer SDP, or null if it doesn't arrive within `ms` ms.
  function _waitForOffer(ms = 6000) {
    if (_pc.offer) return Promise.resolve(_pc.offer);
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        _offerWaiters = _offerWaiters.filter(r => r !== resolve);
        resolve(null);
      }, ms);
      _offerWaiters.push((offer) => { clearTimeout(timer); resolve(offer); });
    });
  }

  // ── Join the shared call channel ─────────────────────────
  // Awaits SUBSCRIBED so ICE candidates that arrive right after ring
  // are captured by this channel instead of being dropped.
  async function _joinShared(friendId) {
    if (_sharedCh) { try { _sharedCh.unsubscribe(); } catch (_) {} _sharedCh = null; }
    const name = 'call:' + [myUserId, friendId].sort().join(':');
    const ch = client.channel(name, { config: { broadcast: { self: false, ack: false } } });
    ch.on('broadcast', { event: 'signal' }, ({ payload }) => _onSignal(payload));
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('sharedCh subscribe timeout')), 8000);
      ch.subscribe(status => {
        if (status === 'SUBSCRIBED')   { clearTimeout(t); resolve(); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(t); reject(new Error('sharedCh error: ' + status));
        }
      });
    });
    _sharedCh = ch;
  }

  function _resetPending() {
    _pc = { friendId: null, callType: null, offer: null, pendingIce: [], friendProfile: null };
    _offerWaiters = [];
    if (_sharedCh) { try { _sharedCh.unsubscribe(); } catch (_) {} _sharedCh = null; }
    wrap.classList.remove('gcn-open');
  }

  // ── Signal handler ───────────────────────────────────────
  async function _onSignal(payload) {
    const { type, from, callType, sdp, candidate } = payload;
    if (from === myUserId) return;

    if (type === 'ring') {
      // Don't interrupt an active call acceptance
      if (_pc.friendId && _pc.offer) return;

      _pc.friendId   = from;
      _pc.callType   = callType;
      _pc.offer      = null;
      _pc.pendingIce = [];
      _offerWaiters  = [];

      // Join shared channel NOW — before offer/ICE arrive — so nothing is dropped
      try { await _joinShared(from); } catch (e) { console.warn('[CallNotify] _joinShared failed', e); }

      // Fetch caller profile
      const { data: prof } = await client
        .from('profiles')
        .select('id, username, display_name, avatar_emoji, avatar_color')
        .eq('id', from).single();
      _pc.friendProfile = prof || { id: from };

      document.getElementById('gcn-avatar').textContent      = prof?.avatar_emoji || (prof?.display_name?.[0]?.toUpperCase()) || '👤';
      document.getElementById('gcn-avatar').style.background = prof?.avatar_color || '#1a1a1a';
      document.getElementById('gcn-name').textContent        = prof?.display_name || prof?.username || 'Someone';
      document.getElementById('gcn-type').textContent        = callType === 'video' ? 'Incoming video call…' : 'Incoming voice call…';

      wrap.classList.add('gcn-open');
      return;
    }

    if (type === 'offer') {
      _pc.offer = sdp;
      // Notify any waiter (e.g. Answer tapped before offer arrived)
      const waiters = _offerWaiters.splice(0);
      waiters.forEach(r => r(sdp));
      return;
    }

    if (type === 'ice' && candidate) {
      _pc.pendingIce.push(candidate);
      return;
    }

    if (type === 'end' || type === 'decline') {
      _resetPending();
      return;
    }
  }

  // ── Subscribe to personal inbox channel ─────────────────
  const inboxCh = client.channel(`inbox:${myUserId}`, {
    config: { broadcast: { self: false } }
  });
  inboxCh.on('broadcast', { event: 'signal' }, ({ payload }) => _onSignal(payload));
  inboxCh.subscribe();

  // ── Button handlers ──────────────────────────────────────
  document.getElementById('gcn-decline-btn').onclick = async () => {
    if (_sharedCh) {
      try {
        await _sharedCh.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'decline', from: myUserId },
        });
      } catch (e) { console.warn('[CallNotify] decline send failed', e); }
    }
    _resetPending();
  };

  document.getElementById('gcn-accept-btn').onclick = async () => {
    if (!_pc.friendId) return;

    const btn = document.getElementById('gcn-accept-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Wait…';

    // Wait up to 6 s for the offer if it hasn't arrived yet
    // (can happen if the user taps Answer very quickly after ring)
    const offer = await _waitForOffer(6000);

    if (!offer) {
      // Offer never arrived — caller probably hung up or network issue
      console.warn('[CallNotify] Offer not received in time');
      btn.disabled = false;
      btn.textContent = '📞 Answer';
      // Still try — chat.html will handle the missing-offer case
    }

    // Save everything to sessionStorage so chat.html can auto-accept
    sessionStorage.setItem('pendingCall', JSON.stringify({
      friendId:   _pc.friendId,
      callType:   _pc.callType,
      offer:      _pc.offer,          // may still be null if offer timed out
      pendingIce: _pc.pendingIce,
      timestamp:  Date.now(),
    }));

    wrap.classList.remove('gcn-open');
    // Redirect to chat — ?with= opens the conversation, &autocall=1 triggers auto-accept
    window.location.href = `chat.html?with=${_pc.friendId}&autocall=1`;
  };

})();
