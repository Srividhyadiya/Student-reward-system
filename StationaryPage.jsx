import React, { useEffect, useRef, useState } from "react";
import "../canteen/CanteenPage.css";
import "../canteen/CanteenScanner.css";

const STATIONARY_IMAGE_BY_KEY = {
  "xerox-a4": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
  "xerox-a3": "https://images.unsplash.com/photo-1614036634955-ae5e90f9b9eb?auto=format&fit=crop&w=1200&q=80",
  "ink-pen": "https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?auto=format&fit=crop&w=1200&q=80",
  "gel-pen": "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=1200&q=80",
  pencil: "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=1200&q=80",
  eraser: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80",
  notebook: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80",
  "geometry-set": "https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&w=1200&q=80",
  marker: "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1200&q=80",
  stapler: "https://images.unsplash.com/photo-1616628182509-8f62f36d77d4?auto=format&fit=crop&w=1200&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
};

const HERO_BANNER_IMAGES = [
  "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1481487196290-c152efe083f5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498079022511-d15614cb1c02?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80",
];

function getStationaryImage(itemId = "", itemName = "") {
  const normalizedId = String(itemId || "").toLowerCase();
  const normalizedName = String(itemName || "").toLowerCase();
  const direct = STATIONARY_IMAGE_BY_KEY[normalizedId];
  if (direct) return direct;

  if (normalizedName.includes("pen")) return STATIONARY_IMAGE_BY_KEY["ink-pen"];
  if (normalizedName.includes("xerox") || normalizedName.includes("print")) return STATIONARY_IMAGE_BY_KEY["xerox-a4"];
  if (normalizedName.includes("book") || normalizedName.includes("notebook")) return STATIONARY_IMAGE_BY_KEY.notebook;
  if (normalizedName.includes("pencil")) return STATIONARY_IMAGE_BY_KEY.pencil;

  return "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80";
}

