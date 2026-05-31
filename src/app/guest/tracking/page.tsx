'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, CheckCircle, ChefHat, Bell, Bike } from 'lucide-react';

interface LineItem {
  name: string; itemId: string; quantity: number;
  unitPriceMinorUnits: number; totalPriceMinorUnits: number;
}
interface ApiOrder {
  orderId: string; status: string; tableId?: string;
  lineItems: LineItem[]; placedAt?: string; updatedAt?: string;
  totalAmountMinorUnits?: number; currencyCode?: string;
}

const STATUS_STEPS = [
  { key: 'RECEIVED',  label: 'Order Received', icon: CheckCircle, desc: 'Your order is confirmed and sent to kitchen' },
  { key: 'PREPARING', label: 'Being Prepared', icon: ChefHat,     desc: 'Our chef is cooking your meal'              },
  { key: 'READY',     label: 'Ready to Serve', icon: Bell,        desc: 'Your food is ready — waiter coming soon!'   },
  { key: 'DELIVERED', label: 'Delivered',       icon: Bike,        desc: 'Enjoy your meal! 🎉'                        },
];

const STATUS_RANK: Record<string, number> = {
  'RECEIVED': 0, 'PENDING': 0,
  'PREPARING': 1, 'IN_PROGRESS': 1, 'KITCHEN_ACCEPTED': 1,
  'READY': 2, 'READY_TO_SERVE': 2, 'FOOD_READY': 2,
  'DELIVERED': 3, 'COMPLETED': 3,
};

function getStepIndex(status: string): number {
  const s = (status ?? '').toUpperCase();
  if (s === 'RECEIVED' || s === 'PENDING') return 0;
  if (s === 'PREPARING' || s === 'IN_PROGRESS' || s === 'KITCHEN_ACCEPTED') return 1;
  if (s === 'READY' || s === 'READY_TO_SERVE' || s === 'FOOD_READY') return 2;
  if (s === 'DELIVERED' || s === 'COMPLETED') return 3;
  return 0;
}
function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function formatRs(minor?: number) {
  if (!minor) return 'Rs 0';
  return 'Rs ' + (minor / 100).toLocaleString('en-PK');
}

const POLL_MS = 3000;
const C = { red: '#E1251B', dark: '#891C1C', gold: '#FFC72C', bg: '#FFF8F1', white: '#fff', border: '#F0E8E0', text: '#1A1A1A', muted: '#687780', subtle: '#9CA3AF' };

