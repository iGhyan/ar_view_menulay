'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ShoppingCart, Loader2, AlertCircle, Wifi, Star, Plus, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import { fetchMenuItems, normaliseItem, type ApiMenuItem } from '@/lib/menu-api';
import { useCartStore } from '@/lib/store';

const ARPageClient = dynamic(() => import('@/app/guest/ar/ARPageClient'), { ssr: false });

const EMOJI_MAP: Record<string, string> = {
  starters: '🥗', mains: '🍽️', desserts: '🍰', beverages: '🥤',
  pizza: '🍕', burgers: '🍔', pasta: '🍝', seafood: '🐟',
  grill: '🔥', soup: '🍜', bread: '🍞', drinks: '🥤',
  coffee: '☕', hot: '☕', iced: '🧊', cake: '🎂', other: '🍽️',
};
function getCatEmoji(cat: string): string {
  const c = cat.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (c.includes(key)) return emoji;
  }
  return '🍽️';
}
function formatRs(price: number) { return `Rs. ${price.toLocaleString('en-PK')}`; }

function MenuContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [items,          setItems]          = useState<ApiMenuItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [search,         setSearch]         = useState('');
  const [added,          setAdded]          = useState<Record<string, boolean>>({});
  const [restName,       setRestName]       = useState('Menulay');
  const [restTagline,    setRestTagline]    = useState('Fine Dining Experience');
  const [wifiName,       setWifiName]       = useState('Menulay@2024');
  const [arModal,        setArModal]        = useState<{ itemId: string; itemName: string; emoji: string; arUrl: string; rid: string } | null>(null);
  const { addItem, itemCount } = useCartStore();

  useEffect(() => {
    const urlRid    = params.get('rid') || '';
    const urlTid    = params.get('tid') || '';
    const storedRid = sessionStorage.getItem('lm_rid') || '';
    const storedTid = sessionStorage.getItem('lm_tid') || '';

    // Guard: must come from QR scan
    if (!urlRid && !urlTid && !storedRid && !storedTid) {
      window.location.href = '/guest';
      return;
    }

    if (urlRid) sessionStorage.setItem('lm_rid', urlRid);
    if (urlTid) sessionStorage.setItem('lm_tid', urlTid);

    const storedTable = sessionStorage.getItem('lm_table');

    const menuRid = process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID
      || process.env.NEXT_PUBLIC_RESTAURANT_ID
      || '2687382e-3b00-4f57-9014-f484df89e3fe';

    // Add 15s timeout so loading never hangs forever
    const timeoutId = setTimeout(() => {
      setError('Request timed out. Please check your connection and try again.');
      setLoading(false);
    }, 15000);

    fetchMenuItems(menuRid)
      .then(raw => {
        clearTimeout(timeoutId);
        const normalised = raw.map(normaliseItem);
        setItems(normalised);
        if ((raw[0] as any)?.restaurantName)    setRestName((raw[0] as any).restaurantName);
        if ((raw[0] as any)?.restaurantTagline) setRestTagline((raw[0] as any).restaurantTagline);
        if ((raw[0] as any)?.wifiPassword)      setWifiName((raw[0] as any).wifiPassword);
        setLoading(false);
      })
      .catch(e => {
        clearTimeout(timeoutId);
        setError(e?.message ?? 'Failed to load menu');
        setLoading(false);
      });
  }, [params]);

  // Build categories
  const categories = [
    { id: 'all', name: 'All', emoji: '🍽️' },
    ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))
      .map(cat => {
        const isUuid = /^[0-9a-f]{6,}/i.test(cat);
        const name   = isUuid ? 'All Dishes' : cat.charAt(0).toUpperCase() + cat.slice(1);
        return { id: cat, name, emoji: getCatEmoji(cat) };
      }),
  ];

  // Group items by category for section display
  const filtered = items.filter(item => {
    const matchCat    = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                        (item.description ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && item.status !== 'inactive';
  });

  // Group by category for section headers
  const grouped: { catName: string; catEmoji: string; items: ApiMenuItem[] }[] = [];
  if (activeCategory === 'all' && !search) {
    const seen = new Map<string, { catName: string; catEmoji: string; items: ApiMenuItem[] }>();
    for (const item of filtered) {
      const key = item.category || 'other';
      if (!seen.has(key)) {
        const cat = categories.find(c => c.id === key);
        seen.set(key, { catName: cat?.name || key, catEmoji: cat?.emoji || '🍽️', items: [] });
      }
      seen.get(key)!.items.push(item);
    }
    seen.forEach(g => grouped.push(g));
  } else {
    const catLabel = categories.find(c => c.id === activeCategory);
    grouped.push({ catName: catLabel?.name || 'Items', catEmoji: catLabel?.emoji || '🍽️', items: filtered });
  }

  const handleAdd = (item: ApiMenuItem) => {
    addItem({ menuItemId: item.id, name: item.name, emoji: item.emoji ?? '🍽️', price: item.price, quantity: 1, options: {} });
    setAdded(p => ({ ...p, [item.id]: true }));
    setTimeout(() => setAdded(p => ({ ...p, [item.id]: false })), 1800);
  };

  const cartCount = itemCount();
  const rid = process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID || process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100dvh', fontFamily: 'sans-serif', margin: '0 auto' }}>

      {/* ── Restaurant Header ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', marginBottom: 8 }}>
        {/* Cover image / gradient banner */}
        <div style={{ height: 160, background: 'linear-gradient(135deg, #891C1C 0%, #B22222 50%, #D4380D 100%)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,199,44,0.15)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          {/* Logo circle */}
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', border: '3px solid rgba(255,199,44,0.5)', zIndex: 1 }}>
            🍽️
          </div>
          {/* Cart button */}
          <button onClick={() => router.push('/guest/cart')}
            style={{ position: 'absolute', top: 14, right: 14, width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
            <ShoppingCart size={20} color="#fff" />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#FFC72C', color: '#891C1C', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
            )}
          </button>
        </div>

        {/* Restaurant info */}
        <div style={{ padding: '16px 20px 12px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1A1A1A', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{restName}</h1>
          <p style={{ fontSize: 13, color: '#687780', margin: '0 0 12px', fontStyle: 'italic' }}>{restTagline}</p>

          {/* Info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={14} color="#16a34a" />
              <span style={{ fontSize: 13, color: '#687780' }}>{wifiName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={13} color="#FFC72C" fill="#FFC72C" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>4.8</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>(240+)</span>
            </div>
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, background: '#F0FFF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '2px 10px' }}>Open Now</span>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid #F0F0F0', paddingBottom: 0 }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{ flexShrink: 0, padding: '12px 20px', border: 'none', borderBottom: `3px solid ${activeCategory === cat.id ? '#22c55e' : 'transparent'}`, background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeCategory === cat.id ? 700 : 500, color: activeCategory === cat.id ? '#22c55e' : '#687780', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F5F5F5' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dishes…"
              style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 16, borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#FAFAFA', fontSize: 14, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
          <Loader2 size={28} color="#E1251B" className="animate-spin" />
          <p style={{ color: '#687780', fontSize: 14 }}>Loading menu…</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div style={{ margin: 16, padding: '16px', background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertCircle size={18} color="#E1251B" />
            <p style={{ fontSize: 13, color: '#E1251B', margin: 0, fontWeight: 600 }}>Failed to load menu</p>
          </div>
          <p style={{ fontSize: 12, color: '#687780', margin: '0 0 12px' }}>{error}</p>
          <button
            onClick={() => { setError(''); setLoading(true); window.location.reload(); }}
            style={{ height: 36, padding: '0 20px', borderRadius: 10, background: '#E1251B', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Menu sections ─────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div style={{ paddingBottom: 80 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>No items found</div>
          )}

          {grouped.map(group => (
            <div key={group.catName} style={{ marginBottom: 8 }}>
              {/* Section banner */}
              <div style={{ position: 'relative', height: 80, background: 'linear-gradient(90deg, #1A1A1A 0%, #2D2D2D 100%)', display: 'flex', alignItems: 'center', paddingLeft: 20, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 48, opacity: 0.15 }}>{group.catEmoji}</div>
                <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', margin: 0, zIndex: 1 }}>{group.catName}</h2>
              </div>

              {/* Items */}
              <div style={{ background: '#fff' }}>
                {group.items.map((item, idx) => {
                  const hasAr = !!(item as any).hasArModel || !!(item as any).arModelUrl || !!(item as any).arModelKey;
                  const arUrl = (item as any).arModelUrl ?? '';
                  return (
                    <div key={item.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: idx < group.items.length - 1 ? '1px solid #F5F5F5' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => router.push(`/guest/menu/${item.id}`)}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>

                      {/* Item image / emoji */}
                      <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {(item as any).imageUrl
                          ? <img src={(item as any).imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 36 }}>{item.emoji}</span>}
                        {hasAr && (
                          <button
                            onClick={e => { e.stopPropagation(); setArModal({ itemId: item.id, itemName: item.name, emoji: item.emoji ?? '🍽️', arUrl, rid }); }}
                            style={{ position: 'absolute', bottom: 4, left: 4, background: '#891C1C', color: '#FFC72C', fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 10, border: 'none', cursor: 'pointer', letterSpacing: 0.5 }}>
                            3D AR
                          </button>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                          {(item.tags ?? []).includes('chef') && (
                            <span style={{ fontSize: 9, background: '#FFF3E0', border: '1px solid #FED7AA', color: '#c2410c', borderRadius: 10, padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>Chef's Pick</span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#E1251B' }}>{formatRs(item.price)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleAdd(item); }}
                            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, transition: 'all 0.2s', background: added[item.id] ? '#22c55e' : '#E1251B', color: '#fff', boxShadow: added[item.id] ? '0 2px 8px rgba(34,197,94,0.3)' : '0 2px 8px rgba(225,37,27,0.3)' }}>
                            {added[item.id] ? <Check size={16} /> : <Plus size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sticky cart bar ───────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 680, padding: '12px 16px', background: 'transparent', zIndex: 100 }}>
          <button onClick={() => router.push('/guest/cart')}
            style={{ width: '100%', height: 52, borderRadius: 26, background: '#E1251B', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 8px 24px rgba(225,37,27,0.4)' }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 800 }}>{cartCount}</span>
            View Cart
            <ShoppingCart size={18} />
          </button>
        </div>
      )}

      {/* ── AR Modal ─────────────────────────────────────────────────────── */}
      {arModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(135deg, #891C1C, #B22222)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setArModal(null)}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
              ✕
            </button>
            <div>
              <p style={{ color: '#FFC72C', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>3D AR View</p>
              <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>{arModal.itemName}</p>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ARPageClient restaurantId={arModal.rid} itemId={arModal.itemId} itemName={arModal.itemName} emoji={arModal.emoji} preloadedGlbUrl={arModal.arUrl} />
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        .animate-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#f5f5f5', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="#E1251B" className="animate-spin" />
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}