export default function StationaryPage() {
  const [menu, setMenu] = useState([
    { id: "xerox-a4", name: "Xerox (A4)", price: 2, img: getStationaryImage("xerox-a4", "Xerox (A4)") },
    { id: "xerox-a3", name: "Xerox (A3)", price: 4, img: getStationaryImage("xerox-a3", "Xerox (A3)") },
    { id: "ink-pen", name: "Ball Pen", price: 3, img: getStationaryImage("ink-pen", "Ball Pen") },
    { id: "gel-pen", name: "Gel Pen", price: 5, img: getStationaryImage("gel-pen", "Gel Pen") },
    { id: "pencil", name: "Pencil", price: 1, img: getStationaryImage("pencil", "Pencil") },
    { id: "eraser", name: "Eraser", price: 1, img: getStationaryImage("eraser", "Eraser") },
    { id: "notebook", name: "Notebook", price: 25, img: getStationaryImage("notebook", "Notebook") },
    { id: "geometry-set", name: "Geometry Set", price: 40, img: getStationaryImage("geometry-set", "Geometry Set") },
    { id: "marker", name: "Marker", price: 8, img: getStationaryImage("marker", "Marker") },
    { id: "stapler", name: "Stapler", price: 30, img: getStationaryImage("stapler", "Stapler") },
    { id: "book", name: "Reference Book", price: 120, img: getStationaryImage("book", "Reference Book") },
  ]);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrice, setEditingPrice] = useState("");

  const [cart, setCart] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [stationaryAmount, setStationaryAmount] = useState(null);

  const scannerInstanceRef = useRef(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
      ? "http://localhost:5000"
      : `${window.location.protocol}//${window.location.hostname}:5000`);
  const STATIONARY_ID = import.meta.env.VITE_STATIONARY_ID || "stat001";

  const total = Object.keys(cart).reduce((sum, id) => {
    const qty = cart[id] || 0;
    const item = menu.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  async function fetchStationaryAmount() {
    try {
      const res = await fetch(`${API_BASE}/api/stationary/${encodeURIComponent(STATIONARY_ID)}`);
      if (!res.ok) return;
      const js = await res.json();
      const raw = js?.stationary || {};
      const amount =
        typeof raw.amount_credited === "number"
          ? raw.amount_credited
          : typeof raw.credited_amount === "number"
            ? raw.credited_amount
            : Number(raw.amount_credited || raw.credited_amount || 0);
      setStationaryAmount(Number.isFinite(amount) ? amount : 0);
    } catch (e) {
      console.debug("fetchStationaryAmount error", e);
    }
  }

  useEffect(() => {
    fetchStationaryAmount();
  }, []);

  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        try {
          scannerInstanceRef.current.clear();
        } catch (e) {
          // ignore scanner cleanup errors
        }
      }
      const container = document.getElementById("stationary-page-scanner");
      if (container) container.innerHTML = "";
    };
  }, []);

  function buildItemsFromCart() {
    return Object.keys(cart)
      .filter((id) => cart[id] && cart[id] > 0)
      .map((id) => {
        const menuItem = menu.find((m) => m.id === id) || { name: id, price: 0 };
        const quantity = Number(cart[id] || 0);
        const price = Number(menuItem.price || 0);
        return {
          name: menuItem.name || id,
          price,
          quantity,
          subtotal: quantity * price,
        };
      });
  }

  function addItem(id) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function removeItem(id) {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[id]) return prev;
      next[id] = next[id] - 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  function addMenuItem() {
    const name = String(newItemName || "").trim();
    const price = Number(newItemPrice || 0);
    if (!name || !price || price <= 0) {
      setMessage("Enter valid name and price");
      setTimeout(() => setMessage(""), 1500);
      return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setMenu((prev) => [...prev, { id, name, price, img: getStationaryImage(id, name) }]);
    setNewItemName("");
    setNewItemPrice("");
    setMessage("Item added");
    setTimeout(() => setMessage(""), 1500);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingPrice(String(item.price));
  }

  function saveEdit(id) {
    const name = String(editingName || "").trim();
    const price = Number(editingPrice || 0);
    if (!name || !price) {
      setMessage("Invalid edit");
      setTimeout(() => setMessage(""), 1500);
      return;
    }

    setMenu((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name, price, img: getStationaryImage(id, name) } : item,
      ),
    );
    setEditingId(null);
    setEditingName("");
    setEditingPrice("");
    setMessage("Item updated");
    setTimeout(() => setMessage(""), 1500);
  }

  function deleteItem(id) {
    setMenu((prev) => prev.filter((item) => item.id !== id));
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMessage("Item removed");
    setTimeout(() => setMessage(""), 1500);
  }

  function stopLeftoverStreams(container) {
    if (!container) return;
    const videos = container.querySelectorAll("video");
    videos.forEach((video) => {
      try {
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) {
              // ignore stream stop errors
            }
          });
        }
      } catch (e) {
        // ignore stream retrieval errors
      }
      try {
        video.remove();
      } catch (e) {
        // ignore remove errors
      }
    });
  }

  function closeScanner(delay = 0) {
    if (scannerInstanceRef.current) {
      try {
        scannerInstanceRef.current.clear();
      } catch (e) {
        // ignore scanner clear errors
      }
      scannerInstanceRef.current = null;
    }

    const container = document.getElementById("stationary-page-scanner");
    if (container) {
      stopLeftoverStreams(container);
      container.innerHTML = "";
    }

    setScanning(false);
    setScanSuccess(false);
    if (delay > 0) {
      setTimeout(() => setShowScanner(false), delay);
      return;
    }
    setShowScanner(false);
  }

  async function processStationaryPurchase(studentId, itemsTotal, items = buildItemsFromCart()) {
    const amount = Number(itemsTotal || 0);
    if (!studentId) {
      setMessage("Missing student ID");
      return;
    }
    if (!amount || amount <= 0) {
      setMessage("Total must be greater than 0");
      return;
    }

    setIsCharging(true);
    setMessage("Processing payment...");

    try {
      const res = await fetch(`${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}/deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, totalAmount: amount, items, stationaryId: STATIONARY_ID }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(js?.message || "Charge failed");
      }
      if (js?.tampered) {
        throw new Error("Security alert: Wallet value tampered. Purchase blocked.");
      }

      if (typeof js?.coins === "number") {
        setStudent((prev) => (prev ? { ...prev, coins: js.coins } : prev));
      }

      await fetchStationaryAmount();
      setMessage(`Purchase completed. Paid ${amount} educoins.`);
      setCart({});
      setTimeout(() => {
        closeScanner();
        setStudent(null);
        setMessage("");
        setIsCharging(false);
      }, 1800);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Payment failed");
      setIsCharging(false);
    }
  }

  async function startScanner() {
    setMessage("");
    setStudent(null);
    setScanning(true);

    if (typeof window.Html5QrcodeScanner === "undefined") {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/node_modules/html5-qrcode/html5-qrcode.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => {
            const fallback = document.createElement("script");
            fallback.src = "https://unpkg.com/html5-qrcode@2.3.7/html5-qrcode.min.js";
            fallback.async = true;
            fallback.onload = () => resolve();
            fallback.onerror = (e) => reject(e);
            document.head.appendChild(fallback);
          };
          document.head.appendChild(script);
        });
      } catch (err) {
        console.error("Failed to load scanner", err);
        setMessage("Failed to load scanner library");
        setScanning(false);
        setShowScanner(false);
        return;
      }
    }

    const Html5QrcodeScanner = window.Html5QrcodeScanner;
    const container = document.getElementById("stationary-page-scanner");
    if (container) container.innerHTML = "";

    const config = { fps: 10, qrbox: { width: 300, height: 200 } };
    const scanner = new Html5QrcodeScanner("stationary-page-scanner", config, false);
    scannerInstanceRef.current = scanner;

    const onScanSuccess = async (decodedText) => {
      try {
        try {
          await scanner.clear();
        } catch (e) {
          // ignore clear errors
        }

        const studentId = String(decodedText || "").trim();
        setMessage("Fetching student...");
        const res = await fetch(`${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}`);
        if (!res.ok) {
          setMessage("Student not found");
          setTimeout(() => closeScanner(), 1500);
          return;
        }

        const data = await res.json();
        const studentObj = {
          id: studentId,
          name: data.name || "(no name)",
          department: data.department || data.dept || "(no department)",
          course: data.course || data.class || data.program || "",
          section: data.section || data.sec || "",
          coins: typeof data.coins === "number" ? data.coins : Number(data.coins || 0),
          imageUrl: data.imageUrl || "",
        };

        setStudent(studentObj);
        setMessage("Student loaded");
        setScanning(false);
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 900);
      } catch (err) {
        console.error(err);
        setMessage("Error during scan process");
        setTimeout(() => closeScanner(), 1800);
      }
    };

    const onScanFailure = () => {
      // Ignore per-frame scanner misses
    };

    scanner.render(onScanSuccess, onScanFailure);
  }

  function openScanner() {
    setShowScanner(true);
    setTimeout(() => startScanner(), 50);
  }

  return (
    <div className="canteen-page">
      <div className="canteen-hero">
        <div className="canteen-hero-copy">
          <p className="canteen-kicker">Campus Stationary</p>
          <h1 className="canteen-title">Daily Essentials, Faster Checkout</h1>
          <p className="canteen-subtitle">
            Build a stationery order, scan student ID, and confirm secure educoin payment in one flow.
          </p>
        </div>
        <div className="wallet-tile" role="status" aria-live="polite">
          <div className="wallet-icon" aria-hidden="true">💰</div>
          <div>
            <div className="wallet-label">Stationary Wallet</div>
            <div className="wallet-value">{typeof stationaryAmount === "number" ? stationaryAmount : 0} ED</div>
          </div>
        </div>
      </div>

      <div className="food-banner" aria-label="Featured stationary products">
        {HERO_BANNER_IMAGES.map((img, index) => (
          <img key={img} src={img} alt={`Stationary preview ${index + 1}`} className="food-banner-img" />
        ))}
      </div>

      <div className="canteen-grid">
        <div className="canteen-card menu-column">
          <h2 className="section-title">Menu</h2>

          <div className="add-item-form">
            <input
              placeholder="Item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="form-input form-grow"
            />
            <input
              placeholder="Price"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              type="number"
              className="form-input form-price"
            />
            <button onClick={addMenuItem} className="menu-action-btn menu-action-btn-primary">
              Add
            </button>
          </div>

          <div className="menu-list">
            {menu.map((item) => (
              <div key={item.id} className="menu-item-card">
                <img src={item.img || getStationaryImage(item.id, item.name)} alt={item.name} className="menu-food-img" />
                <div className="meta menu-item-meta" style={{ flex: 1 }}>
                  {editingId === item.id ? (
                    <div className="edit-row">
                      <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="form-input form-grow" />
                      <input
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        type="number"
                        className="form-input form-edit-price"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="menu-food-title">{item.name}</div>
                      <div className="price">{item.price} educoins</div>
                    </>
                  )}
                </div>
                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => removeItem(item.id)}>
                    -
                  </button>
                  <div className="qty-count">{cart[item.id] || 0}</div>
                  <button className="qty-btn qty-btn-add" onClick={() => addItem(item.id)}>
                    +
                  </button>
                  {editingId === item.id ? (
                    <>
                      <button onClick={() => saveEdit(item.id)} className="menu-action-btn menu-action-btn-save">
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                          setEditingPrice("");
                        }}
                        className="menu-action-btn"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(item)} className="menu-action-btn">
                        Edit
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="menu-action-btn menu-action-btn-danger">
                        Delete
                      </button>
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
                disabled={total <= 0}
                onClick={openScanner}
                className={`scan-button ${total > 0 ? "enabled" : "disabled"}`}
                title={total > 0 ? "Open the scanner" : "Add items to enable scanning"}
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
                <div id="stationary-page-scanner" className="rounded overflow-hidden scanner-box" style={{ width: 360 }} />
                <div className={`mt-3 text-sm scanner-message ${scanSuccess ? "text-green-700 font-semibold" : ""}`}>
                  {scanning ? "Scanning..." : message}
                </div>
                {student && (
                  <div className="student-card">
                    {student.imageUrl && (
                      <div className="student-photo-wrap">
                        <img src={student.imageUrl} alt="Student" className="student-photo" />
                      </div>
                    )}
                    <div className="name">{student.name}</div>
                    <div className="dept text-sm text-gray-500">{student.department}</div>
                    {student.course && <div className="course text-sm text-gray-500">Course: {student.course}</div>}
                    {student.section && <div className="section text-sm text-gray-500">Section: {student.section}</div>}
                    <div className="mt-3">
                      <button
                        disabled={isCharging || total <= 0}
                        onClick={() => processStationaryPurchase(student.id, total, buildItemsFromCart())}
                        className={`pay-btn ${isCharging ? "pay-btn-disabled" : "pay-btn-enabled"}`}
                      >
                        {isCharging ? "Processing..." : `Confirm Payment (${total} educoins)`}
                      </button>
                    </div>
                    <div className="mt-3 text-sm">Current balance: {student.coins ?? "-"} educoins</div>
                  </div>
                )}
                <div className="mt-3">
                  <button onClick={() => closeScanner()} className="scanner-close">
                    Close Scanner
                  </button>
                </div>
              </div>
            ) : (
              <div className="scanner-empty-state">
                Click <span className="scanner-empty-state-strong">Scan ID</span> on the left to open the scanner.
              </div>
            )}
          </div>
        </div>

        <div className="canteen-card ledger-column">
          <h2 className="section-title">Stationary Transactions</h2>
          <p className="ledger-subtitle">Only stationary-role transactions, latest first</p>
          <div className="ledger-list" role="region" aria-label="Stationary transactions">
            <div className="ledger-empty">No transactions yet</div>
          </div>
        </div>
      </div>
    </div>
  );
}
