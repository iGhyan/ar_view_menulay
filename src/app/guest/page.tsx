'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ShoppingCart, Leaf, Loader2, Wifi, Star, Clock, ChevronRight, UtensilsCrossed } from 'lucide-react';

const MENU_RID  = process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID || process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';
const API_BASE  = process.env.NEXT_PUBLIC_API_BASE  || 'https://g1ou0w5x4m.execute-api.ap-south-1.amazonaws.com/dev';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function GuestContent() {
  const params   = useSearchParams();
  const qrRid    = params.get('rid') || '';
  const tid      = params.get('tid') || '';
  const tableNum = tid.replace(/^[Tt](?:able[-_]?)?/, '').replace(/\D/g, '') || '—';

  const [zone,           setZone]           = useState('Main Hall');
  const [restaurantName, setRestaurantName] = useState('Das Pardes');
  const [tagline,        setTagline]        = useState('Fine Dining Experience');

  useEffect(() => {
    const n = parseInt(tableNum, 10);
    if (n >= 9 && n <= 10)  setZone('Garden Terrace');
    else if (n >= 11)        setZone('Private Dining');
    else                     setZone('Main Hall');

    if (qrRid)            sessionStorage.setItem('lm_rid',   qrRid);
    if (tid)              sessionStorage.setItem('lm_tid',   tid);
    if (tableNum !== '—') sessionStorage.setItem('lm_table', tableNum);

    const ridToUse = qrRid || MENU_RID;
    fetch(`${API_BASE}/menus/restaurants/${ridToUse}/items`, {
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      cache: 'no-store',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const items = data?.items ?? data ?? [];
        if (items.length > 0) {
          if (items[0]?.restaurantName)    setRestaurantName(items[0].restaurantName);
          if (items[0]?.restaurantTagline) setTagline(items[0].restaurantTagline);
        }
      })
      .catch(() => {});
  }, [qrRid, tid, tableNum]);

  const isQrScan = params.has('rid') && params.has('tid');
  const menuUrl  = `/guest/menu?rid=${qrRid || MENU_RID}&tid=${tid}`;

  return (
    <main style={{ minHeight: '100dvh', background: '#FFF8F1', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(160deg, #6B0F0F 0%, #891C1C 40%, #B22222 75%, #C0392B 100%)', padding: '0 0 32px', position: 'relative', overflow: 'hidden' }}>

        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,199,44,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 80, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,199,44,0.06)', pointerEvents: 'none' }} />

        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 12px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>OPEN NOW</span>
          </div>
          {isQrScan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>✓ QR Verified</span>
            </div>
          )}
        </div>

        {/* Logo + Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 0', textAlign: 'center' }}>
          {/* Logo circle */}
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 0 0 4px rgba(255,199,44,0.3)' }}>
            🍽️
          </div>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 6px', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{restaurantName}</h1>
          <p style={{ color: 'rgba(255,199,44,0.85)', fontSize: 14, fontStyle: 'italic', margin: '0 0 20px', fontWeight: 500 }}>{tagline}</p>

          {/* Quick info pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 12px' }}>
              <Star size={13} color="#FFC72C" fill="#FFC72C" />
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>4.8</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>(240+)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 12px' }}>
              <Clock size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>15–25 min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 12px' }}>
              <Wifi size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>DasPardes2024</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Card ────────────────────────────────────────────────────── */}
      <div style={{ margin: '-20px 20px 0', background: '#fff', borderRadius: 20, padding: '18px 18px', boxShadow: '0 8px 32px rgba(137,28,28,0.12)', border: '1px solid #F0E8E0', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)', border: '1.5px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={22} color="#E1251B" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 3px' }}>Your Table</p>
            <p style={{ color: '#1A1A1A', fontSize: 20, fontWeight: 900, margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>
              {tableNum !== '—' ? `Table ${tableNum}` : 'Walk-in Guest'}
            </p>
            <p style={{ color: '#687780', fontSize: 12, margin: 0 }}>{zone}</p>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 900 }}>✓</span>
          </div>
        </div>

        {/* Session info */}
        {isQrScan && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, background: '#FFF8F1', border: '1px solid #F0E8E0', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 3px' }}>Restaurant ID</p>
              <p style={{ color: '#687780', fontSize: 11, fontFamily: 'monospace', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {qrRid ? `${qrRid.slice(0, 8)}…` : `${MENU_RID.slice(0, 8)}…`}
              </p>
            </div>
            <div style={{ flex: 1, background: '#FFF8F1', border: '1px solid #F0E8E0', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 3px' }}>Table ID</p>
              <p style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 700, margin: 0 }}>{tid || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick feature cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '24px 20px 0' }}>
        {[
          { icon: '🍽️', label: 'Fresh Menu',    sub: 'Daily updated'   },
          { icon: '⚡',  label: 'Fast Service',  sub: '15-25 minutes'  },
          { icon: '💳',  label: 'Easy Pay',      sub: 'Pay at table'   },
        ].map(f => (
          <div key={f.label} style={{ background: '#fff', border: '1.5px solid #F0E8E0', borderRadius: 14, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(137,28,28,0.04)' }}>
            <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>{f.icon}</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px' }}>{f.label}</p>
            <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>{f.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main CTAs ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href={menuUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, borderRadius: 18, background: 'linear-gradient(135deg, #E1251B, #C41F16)', color: '#fff', textDecoration: 'none', padding: '0 20px', boxShadow: '0 8px 24px rgba(225,37,27,0.35)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={20} color="#fff" />
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>Browse Our Menu</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>View all dishes & order</p>
            </div>
          </div>
          <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
        </Link>

        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54, borderRadius: 16, background: '#fff', border: '1.5px solid #F0E8E0', padding: '0 20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(137,28,28,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF3E0', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={17} color="#E1251B" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, margin: 0 }}>Allergen Guide</p>
              <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>Dietary information</p>
            </div>
          </div>
          <ChevronRight size={18} color="#D1D5DB" />
        </button>

        <Link href="/guest/tracking" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54, borderRadius: 16, background: '#fff', border: '1.5px solid #F0E8E0', padding: '0 20px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(137,28,28,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF3E0', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UtensilsCrossed size={17} color="#E1251B" />
            </div>
            <div>
              <p style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, margin: 0 }}>Track My Order</p>
              <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>Live kitchen status</p>
            </div>
          </div>
          <ChevronRight size={18} color="#D1D5DB" />
        </Link>
      </div>

      {/* ── Bottom nav ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0 24px', borderTop: '1px solid #F0E8E0', background: '#fff', marginTop: 24 }}>
        {[
          { icon: '🏠', label: 'Home',   href: '/guest',          active: true  },
          { icon: '📖', label: 'Menu',   href: menuUrl,                         },
          { icon: '🛒', label: 'Cart',   href: '/guest/cart',                   },
          { icon: '🕐', label: 'Orders', href: '/guest/tracking',               },
        ].map(n => (
          <Link key={n.label} href={n.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', textDecoration: 'none', color: n.active ? '#E1251B' : '#9CA3AF' }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{n.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function GuestLandingPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100dvh', background: '#FFF8F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Loader2 size={28} color="#E1251B" />
        <p style={{ color: '#687780', fontSize: 14 }}>Loading…</p>
      </main>
    }>
      <GuestContent />
    </Suspense>
  );
}