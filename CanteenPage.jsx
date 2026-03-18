
import React, { useEffect, useRef, useState } from "react";
import { saveCanteenTransaction } from "../services/canteenTransactions";
import './CanteenPage.css';
import './CanteenScanner.css';
import food1 from '../assets/food/food1.jpg';
import food2 from '../assets/food/food2.jpg';
import food3 from '../assets/food/food3.jpg';

const FOOD_IMAGE_BY_KEY = {
  'veg-manchurian': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  juice: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80',
  cookies: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80',
};

const HERO_BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
  food3,
  'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
];

function getFoodImage(itemId = '', itemName = '') {
  const normalizedId = String(itemId || '').toLowerCase();
  const normalizedName = String(itemName || '').toLowerCase();
  const direct = FOOD_IMAGE_BY_KEY[normalizedId];
  if (direct) return direct;

  if (normalizedName.includes('juice')) return FOOD_IMAGE_BY_KEY.juice;
  if (normalizedName.includes('cookie') || normalizedName.includes('biscuit')) return FOOD_IMAGE_BY_KEY.cookies;
  if (normalizedName.includes('pizza')) return FOOD_IMAGE_BY_KEY.pizza;
  if (normalizedName.includes('sandwich')) return FOOD_IMAGE_BY_KEY.sandwich;
  if (normalizedName.includes('manchurian') || normalizedName.includes('noodle')) return FOOD_IMAGE_BY_KEY['veg-manchurian'];

  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';
}

function handleFoodImageError(event) {
  const img = event.currentTarget;
  if (img && img.src !== food1) {
    img.src = food1;
  }
}


// Simple Canteen Page: left = menu, right = scanner & student details
// Uses html5-qrcode UMD bundle (loaded at runtime) to scan student ID barcodes.

