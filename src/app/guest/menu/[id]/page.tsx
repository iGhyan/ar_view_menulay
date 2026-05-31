'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Share2, Clock, Star, Cuboid, Loader2, AlertCircle, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import { fetchMenuItem, normaliseItem, type ApiMenuItem } from '@/lib/menu-api';

const ARPageClient = dynamic(() => import('@/app/guest/ar/ARPageClient'), { ssr: false });

const TENANT_ID     = process.env.NEXT_PUBLIC_TENANT_ID_KDS     ?? 't123';
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS ?? 'r456';

function formatRs(price: number) { return `Rs. ${price.toLocaleString('en-PK')}`; }

export default function ItemDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [item,     setItem]     = useState<ApiMenuItem | null>(null);
  const [rawItem,  setRawItem]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [qty,      setQty]      = useState(1);
  const [wished,   setWished]   = useState(false);
  const [arReady,  setArReady]  = useState<boolean | null>(null);
  const [placing,  setPlacing]  = useState(false);
  const [placed,   setPlaced]   = useState(false);
  const [orderId,  setOrderId]  = useState('');
  const [orderErr, setOrderErr] = useState('');
  const [arOpen,   setArOpen]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const menuRid = process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID || process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';
    fetchMenuItem(id, menuRid)
      .then(raw => {
        setRawItem(raw);
        setItem(normaliseItem(raw));
        setArReady(!!(raw as any).arModelUrl || !!(raw as any).arModelKey);
        setLoading(false);
      })
      .catch(e => { setError(e?.message ?? 'Failed to load item'); setLoading(false); });
  }, [id]);

  const placeOrder = async () => {
    if (!item) return;
    setPlacing(true); setOrderErr('');
    try {
      const tableId = sessionStorage.getItem('lm_tid') ?? 'table-01';
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, tableId,
          currencyCode: 'PKR',
          totalAmountMinorUnits: Math.round(item.price * qty * 100),
          lineItems: [{ itemId: item.id, name: item.name, quantity: qty, unitPriceMinorUnits: Math.round(item.price * 100), totalPriceMinorUnits: Math.round(item.price * qty * 100) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
      setOrderId(data.orderId ?? '');
      setPlaced(true);
    } catch (err: any) {
      setOrderErr(err?.message ?? 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <div style={{ background: '#FFF8F1', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E1251B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#687780', fontSize: 14 }}>Loading…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !item) return (
    <div style={{ background: '#FFF8F1', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <AlertCircle size={40} color="#E1251B" />
      <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Item not found</p>
      <p style={{ fontSize: 13, color: '#687780', textAlign: 'center' }}>{error}</p>
      <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: 24, background: '#E1251B', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>← Go Back</button>
    </div>
  );

  if (placed) return (
    <div style={{ background: '#FFF8F1', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #891C1C, #B22222)', padding: '28px 24px 40px', textAlign: 'center' }}>
        <p style={{ color: '#FFC72C', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Das Pardes</p>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, fontFamily: 'Georgia, serif', margin: 0 }}>Order Confirmed!</h1>
      </div>
      <div style={{ margin: '-24px 24px 0', background: '#fff', borderRadius: 24, padding: '28px 24px', boxShadow: '0 8px 32px rgba(137,28,28,0.12)', border: '1px solid #F0E8E0', textAlign: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, margin: '0 auto 16px', boxShadow: '0 0 0 12px rgba(34,197,94,0.1), 0 0 0 24px rgba(34,197,94,0.05)' }}>✓</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1A1A1A', fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>Order Placed!</h2>
        <p style={{ fontSize: 14, color: '#687780', margin: '0 0 16px', lineHeight: 1.6 }}>
          <strong style={{ color: '#1A1A1A' }}>{item.name}</strong> × {qty} has been sent to the kitchen 🍳
        </p>
        {orderId && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #FFF3E0, #FFF8F1)', border: '2px solid #FFC72C', borderRadius: 28, padding: '10px 24px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#891C1C', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Order</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#891C1C', fontFamily: 'monospace', letterSpacing: 2 }}>#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 18 }}>⏱️</span>
          <span style={{ fontSize: 13, color: '#687780', fontWeight: 600 }}>Estimated time: <strong style={{ color: '#E1251B' }}>15–20 min</strong></span>
        </div>
      </div>
      <div style={{ margin: '20px 24px', background: '#fff', borderRadius: 20, padding: '20px', border: '1px solid #F0E8E0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px' }}>What happens next</p>
        {[
          { icon: '✅', title: 'Order Received',  desc: 'Kitchen has your order',      done: true  },
          { icon: '👨‍🍳', title: 'Being Prepared', desc: 'Chef is cooking your meal',   done: false },
          { icon: '🔔', title: 'Ready to Serve',  desc: 'Waiter brings it to you',     done: false },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 14 : 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: step.done ? '#F0FFF4' : '#F9FAFB', border: `2px solid ${step.done ? '#BBF7D0' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{step.icon}</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: step.done ? '#1A1A1A' : '#9CA3AF', margin: 0 }}>{step.title}</p>
              <p style={{ fontSize: 12, color: step.done ? '#687780' : '#D1D5DB', margin: 0 }}>{step.desc}</p>
            </div>
            {step.done && <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: 800, fontSize: 14 }}>✓</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => router.push('/guest/tracking')}
          style={{ width: '100%', height: 56, borderRadius: 28, background: '#E1251B', color: '#fff', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(225,37,27,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          📡 Track My Order
        </button>
        <button onClick={() => { setPlaced(false); setQty(1); }}
          style={{ width: '100%', height: 48, borderRadius: 24, background: '#FFF3E0', color: '#891C1C', border: '2px solid #FED7AA', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Order Again
        </button>
        <button onClick={() => router.push('/guest/menu')}
          style={{ width: '100%', height: 48, borderRadius: 24, background: '#fff', color: '#687780', border: '1.5px solid #E5E7EB', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ← Back to Menu
        </button>
      </div>
    </div>
  );

  const rid    = process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID || process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';
  const arUrl  = rawItem?.arModelUrl ?? '';

  return (
    <div style={{ background: '#FFF8F1', minHeight: '100dvh', fontFamily: 'sans-serif', paddingBottom: 100 }}>

      {/* Hero image */}
      <div style={{ position: 'relative', width: '100%', height: 280, background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {(rawItem as any)?.imageUrl
          ? <img src={(rawItem as any).imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 100 }}>{item.emoji}</span>}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(137,28,28,0.15), transparent)' }} />

        <button onClick={() => router.back()}
          style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 12, background: '#891C1C', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <ArrowLeft size={18} color="#fff" />
        </button>
        <button onClick={() => setWished(!wished)}
          style={{ position: 'absolute', top: 16, right: 64, width: 40, height: 40, borderRadius: 12, background: wished ? '#E1251B' : '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <Heart size={18} color={wished ? '#fff' : '#E1251B'} fill={wished ? '#fff' : 'none'} />
        </button>
        <button style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 12, background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <Share2 size={18} color="#891C1C" />
        </button>

        {/* AR badge — opens modal, not new page */}
        {arReady && (
          <button onClick={() => setArOpen(true)}
            style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', alignItems: 'center', gap: 6, background: '#891C1C', borderRadius: 20, padding: '6px 14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <Cuboid size={13} color="#FFC72C" />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>View in AR</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', margin: '0 0 12px', padding: '20px 20px 16px', borderBottom: '1px solid #F0E8E0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A', margin: 0, fontFamily: 'Georgia, serif', flex: 1 }}>{item.name}</h1>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#E1251B', whiteSpace: 'nowrap' }}>{formatRs(item.price)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={14} color="#FFC72C" fill="#FFC72C" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{item.rating?.toFixed(1) ?? '4.5'}</span>
            <span style={{ fontSize: 12, color: '#687780' }}>({item.reviewCount ?? 0})</span>
          </div>
          {item.prepTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} color="#687780" />
              <span style={{ fontSize: 12, color: '#687780' }}>{item.prepTime}</span>
            </div>
          )}
        </div>
        {item.description && (
          <p style={{ fontSize: 14, color: '#687780', margin: '12px 0 0', lineHeight: 1.6 }}>{item.description}</p>
        )}
      </div>

      {/* AR banner — opens modal */}
      {arReady && (
        <button onClick={() => setArOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 16px 12px', padding: '14px 16px', background: 'linear-gradient(135deg, #891C1C, #B22222)', borderRadius: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(137,28,28,0.25)', width: 'calc(100% - 32px)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,199,44,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Cuboid size={22} color="#FFC72C" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>View in Augmented Reality</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: '2px 0 0' }}>Place on your table · Mobile & Desktop</p>
          </div>
          <span style={{ color: '#FFC72C', fontSize: 20 }}>›</span>
        </button>
      )}

      {/* Allergens */}
      {(item.allergens ?? []).length > 0 && (
        <div style={{ background: '#fff', margin: '0 0 12px', padding: '16px 20px', borderTop: '1px solid #F0E8E0', borderBottom: '1px solid #F0E8E0' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>Allergens</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(item.allergens ?? []).map((a: any) => (
              <span key={a.name ?? a} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: a.status === 'present' ? '#FFF0F0' : '#F0FFF4', color: a.status === 'present' ? '#E1251B' : '#16a34a', border: `1px solid ${a.status === 'present' ? '#FFD0D0' : '#BBF7D0'}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.status === 'present' ? '#E1251B' : '#16a34a', display: 'inline-block' }} />
                {a.emoji} {a.name ?? a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div style={{ background: '#fff', margin: '0 0 12px', padding: '16px 20px', borderTop: '1px solid #F0E8E0', borderBottom: '1px solid #F0E8E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Quantity</p>
          <p style={{ fontSize: 12, color: '#687780', margin: '2px 0 0' }}>Max 5 per order</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #E1251B', borderRadius: 28, overflow: 'hidden' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: '#E1251B' }}>−</button>
          <span style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#1A1A1A', borderLeft: '1px solid #E1251B', borderRight: '1px solid #E1251B' }}>{qty}</span>
          <button onClick={() => setQty(Math.min(5, qty + 1))} style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: '#E1251B' }}>+</button>
        </div>
      </div>

      {/* Order error */}
      {orderErr && (
        <div style={{ margin: '0 16px 12px', padding: '12px 16px', background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} color="#E1251B" />
          <p style={{ fontSize: 12, color: '#E1251B', margin: 0 }}>{orderErr}</p>
        </div>
      )}

      {/* Fixed footer */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #F0E8E0', padding: '12px 20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 -8px 24px rgba(0,0,0,0.1)' }}>
        <div>
          <p style={{ fontSize: 11, color: '#687780', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Total</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#E1251B', margin: 0 }}>{formatRs(item.price * qty)}</p>
        </div>
        <button onClick={placeOrder} disabled={placing}
          style={{ flex: 1, height: 56, borderRadius: 28, border: 'none', cursor: placing ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: placing ? '#ccc' : '#E1251B', color: '#fff', boxShadow: placing ? 'none' : '0 4px 16px rgba(225,37,27,0.4)' }}>
          {placing
            ? <><div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Placing Order…</>
            : <><Send size={18} /> Place Order · {formatRs(item.price * qty)}</>}
        </button>
      </div>

      {/* AR Modal Overlay */}
      {arOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #891C1C, #B22222)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setArOpen(false)}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
              ✕
            </button>
            <div>
              <p style={{ color: '#FFC72C', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>3D AR View</p>
              <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>{item.name}</p>
            </div>
          </div>
          {/* AR content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ARPageClient
              restaurantId={rid}
              itemId={id}
              itemName={item.name}
              emoji={item.emoji ?? '🍽️'}
              preloadedGlbUrl={arUrl}
            />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}