export default function TrackingPage() {
  const router = useRouter();
  const [orders,   setOrders]   = useState<ApiOrder[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [lastSync, setLastSync] = useState('');
  const [pollPct,  setPollPct]  = useState(0);
  const [sessionTid,   setSessionTid]   = useState('');
  const [sessionTable, setSessionTable] = useState('');

  useEffect(() => {
    const hasSession = sessionStorage.getItem('lm_rid') || sessionStorage.getItem('lm_tid');
    if (!hasSession) { window.location.href = '/guest'; return; }
    setSessionTid(sessionStorage.getItem('lm_tid') ?? '');
    setSessionTable(sessionStorage.getItem('lm_table') ?? '');
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Orders API ${res.status}`);
      const data = await res.json();
      const all  = (data.orders ?? []);
      all.sort((a: ApiOrder, b: ApiOrder) =>
        new Date(b.placedAt ?? 0).getTime() - new Date(a.placedAt ?? 0).getTime()
      );
      setOrders(prev => {
        const prevMap = new Map(prev.map(o => [o.orderId, o]));
        const merged  = all.map((o: ApiOrder) => {
          const existing = prevMap.get(o.orderId);
          if (!existing) return o;
          const existingRank = STATUS_RANK[(existing.status ?? '').toUpperCase()] ?? -1;
          const freshRank    = STATUS_RANK[(o.status ?? '').toUpperCase()] ?? -1;
          const isFreshFinal = ['TIMED_OUT','CANCELLED'].includes((o.status??'').toUpperCase());
          const status = (!isFreshFinal && existingRank > freshRank) ? existing.status : o.status;
          return { ...o, status };
        });
        const active   = merged.filter((o: ApiOrder) => !['TIMED_OUT','CANCELLED'].includes((o.status??'').toUpperCase()));
        const inactive = merged.filter((o: ApiOrder) =>  ['TIMED_OUT','CANCELLED'].includes((o.status??'').toUpperCase()));
        return [...active, ...inactive];
      });
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setPollPct(((Date.now() - start) % POLL_MS) / POLL_MS * 100);
    }, 200);
    return () => clearInterval(id);
  }, [lastSync]);

  const myOrders = orders.filter(o => {
    const t = (o.tableId ?? '').toLowerCase();
    return t === sessionTid.toLowerCase() ||
           t.includes(sessionTable) ||
           (sessionTable && t.endsWith(sessionTable.padStart(2, '0')));
  });

  const activeOrders     = (myOrders.length > 0 ? myOrders : orders).filter(o => !['TIMED_OUT','CANCELLED'].includes((o.status ?? '').toUpperCase()));
  const allDisplayOrders = myOrders.length > 0 ? myOrders : orders;
  const displayOrders    = activeOrders.length > 0 ? activeOrders : allDisplayOrders;
  const latest           = displayOrders[0];
  const currentStep      = latest ? getStepIndex(latest.status) : 0;
  const isCancelled      = ['TIMED_OUT','CANCELLED'].includes((latest?.status ?? '').toUpperCase());

  const stepColors = (done: boolean, current: boolean) => ({
    circle: done    ? { bg: '#FFF0EE', border: C.red }
          : current ? { bg: '#FFF0EE', border: C.red }
          :            { bg: '#F9FAFB', border: '#E5E7EB' },
    icon:   done || current ? C.red : C.subtle,
  });

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: 'sans-serif', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${C.dark}, #B22222)`, padding: '16px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, fontFamily: 'Georgia, serif' }}>Order Tracking</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '2px 0 0' }}>
              {sessionTid ? `Table ${sessionTable} · ` : ''}Live updates every 3s
            </p>
          </div>
          <button onClick={() => load()}
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={14} color="#fff" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Poll progress bar */}
      <div style={{ height: 3, background: C.border, flexShrink: 0 }}>
        <div style={{ height: '100%', background: C.red, transition: 'width 0.2s', width: `${pollPct}%` }} />
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.red}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: C.subtle, fontSize: 13 }}>Fetching your orders…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: 16, background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 16, textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.red, margin: '0 0 8px' }}>{error}</p>
            <button onClick={() => load()} style={{ fontSize: 12, color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>Retry</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 48, opacity: 0.2 }}>📋</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.subtle, margin: 0 }}>No orders yet</p>
            <p style={{ fontSize: 12, color: '#D1D5DB', margin: 0 }}>Your orders will appear here once placed</p>
            <button onClick={() => router.push('/guest/menu')}
              style={{ marginTop: 8, padding: '10px 24px', borderRadius: 24, background: '#FFF3E0', border: `1.5px solid #FED7AA`, color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Browse Menu
            </button>
          </div>
        )}

        {latest && !loading && (
          <>
            {/* ── Latest order card ───────────────────────────────────────── */}
            <div style={{ background: isCancelled ? '#FFF0F0' : '#FFF3E0', border: `1.5px solid ${isCancelled ? '#FFD0D0' : '#FED7AA'}`, borderRadius: 18, padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: C.subtle, margin: '0 0 3px' }}>Order ID</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: C.dark, margin: 0 }}>
                    #{latest.orderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 700,
                  background: latest.status === 'DELIVERED' ? '#F0FFF4' :
                              latest.status === 'READY'     ? '#EFF6FF' :
                              latest.status === 'PREPARING' ? '#FFF3E0' :
                              isCancelled                   ? '#FFF0F0' : '#FFFBEB',
                  color:      latest.status === 'DELIVERED' ? '#16a34a' :
                              latest.status === 'READY'     ? '#1d4ed8' :
                              latest.status === 'PREPARING' ? '#c2410c' :
                              isCancelled                   ? C.red     : '#d97706',
                  border: `1px solid ${latest.status === 'DELIVERED' ? '#BBF7D0' : latest.status === 'READY' ? '#BFDBFE' : '#FED7AA'}`,
                }}>
                  {isCancelled ? 'Cancelled' : latest.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.muted }}>
                <span>🕐 {formatTime(latest.placedAt)}</span>
                <span>🪑 {latest.tableId ?? `Table ${sessionTable}`}</span>
                <span>💰 {formatRs(latest.totalAmountMinorUnits)}</span>
              </div>
            </div>

            {/* ── Live status stepper ─────────────────────────────────────── */}
            {!isCancelled && (
              <>
                <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px' }}>Live Status</p>
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  {/* Track line bg */}
                  <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, background: C.border }} />
                  {/* Track line progress */}
                  <div style={{ position: 'absolute', left: 19, top: 20, width: 2, background: C.red, transition: 'height 1s', height: `calc(${(currentStep / (STATUS_STEPS.length - 1)) * 100}%)` }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {STATUS_STEPS.map((step, i) => {
                      const done    = i < currentStep;
                      const current = i === currentStep;
                      const sc      = stepColors(done, current);
                      const Icon    = step.icon;
                      return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative', zIndex: 1 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${sc.circle.border}`, background: sc.circle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.5s', boxShadow: current ? `0 0 16px rgba(225,37,27,0.25)` : 'none' }}>
                            <Icon size={16} color={sc.icon} />
                          </div>
                          <div style={{ flex: 1, paddingTop: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: done || current ? C.text : C.subtle, margin: 0 }}>
                                {step.label}
                              </p>
                              {current && (
                                <span style={{ fontSize: 9, background: '#FFF0EE', color: C.red, border: `1px solid #FED0CC`, padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                  Live
                                </span>
                              )}
                              {done && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>✓</span>}
                            </div>
                            <p style={{ fontSize: 11, color: done || current ? C.muted : '#D1D5DB', margin: '3px 0 0', lineHeight: 1.5 }}>
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Cancelled */}
            {isCancelled && (
              <div style={{ textAlign: 'center', padding: '32px 0', marginBottom: 16 }}>
                <span style={{ fontSize: 48 }}>❌</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.red, margin: '12px 0 4px' }}>Order Cancelled / Timed Out</p>
                <p style={{ fontSize: 13, color: C.subtle }}>Please place a new order or contact staff</p>
              </div>
            )}

            {/* ── Items ordered ───────────────────────────────────────────── */}
            <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>Items Ordered</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(latest.lineItems ?? []).map((li, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF3E0', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{li.name}</p>
                      <p style={{ fontSize: 11, color: C.subtle, margin: 0 }}>× {li.quantity}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.red, fontFamily: 'Georgia, serif' }}>
                    {formatRs(li.totalPriceMinorUnits)}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: C.dark, fontFamily: 'Georgia, serif' }}>
                  {formatRs(latest.totalAmountMinorUnits)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Previous orders ─────────────────────────────────────────────── */}
        {displayOrders.length > 1 && !loading && (
          <>
            <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>Previous Orders</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {displayOrders.slice(1).map(order => (
                <div key={order.orderId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14 }}>
                  <div>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted, fontWeight: 700, margin: 0 }}>
                      #{order.orderId.slice(0, 8).toUpperCase()}
                    </p>
                    <p style={{ fontSize: 11, color: C.subtle, margin: '2px 0 0' }}>
                      {formatTime(order.placedAt)} · {order.lineItems?.length ?? 0} items
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.red, fontFamily: 'Georgia, serif', margin: 0 }}>{formatRs(order.totalAmountMinorUnits)}</p>
                    <p style={{ fontSize: 10, color: order.status === 'DELIVERED' ? '#16a34a' : C.subtle, margin: '2px 0 0', fontWeight: 600 }}>{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lastSync && (
          <p style={{ textAlign: 'center', fontSize: 10, color: '#D1D5DB', paddingBottom: 16 }}>
            Updated {lastSync} · Auto-refresh every 3s
          </p>
        )}
      </div>

      {/* ── Bottom nav ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 0 20px', borderTop: `1.5px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        {[
          { icon: '🏠', label: 'Home',   href: '/guest'            },
          { icon: '📖', label: 'Menu',   href: '/guest/menu'       },
          { icon: '🛒', label: 'Cart',   href: '/guest/cart'       },
          { icon: '📡', label: 'Orders', href: '/guest/tracking', active: true },
        ].map(n => (
          <button key={n.label} onClick={() => router.push(n.href)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', background: 'none', border: 'none', cursor: 'pointer', color: (n as any).active ? C.red : C.subtle }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{n.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        .animate-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}