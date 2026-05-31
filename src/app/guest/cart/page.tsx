'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Tag, Send, Lock, AlertCircle, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

function formatRs(price: number) { return `Rs. ${price.toLocaleString('en-PK')}`; }

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, serviceCharge, tax, total, clearCart } = useCartStore();

  const [notes,        setNotes]        = useState('');
  const [promo,        setPromo]        = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [placing,      setPlacing]      = useState(false);
  const [placed,       setPlaced]       = useState(false);
  const [orderId,      setOrderId]      = useState('');
  const [orderError,   setOrderError]   = useState('');
  const [tableId,      setTableId]      = useState('');
  const [tableNum,     setTableNum]     = useState('');

  useEffect(() => {
    const hasSession = sessionStorage.getItem('lm_rid') || sessionStorage.getItem('lm_tid');
    if (!hasSession) { window.location.href = '/guest'; return; }
    const tid  = sessionStorage.getItem('lm_tid')   ?? '';
    const tnum = sessionStorage.getItem('lm_table') ?? '';
    setTableId(tid || `table-${tnum || '01'}`);
    setTableNum(tnum);
  }, []);

  const discount   = promoApplied ? Math.round(subtotal() * 0.1) : 0;
  const grandTotal = total() - discount;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === 'HAPPY20') {
      setPromoApplied(true); setPromo('HAPPY20');
    }
  };

  const placeOrder = async () => {
    if (items.length === 0) return;
    setPlacing(true); setOrderError('');
    try {
      const tid = sessionStorage.getItem('lm_tid') ?? tableId ?? 'table-01';
      const payload = {
        tenantId:              process.env.NEXT_PUBLIC_TENANT_ID_KDS,
        restaurantId:          process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS,
        tableId:               tid,
        currencyCode:          'PKR',
        totalAmountMinorUnits: Math.round(grandTotal * 100),
        lineItems: items.map(item => ({
          itemId:               item.menuItemId,
          name:                 item.name,
          quantity:             item.quantity,
          unitPriceMinorUnits:  Math.round(item.price * 100),
          totalPriceMinorUnits: Math.round(item.price * item.quantity * 100),
        })),
        ...(notes.trim() && { notes: notes.trim() }),
      };
      const res  = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? `Error ${res.status}`);
      setOrderId(data.orderId ?? '');
      clearCart();
      setPlaced(true);
    } catch (err: any) {
      setOrderError(err?.message ?? 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const C = { red: '#E1251B', dark: '#891C1C', gold: '#FFC72C', bg: '#FFF8F1', white: '#fff', border: '#F0E8E0', text: '#1A1A1A', muted: '#687780', subtle: '#9CA3AF' };

  // ── Order success ─────────────────────────────────────────────────────────
  if (placed) return (
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      {/* Red header */}
      <div style={{ background: 'linear-gradient(135deg, #891C1C, #B22222)', padding: '28px 24px 40px', textAlign: 'center' }}>
        <p style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Das Pardes</p>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, fontFamily: 'Georgia, serif', margin: 0 }}>Order Confirmed!</h1>
      </div>
      {/* Floating card */}
      <div style={{ margin: '-24px 20px 0', background: C.white, borderRadius: 24, padding: '28px 24px', boxShadow: '0 8px 32px rgba(137,28,28,0.12)', border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px', boxShadow: '0 0 0 12px rgba(34,197,94,0.1), 0 0 0 24px rgba(34,197,94,0.05)' }}>✓</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: C.text, fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>Order Placed!</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 16px', lineHeight: 1.6 }}>Your order has been sent to the kitchen. We'll notify you as it's prepared.</p>
        {orderId && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #FFF3E0, #FFF8F1)', border: `2px solid ${C.gold}`, borderRadius: 28, padding: '10px 24px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.dark, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Order</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.dark, fontFamily: 'monospace', letterSpacing: 2 }}>#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 18 }}>⏱️</span>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Estimated: <strong style={{ color: C.red }}>15–20 min</strong></span>
        </div>
      </div>
      {/* Steps */}
      <div style={{ margin: '20px 20px', background: C.white, borderRadius: 20, padding: '20px', border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.subtle, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px' }}>What happens next</p>
        {[
          { icon: '✅', title: 'Order Received',  desc: 'Kitchen has your order',    done: true  },
          { icon: '👨‍🍳', title: 'Being Prepared', desc: 'Chef is cooking your meal', done: false },
          { icon: '🔔', title: 'Ready to Serve',  desc: 'Waiter brings it to you',   done: false },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 14 : 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: step.done ? '#F0FFF4' : '#F9FAFB', border: `2px solid ${step.done ? '#BBF7D0' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{step.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: step.done ? C.text : C.subtle, margin: 0 }}>{step.title}</p>
              <p style={{ fontSize: 12, color: step.done ? C.muted : '#D1D5DB', margin: 0 }}>{step.desc}</p>
            </div>
            {step.done && <span style={{ color: '#22c55e', fontWeight: 800 }}>✓</span>}
          </div>
        ))}
      </div>
      {/* Buttons */}
      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => router.push('/guest/tracking')}
          style={{ width: '100%', height: 56, borderRadius: 28, background: C.red, color: '#fff', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(225,37,27,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          📡 Track My Order
        </button>
        <button onClick={() => router.push('/guest/menu')}
          style={{ width: '100%', height: 48, borderRadius: 24, background: '#FFF3E0', color: C.dark, border: `2px solid #FED7AA`, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ← Back to Menu
        </button>
      </div>
    </div>
  );

  // ── Cart screen ───────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: 'sans-serif', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #891C1C, #B22222)', padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, flex: 1, margin: 0, fontFamily: 'Georgia, serif' }}>Your Cart</h1>
          <span style={{ background: 'rgba(255,199,44,0.2)', border: '1px solid rgba(255,199,44,0.4)', borderRadius: 20, padding: '4px 12px', color: C.gold, fontSize: 12, fontWeight: 700 }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Order items */}
        <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>Order Items</p>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 48, opacity: 0.2 }}>🛒</span>
            <p style={{ color: C.subtle, fontSize: 14, margin: 0 }}>Your cart is empty</p>
            <button onClick={() => router.push('/guest/menu')}
              style={{ padding: '10px 24px', borderRadius: 24, background: '#FFF3E0', border: `1.5px solid #FED7AA`, color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Browse Menu
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, boxShadow: '0 2px 8px rgba(137,28,28,0.04)' }}>
              {/* Emoji */}
              <div style={{ width: 54, height: 54, borderRadius: 14, background: '#FFF3E0', border: '1.5px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                {item.emoji}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                <p style={{ fontSize: 11, color: C.subtle, margin: '0 0 10px' }}>{Object.values(item.options).filter(Boolean).join(' · ') || 'No modifications'}</p>
                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${C.red}`, borderRadius: 10, width: 'fit-content', overflow: 'hidden' }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 32, height: 30, background: 'none', border: 'none', color: C.red, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>−</button>
                  <span style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.text, borderLeft: `1px solid #FED7AA`, borderRight: `1px solid #FED7AA` }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 32, height: 30, background: 'none', border: 'none', color: C.red, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>
              </div>
              {/* Price + remove */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.red }}>{formatPrice(item.price * item.quantity)}</span>
                <button onClick={() => removeItem(item.id)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: '#FFF0F0', border: '1px solid #FFD0D0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: C.red }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Table info */}
        <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>Table & Session</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#FFF3E0', border: `1.5px solid #FED7AA`, borderRadius: 14, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={18} color={C.red} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 2px' }}>Dining at</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{tableNum ? `Table ${tableNum}` : tableId || 'Walk-in Guest'}</p>
          </div>
          <span style={{ color: '#22c55e', fontSize: 18, fontWeight: 800 }}>✓</span>
        </div>

        {/* Special instructions */}
        <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>Special Instructions</p>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Allergies, dietary needs, special requests…"
          rows={2}
          style={{ width: '100%', borderRadius: 14, padding: '12px 14px', fontSize: 13, marginBottom: 16, resize: 'none', background: C.white, border: `1.5px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box' }} />

        {/* Promo */}
        <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>Promo Code</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Enter promo code"
            style={{ flex: 1, height: 44, borderRadius: 12, padding: '0 14px', background: C.white, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, outline: 'none' }} />
          <button onClick={applyPromo}
            style={{ height: 44, padding: '0 18px', borderRadius: 12, background: '#FFF3E0', border: `1.5px solid #FED7AA`, color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Apply
          </button>
        </div>
        {promoApplied && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 12, marginBottom: 12 }}>
            <Tag size={13} /> HAPPY20 applied — 10% discount
          </div>
        )}

        {/* Bill summary */}
        <p style={{ fontSize: 10, color: C.subtle, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '16px 0 8px' }}>Bill Summary</p>
        <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '16px', marginBottom: 12 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13, color: C.muted }}>{item.name} × {item.quantity}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
          {[
            ['Subtotal',            formatPrice(subtotal())],
            ['Service Charge (5%)', formatPrice(serviceCharge())],
            ['Tax (15%)',           formatPrice(tax())],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13, color: C.muted }}>{l}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{v}</span>
            </div>
          ))}
          {promoApplied && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13, color: C.muted }}>Promo Discount</span>
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>− {formatPrice(discount)}</span>
            </div>
          )}
          <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.red, fontFamily: 'Georgia, serif' }}>{formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* Error */}
        {orderError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 12, marginBottom: 12 }}>
            <AlertCircle size={15} color={C.red} />
            <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{orderError}</p>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px 28px', background: C.white, borderTop: `1.5px solid ${C.border}` }}>
        <button
          onClick={placeOrder}
          disabled={placing || items.length === 0}
          style={{ width: '100%', height: 56, borderRadius: 28, border: 'none', cursor: placing || items.length === 0 ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: placing || items.length === 0 ? '#ccc' : C.red, color: '#fff', boxShadow: placing || items.length === 0 ? 'none' : '0 6px 20px rgba(225,37,27,0.35)', marginBottom: 10 }}>
          {placing
            ? <><div style={{ width: 18, height: 18, border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></>
            : <><Send size={18} /> Place Order · {formatPrice(grandTotal)}</>}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Lock size={12} color={C.subtle} />
          <span style={{ fontSize: 11, color: C.subtle }}>Secured guest session · No payment required now</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}