export default function CanteenPage() {
  const [menu, setMenu] = useState([
    { id: 'veg-manchurian', name: 'Veg Manchurian', price: 39, img: getFoodImage('veg-manchurian', 'Veg Manchurian') },
    { id: 'sandwich', name: 'Veg Sandwich', price: 10, img: getFoodImage('sandwich', 'Veg Sandwich') },
    { id: 'pizza', name: 'Slice Pizza', price: 15, img: getFoodImage('pizza', 'Slice Pizza') },
    { id: 'juice', name: 'Orange Juice', price: 6, img: getFoodImage('juice', 'Orange Juice') },
    { id: 'cookies', name: 'Cookies', price: 4, img: getFoodImage('cookies', 'Cookies') },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingPrice, setEditingPrice] = useState('');
  const [canteenAmount, setCanteenAmount] = useState(null);

  // Fetch canteen credited amount from server
  async function fetchCanteenAmount(){
    try{
      const res = await fetch(`${API_BASE}/api/canteen/${encodeURIComponent(CANTEEN_ID)}`);
      if (!res.ok) return;
      const j = await res.json();
      // If server returned HTTP 409 for tamper on modify routes, handle gracefully
      if (j && j.tampered) {
        setTampered(true);
        const chain = typeof j?.chainAmount === 'number' ? j.chainAmount : j?.chainAmount ?? null;
        setChainAmount(chain);
        setCanteenAmount(chain);
        setMessage('Security Alert: Canteen value was modified in DB. Blockchain blocked the change. Please resync.');
        setTimeout(()=>setMessage(''),5000);
        return;
      }
      // If backend reports tamper, do not show modified DB value; show authoritative chain amount and alert admin
      if (j?.tampered) {
        setTampered(true);
        const chain = typeof j?.chainAmount === 'number' ? j.chainAmount : j?.chainAmount ?? null;
        setChainAmount(chain);
        // Do not display the possibly-modified DB value on dashboard. Show chain amount instead (authoritative) when available.
        setCanteenAmount(chain);
        setMessage('Security Alert: Someone attempted to change the canteen amount. Blockchain prevented the update. Please resync to original value.');
          setMessage('Security Alert: Canteen value was modified in DB. Blockchain blocked the change. Please resync.');
        setTimeout(()=>setMessage(''), 5000);
        return;
      }
      const amt = j?.canteen?.amount_credited ?? null;
      setCanteenAmount(amt);
    }catch(e){
      // ignore network errors for now
      console.debug('fetchCanteenAmount error', e);
    }
  }

  // transactions state - WALLET HISTORY (ONLY credit transactions)
  const [walletTransactions, setWalletTransactions] = useState([]);
  // combined canteen transactions (credits + debits)
  const [canteenTransactions, setCanteenTransactions] = useState([]);

  // helper to format timestamps nicely
  function formatDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (e) {
      return String(ts);
    }
  }

  // explorer base (optional) - set VITE_TX_EXPLORER to enable 'Open' links
  const EXPLORER_BASE = import.meta.env.VITE_TX_EXPLORER || '';

  function shortHash(h) {
    if (!h) return '';
    const s = String(h);
    if (s.length > 12) return `${s.slice(0,8)}…${s.slice(-4)}`;
    return s;
  }

  async function copyTxHash(hash) {
    if (!hash) return;
    const text = String(hash);
    // try clipboard API
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback: textarea
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setMessage(`Copied ${shortHash(text)}`);
      setTimeout(()=>setMessage(''), 1400);
    } catch (e) {
      console.debug('copy failed', e);
      setMessage('Copy failed');
      setTimeout(()=>setMessage(''), 1400);
    }
  }

  // ============================================================================
  // CANTEEN WALLET HISTORY - FETCH ONLY CREDIT TRANSACTIONS FROM ALL STUDENTS
  // ============================================================================
  // This fetches ONLY incoming credit transactions to canteen
  // Shows: "Received 6 ED from MCA101", "Received 8 ED from MBA101", etc.
  // Does NOT show individual student debit transactions
  // ============================================================================
  async function fetchCanteenWalletHistory(limit = 200) {
    try {
      // Fetch ONLY canteen credit transactions (what was received from students)
      const url = `${API_BASE}/api/canteen/wallet/${CANTEEN_ID}?limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.debug('fetchCanteenWalletHistory non-ok', res.status);
        return;
      }
      const j = await res.json();
      
      // Handle response format - should return credit transactions only
      let list = [];
      if (j.success && Array.isArray(j.transactions)) {
        list = j.transactions;
      } else if (Array.isArray(j)) {
        list = j;
      }

      // Filter to show ONLY credit transactions with a known student roll and role 'canteen'
      const creditOnly = (list || [])
        .filter(tx => tx && tx.studentRoll && Number(tx.creditAmount || 0) > 0 && (tx.role === 'canteen' || tx.createdBy === 'canteen'))
        .map(tx => ({ ...tx, type: 'credit', direction: 'credit' }));
      setWalletTransactions(creditOnly);
    } catch (e) {
      console.debug('fetchCanteenWalletHistory error', e);
    }
  }

  // Poll wallet history periodically and keep combined credits+debits list sorted
  useEffect(() => {
    fetchCanteenWalletHistory();
    const ivWallet = setInterval(fetchCanteenWalletHistory, 8000);
    return () => {
      clearInterval(ivWallet);
    };
  }, []);

  // Combine credits (walletTransactions) with any future debits (currently none) and sort by time desc
  useEffect(() => {
    // Placeholder for future canteen debits; keep empty for now
    const debits = [];

    const credits = (walletTransactions || []).map(tx => ({
      id: tx.txID || tx.txId || tx.id || tx._id || Math.random().toString(36).slice(2),
      direction: 'credit',
      amount: Number(tx.creditAmount || 0),
      studentRoll: tx.studentRoll,
      items: tx.items || [],
      description: Array.isArray(tx.items) && tx.items.length
        ? tx.items.map(it => `${it.quantity}x ${it.itemName || it.name || 'Item'}`).join(', ')
        : (tx.description || 'Payment received'),
      timestamp: tx.timestamp || tx.date || tx.createdAt || Date.now(),
      verified: true
    }));

    const combined = [...credits, ...debits].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });
    setCanteenTransactions(combined);
  }, [walletTransactions]);

  const [cart, setCart] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const scanLockRef = useRef(false); // Lock to prevent duplicate scans during processing
  const [isCharging, setIsCharging] = useState(false);
  const [weeklyLimitExceeded, setWeeklyLimitExceeded] = useState(false); // Flag to track if weekly limit was exceeded

  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);
  // Canteen document id to credit on successful payment. Override with Vite env VITE_CANTEEN_ID
  const CANTEEN_ID = import.meta.env.VITE_CANTEEN_ID || 'can001';
  const ENABLE_WEEKLY_LIMIT_CHECK = import.meta.env.VITE_ENABLE_WEEKLY_LIMIT_CHECK === 'true';

  const total = Object.keys(cart).reduce((sum, id) => {
    const qty = cart[id] || 0;
    const item = menu.find(m => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  // Wallet helpers
  function extractCoins(payload) {
    const obj = payload?.student || payload?.data || payload || {};
    const candidates = [
      obj.coins,
      obj.eduCoins,
      obj.educoins,
      obj.wallet,
      payload?.coins,
      payload?.eduCoins,
      payload?.educoins,
      payload?.wallet,
    ];
    for (const value of candidates) {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  function extractStudentFromApi(payload, fallbackId = '') {
    const src = payload?.student || payload?.data || payload || {};
    const id = String(
      src.id || src.studentId || src.roll || payload?.id || payload?.studentId || payload?.roll || fallbackId || ''
    ).trim();
    const name = src.name || src.studentName || payload?.name || payload?.studentName || '(no name)';
    const department = src.department || src.dept || payload?.department || payload?.dept || '(no dept)';
    const course = src.course || src.class || src.program || payload?.course || payload?.class || payload?.program || '';
    const section = src.section || src.sec || payload?.section || payload?.sec || '';
    const imageUrl = src.imageUrl || payload?.imageUrl || '';
    const coins = extractCoins(payload);
    return { id, name, department, course, section, coins, imageUrl };
  }

  function extractStudentIdFromScan(decodedText) {
    const raw = String(decodedText || '').trim();
    if (!raw) return '';

    // If QR stores JSON, try common student id keys.
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const fromJson = parsed.studentId || parsed.roll || parsed.id || parsed.regNo || parsed.registerNumber;
        if (fromJson) return String(fromJson).trim();
      }
    } catch (e) {
      // Not JSON, continue parsing.
    }

    // If QR stores URL, try query params and final path segment.
    try {
      if (/^https?:\/\//i.test(raw)) {
        const u = new URL(raw);
        const fromQuery = u.searchParams.get('studentId') || u.searchParams.get('roll') || u.searchParams.get('id');
        if (fromQuery) return String(fromQuery).trim();
        const segs = (u.pathname || '').split('/').filter(Boolean);
        if (segs.length > 0) return decodeURIComponent(segs[segs.length - 1]);
      }
    } catch (e) {
      // Not a valid URL, continue.
    }

    return raw;
  }

  async function getStudentWallet(studentId) {
    const res = await fetch(`${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}`);
    if (!res.ok) throw new Error('Failed to fetch student wallet');
    const js = await res.json();
    const coins = extractCoins(js);
    if (!Number.isFinite(coins)) throw new Error('Invalid wallet balance');
    return coins;
  }

  async function updateStudentWallet(studentId, amount) {
    const items = buildItemsFromCart();
    const res = await fetch(`${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, totalAmount: amount, items, canteenId: CANTEEN_ID })
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = js.message || 'Charge failed';
      throw new Error(msg);
    }
    if (js && js.tampered) {
      throw new Error('Security Alert: Canteen value was modified. Purchase blocked.');
    }
    return { updatedStudent: js, transaction: js.transaction };
  }

  async function updateCanteenWallet(amountToAdd = 0) {
    setCanteenAmount((prev) => {
      const base = Number(prev ?? 0);
      if (!Number.isFinite(base)) return amountToAdd;
      return base + Number(amountToAdd || 0);
    });
    try { await fetchCanteenAmount(); } catch (e) { /* ignore refresh errors */ }
  }

  async function saveTransactionToLedger(tx) {
    // Ledger persistence is already handled in the backend deduct endpoint; return tx for UI use.
    return tx || null;
  }

  async function processCanteenPurchase(studentId, itemsTotal, itemsList = buildItemsFromCart()) {
    const amount = Number(itemsTotal || 0);
    if (!studentId) { setMessage('Missing student id'); return false; }
    if (!amount || amount <= 0) { setMessage('Total must be greater than 0'); return false; }
    
    setIsCharging(true);
    setMessage('Processing payment...');
    try {
      const currentBalance = await getStudentWallet(studentId);
      if (currentBalance < amount) {
        setMessage('Insufficient balance');
        setIsCharging(false);
        return false;
      }

      const { updatedStudent, transaction } = await updateStudentWallet(studentId, amount);
      await updateCanteenWallet(amount);
      await saveTransactionToLedger(transaction || { studentId, amount, totalAmount: amount, items: itemsList });
      try {
        await saveCanteenTransaction({
          txHash: transaction?._id || transaction?.id || transaction?.txHash,
          studentId,
          items: itemsList,
          subtotal: amount,
          status: 'Verified'
        });
      } catch (e) {
        console.error('Failed to persist canteen transaction to Firestore', e);
      }

      const nextCoins = typeof updatedStudent?.coins === 'number' ? updatedStudent.coins : currentBalance - amount;
      setStudent(prev => prev ? { ...prev, coins: nextCoins } : { id: studentId, coins: nextCoins });
      setMessage(`✅ Purchase completed. Paid ${amount} educoins.`);
      setCart({});
      setTimeout(() => {
        closeScanner();
        setMessage('');
        setIsCharging(false);
      }, 1800);
      return true;
    } catch (err) {
      console.error(err);
      setMessage(err?.message || 'Payment failed');
      setIsCharging(false);
      return false;
    }
  }

  function buildItemsFromCart() {
    const ids = Object.keys(cart).filter(k => cart[k] && cart[k] > 0);
    const items = ids.map(id => {
      const menuItem = menu.find(m => m.id === id) || { name: id, price: 0 };
      const quantity = Number(cart[id] || 0);
      const price = Number(menuItem.price || 0);
      const subtotal = quantity * price;
      return { name: menuItem.name || id, price, quantity, subtotal };
    }).filter(it => it.quantity > 0);
    return items;
  }

  function addItem(id) {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function addMenuItem() {
    const name = (newItemName || '').trim();
    const price = Number(newItemPrice || 0);
    if (!name || !price || price <= 0) return setMessage('Enter valid name and price');
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setMenu(prev => ([...prev, { id, name, price, img: getFoodImage(id, name) }]));
    setNewItemName(''); setNewItemPrice('');
    setMessage('Item added');
    setTimeout(()=>setMessage(''),1500);
  }

  function startEdit(item){
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingPrice(String(item.price));
  }

  function saveEdit(id){
    const name = (editingName||'').trim();
    const price = Number(editingPrice||0);
    if (!name || !price) return setMessage('Invalid edit');
    setMenu(prev => prev.map(it => it.id===id? {...it, name, price}: it));
    setEditingId(null); setEditingName(''); setEditingPrice('');
    setMessage('Item updated'); setTimeout(()=>setMessage(''),1500);
  }

  function deleteItem(id){
    setMenu(prev => prev.filter(it=>it.id!==id));
    setCart(prev=>{ const next = {...prev}; delete next[id]; return next; });
    setMessage('Item removed'); setTimeout(()=>setMessage(''),1500);
  }

  function removeItem(id) {
    setCart(prev => {
      const next = { ...prev };
      if (!next[id]) return prev;
      next[id] = next[id] - 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        try { scannerInstanceRef.current.clear(); } catch (e) { /* ignore */ }
      }
      const container = document.getElementById('canteen-page-scanner');
      if (container) container.innerHTML = '';
    };
  }, []);

  // helper: stop any leftover media streams inside the scanner container
  function stopLeftoverStreams(container) {
    if (!container) return;
    const vids = container.querySelectorAll('video');
    vids.forEach((v) => {
      try {
        const s = v.srcObject;
        if (s && s.getTracks) {
          s.getTracks().forEach((t) => {
            try { t.stop(); } catch (er) { /* ignore */ }
          });
        }
      } catch (er) { /* ignore */ }
      try { v.remove(); } catch (er) { /* ignore */ }
    });
  }

  // Close scanner safely: clear instance, stop streams, empty container, then hide UI
  function closeScanner(delay = 0) {
    try {
      if (scannerInstanceRef.current) {
        try { scannerInstanceRef.current.clear(); } catch (e) { /* ignore */ }
        scannerInstanceRef.current = null;
      }
    } catch (e) { /* ignore */ }

    try {
      const container = document.getElementById('canteen-page-scanner');
      if (container) {
        stopLeftoverStreams(container);
        try { container.innerHTML = ''; } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    // Reset weekly limit exceeded flag when closing scanner
    setWeeklyLimitExceeded(false);

    if (delay && delay > 0) {
      setTimeout(() => setShowScanner(false), delay);
    } else {
      setShowScanner(false);
    }
  }

  async function startScanner() {
    setMessage('');
    setStudent(null);
    setScanning(true);
    setScanSuccess(false);
    setFetchedData(null);
    setWeeklyLimitExceeded(false);

    // load UMD bundle if needed
    if (typeof window.Html5QrcodeScanner === 'undefined') {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          // Load from node_modules first (available during dev)
          s.src = '/node_modules/html5-qrcode/html5-qrcode.min.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = async () => {
            // Fallback to CDN if node_modules not available (production)
            console.warn('Local copy unavailable, falling back to CDN');
            const cdn = document.createElement('script');
            cdn.src = 'https://unpkg.com/html5-qrcode@2.3.7/html5-qrcode.min.js';
            cdn.async = true;
            cdn.onload = () => resolve();
            cdn.onerror = (e) => reject(e);
            document.head.appendChild(cdn);
          };
          document.head.appendChild(s);
        });
      } catch (e) {
        console.error('Failed to load html5-qrcode library', e);
        setMessage('Failed to load scanner library. Please check your internet connection or ensure backend is running.');
        setScanning(false);
        setShowScanner(false);
        return;
      }
    }

    const Html5QrcodeScanner = window.Html5QrcodeScanner;
    const container = document.getElementById('canteen-page-scanner');
    if (container) container.innerHTML = '';

    const config = { fps: 10, qrbox: { width: 300, height: 200 } };
    const scanner = new Html5QrcodeScanner('canteen-page-scanner', config, false);
    scannerInstanceRef.current = scanner;

    const onScanSuccess = async (decodedText) => {
      try {
        // stop scanner UI while processing
        try { await scanner.clear(); } catch (e) { /* ignore */ }

        const studentId = extractStudentIdFromScan(decodedText);
        if (!studentId) {
          setMessage('Invalid QR/Barcode content');
          setTimeout(() => closeScanner(), 1500);
          return;
        }
        setMessage('Processing scan...');
        
        // Optional weekly-limit check: only enforce when explicitly enabled.
        if (ENABLE_WEEKLY_LIMIT_CHECK) {
          try {
            const redeemRes = await fetch(`${API_BASE}/api/redeem-educoin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId, service: 'canteen' })
            });

            if (redeemRes.status === 403) {
              const data = await redeemRes.json();
              setWeeklyLimitExceeded(true);
              setMessage(data.message || 'Limit exceeded - weekly scan limit reached. Please try again next week.');
              setStudent(null);
              setFetchedData(null);
              setScanning(false);
              setScanSuccess(false);
              setTimeout(() => closeScanner(), 2000);
              return;
            }

            // If backend does not implement this endpoint, do not block scanning.
            if (!redeemRes.ok && redeemRes.status !== 404) {
              setMessage('Error checking weekly limit. Please try again.');
              setTimeout(() => closeScanner(), 1500);
              return;
            }
          } catch (err) {
            console.error('Weekly limit check error:', err);
            setMessage('Network error while checking weekly limit.');
            setTimeout(() => closeScanner(), 1500);
            return;
          }
        }
        
        // Continue with student lookup and wallet preview.
        setMessage('Fetching student...');
        const res = await fetch(`${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}`);
        if (!res.ok) {
          setMessage('Student not found');
          setTimeout(() => closeScanner(), 1500);
          return;
        }
        const data = await res.json();
        const studentObj = extractStudentFromApi(data, studentId);
        setFetchedData(studentObj);
        setMessage('✅ Student loaded');
        setScanning(false);
        setScanSuccess(true);

        // stop scanner camera streams
        try {
          const container = document.getElementById('canteen-page-scanner');
          if (container) {
            const vids = container.querySelectorAll('video');
            vids.forEach(v => {
              try { const s = v.srcObject; s && s.getTracks && s.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); } catch (e) {}
              try { v.remove(); } catch (e) {}
            });
          }
        } catch (e) { /* ignore */ }

        // after brief highlight show details (do NOT auto-deduct)
        setTimeout(() => {
          setStudent(studentObj);
          setScanSuccess(false);
          setFetchedData(null);
        }, 1000);
      } catch (err) {
        console.error(err);
        setMessage('Error during scan process');
            setTimeout(() => closeScanner(), 2000);
      }
    };

    const onScanFailure = (err) => {
      // ignore per-frame failures
    };

    scanner.render(onScanSuccess, onScanFailure);
  }

  function openScanner() {
    setShowScanner(true);
    // start async
    setTimeout(() => startScanner(), 50);
  }

  return (
    <div className="canteen-page">
      <div className="canteen-hero">
        <div className="canteen-hero-copy">
          <p className="canteen-kicker">Campus Canteen</p>
          <h1 className="canteen-title">Fresh Meals, Faster Checkout</h1>
          <p className="canteen-subtitle">
            Build a food order, scan student ID, and confirm secure educoin payment in a single flow.
          </p>
        </div>
        <div className="wallet-tile" role="status" aria-live="polite">
          <div className="wallet-icon" aria-hidden="true">💰</div>
          <div>
            <div className="wallet-label">Canteen Wallet</div>
            <div className="wallet-value">{typeof canteenAmount === 'number' ? canteenAmount : 0} ED</div>
          </div>
        </div>
      </div>

      <div className="food-banner" aria-label="Featured canteen food">
        {HERO_BANNER_IMAGES.map((img, index) => (
          <img
            key={`${img}-${index}`}
            src={img}
            alt={`Food preview ${index + 1}`}
            className="food-banner-img"
            onError={handleFoodImageError}
          />
        ))}
      </div>

      <div className="canteen-grid">
        <div className="canteen-card menu-column">
          <h2 className="section-title">Menu</h2>

          <div className="add-item-form">
            <input placeholder="Item name" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} className="form-input form-grow" />
            <input placeholder="Price" value={newItemPrice} onChange={(e)=>setNewItemPrice(e.target.value)} type="number" className="form-input form-price" />
            <button disabled={false} onClick={addMenuItem} className="menu-action-btn menu-action-btn-primary">Add</button>
          </div>

          <div className="menu-list">
            {menu.map(item => (
              <div key={item.id} className="menu-item-card">
                <img
                  src={item.img || getFoodImage(item.id, item.name)}
                  alt={item.name}
                  className="menu-food-img"
                  onError={handleFoodImageError}
                />
                <div className="meta menu-item-meta" style={{flex:1}}>
                  {editingId === item.id ? (
                    <div className="edit-row">
                      <input value={editingName} onChange={(e)=>setEditingName(e.target.value)} className="form-input form-grow" />
                      <input value={editingPrice} onChange={(e)=>setEditingPrice(e.target.value)} type="number" className="form-input form-edit-price" />
                    </div>
                  ) : (
                    <>
                      <div className="menu-food-title">{item.name}</div>
                      <div className="price">{item.price} educoins</div>
                    </>
                  )}
                </div>
                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => removeItem(item.id)}>-</button>
                  <div className="qty-count">{cart[item.id] || 0}</div>
                  <button className="qty-btn qty-btn-add" onClick={() => addItem(item.id)}>+</button>
                  {editingId === item.id ? (
                    <>
                      <button onClick={()=>saveEdit(item.id)} className="menu-action-btn menu-action-btn-save">Save</button>
                      <button onClick={()=>{ setEditingId(null); setEditingName(''); setEditingPrice(''); }} className="menu-action-btn">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button disabled={false} onClick={()=>startEdit(item)} className="menu-action-btn">Edit</button>
                      <button disabled={false} onClick={()=>deleteItem(item.id)} className="menu-action-btn menu-action-btn-danger">Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="total-panel">
            <div className="total-box">
              <div className="font-medium">Total</div>
              <div className="font-semibold">{total} educoins</div>
            </div>
            <div className="scan-wrap">
              <button
                disabled={total<=0}
                onClick={openScanner}
                className={`scan-button ${total>0 ? 'enabled' : 'disabled'}`}
                title={total>0 ? 'Open the scanner' : 'Add items to enable scanning'}
              >
                Scan ID
              </button>
            </div>
          </div>
        </div>

        <div className="canteen-card scanner-column">
          <h2 className="section-title">Scanner</h2>
          <div>
            {showScanner ? (
              <div>
                <div className="scanner-viewport">
                  <div id="canteen-page-scanner" className="rounded overflow-hidden scanner-box" style={{ width: 360 }} />
                  <div className="scanner-overlay">
                    <div className="edge-overlay" />
                    <div className={`scanner-frame ${scanSuccess ? 'success' : ''}`}>
                      <div className={`scan-line ${scanning && !scanSuccess ? 'animating' : ''}`} />
                      <div className="hint">{scanning && !scanSuccess ? 'Scanning...' : ''}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm scanner-message">
                  {message && (
                    <div className={weeklyLimitExceeded ? 'text-red-700 font-semibold' : 'text-gray-700'}>
                      {message}
                    </div>
                  )}
                </div>
                {student && (
                  <div className="student-card">
                    {student.imageUrl && (
                      <div className="student-photo-wrap">
                        <img
                          src={student.imageUrl}
                          alt="Student"
                          className="student-photo"
                        />
                      </div>
                    )}
                    <div className="name">{student.name}</div>
                    <div className="dept text-sm text-gray-500">{student.department}</div>
                    {student.course && (
                      <div className="course text-sm text-gray-500">Course: {student.course}</div>
                    )}
                    {student.section && (
                      <div className="section text-sm text-gray-500">Section: {student.section}</div>
                    )}
                    <div className="student-pay-wrap">
                      <button
                        disabled={isCharging || total<=0 || weeklyLimitExceeded}
                        onClick={async () => {
                          const ok = await processCanteenPurchase(student.id, total, buildItemsFromCart());
                          if (ok) window.alert('Payment confirmed');
                        }}
                        className={`pay-btn ${isCharging || weeklyLimitExceeded ? 'pay-btn-disabled' : 'pay-btn-enabled'}`}
                        title={weeklyLimitExceeded ? 'Weekly scan limit reached' : 'Confirm this payment'}
                      >
                        {isCharging ? 'Processing...' : `Confirm Payment (${total} educoins)`}
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <button onClick={() => closeScanner()} className="scanner-close">Close Scanner</button>
                </div>
              </div>
            ) : (
              <div className="scanner-empty-state">Click <span className="scanner-empty-state-strong">Scan ID</span> on the left to open the scanner.</div>
            )}
          </div>
        </div>

        <div className="canteen-card ledger-column">
          <h2 className="section-title">Canteen Transactions (Credits and Debits)</h2>
          <p className="ledger-subtitle">Only canteen-role transactions, latest first</p>
          <div className="ledger-list" role="region" aria-label="Canteen transactions">
            {canteenTransactions && canteenTransactions.length > 0 ? (
              canteenTransactions.map(tx => {
                const signColor = tx.direction === 'debit' ? '#991b1b' : '#059669';
                const sign = tx.direction === 'debit' ? '−' : '+';
                const amount = Number(tx.amount || 0);
                const items = tx.items || [];
                const studentRoll = tx.studentRoll || (tx.direction === 'credit' ? 'Unknown' : '—');

                return (
                  <div key={tx.id} className={`ledger-card ${tx.direction === 'credit' ? 'ledger-credit' : ''}`}>
                    <div className="ledger-top" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div className="ledger-id-wrap" style={{display:'flex', alignItems:'center', gap:8}}>
                        <div className="ledger-id">{shortHash(tx.id)}</div>
                        <span className="tx-chip" style={{fontSize:12, color:'#6b7280'}}>{tx.direction === 'debit' ? 'Debit' : 'Credit'}</span>
                      </div>
                      <div className="ledger-amount transaction-amount" style={{color: signColor, fontWeight:'bold'}}>{sign}{amount} ED</div>
                    </div>

                    <div className="ledger-middle" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop: 8}}>
                      <div style={{minWidth:0, flex: 1}}>
                        {tx.direction === 'credit' ? (
                          <div className="ledger-meta" style={{fontWeight:600, marginBottom: 4}}>
                            From: <span style={{color: '#2563eb'}}>{studentRoll}</span>
                          </div>
                        ) : (
                          <div className="ledger-meta" style={{fontWeight:600, marginBottom: 4}}>
                            Canteen Expense
                          </div>
                        )}

                        {Array.isArray(items) && items.length > 0 ? (
                          <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                            {items.map((it, idx) => (
                              <li key={idx} style={{ fontSize: 13 }}>
                                • {it.itemName || it.name || 'Item'} — {it.quantity} × {it.price} ED{it.quantity && it.price ? ` = ${it.quantity * it.price} ED` : ''}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="ledger-action" style={{color:'#374151', fontSize:13, marginTop: 4}}>
                            {tx.description}
                          </div>
                        )}
                      </div>
                      <div className="ledger-time" style={{fontSize: 12, color: '#6b7280', marginLeft: 8}}>
                        {formatDate(tx.timestamp)}
                      </div>
                    </div>

                    <div className="ledger-footer" style={{marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span className="verified" style={{color: '#059669', fontSize: 13, fontWeight: 600}}>✔✔ Verified</span>
                      <span style={{fontSize: 12, color: '#6b7280'}}>Canteen {tx.direction === 'debit' ? 'Debit' : 'Credit'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="ledger-empty">No transactions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}