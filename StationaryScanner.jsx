import React, { useEffect, useRef, useState } from "react";
import '../canteen/CanteenScanner.css';

export default function StationaryScanner({ onStudentLoaded }) {
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const scannerStartingRef = useRef(false);
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);

  function stopLeftoverStreams(container) {
    if (!container) return;
    const vids = container.querySelectorAll("video");
    vids.forEach((v) => {
      try {
        const s = v.srcObject;
        if (s && s.getTracks) {
          s.getTracks().forEach((t) => {
            try { t.stop(); } catch (er) {}
          });
        }
      } catch (er) {}
      try { v.remove(); } catch (er) {}
    });
  }

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerInstanceRef.current) {
        try { scannerInstanceRef.current.clear(); } catch (e) {}
      }
      const container = document.getElementById("stationary-reader");
      stopLeftoverStreams(container);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    if (scannerStartingRef.current) return;
    scannerStartingRef.current = true;
    setMessage("");
    setStudent(null);
    setIsProcessing(false);

    const config = { fps: 10, qrbox: { width: 300, height: 200 } };

    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.clear(); } catch (e) {}
      scannerInstanceRef.current = null;
    }

    if (typeof window.Html5QrcodeScanner === "undefined") {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/node_modules/html5-qrcode/html5-qrcode.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error("Failed to load html5-qrcode script"));
          document.head.appendChild(script);
        });
      } catch (err) {
        console.error("Failed to load html5-qrcode script:", err);
        setMessage("Failed to load scanner library — see console.");
        scannerStartingRef.current = false;
        return;
      }
    }

    const Html5QrcodeScanner = window.Html5QrcodeScanner;
    const container = document.getElementById("stationary-reader");
    if (container) {
      container.innerHTML = '';
      stopLeftoverStreams(container);
    }

    const html5QrcodeScanner = new Html5QrcodeScanner("stationary-reader", config, false);

    const onScanSuccess = async (decodedText) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setMessage("Processing...");
      try { await html5QrcodeScanner.clear(); } catch (e) {}

      try {
        const studentId = decodedText.trim();
        const url = `${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          setMessage(res.status === 404 ? `No student found for id: ${studentId}` : `Server error (${res.status})`);
          setTimeout(() => { setIsProcessing(false); startScanner(); }, 2000);
          return;
        }
        const data = await res.json();
        const loaded = { id: studentId, name: data.name || '(no name)', department: data.department || '(no dept)', coins: typeof data.coins === 'number' ? data.coins : Number(data.coins||0) };
        setStudent(loaded);
        if (onStudentLoaded) onStudentLoaded(loaded);
        setMessage('✅ Student loaded');
        // do not auto-clear: let parent handle actions
      } catch (err) {
        console.error(err);
        setMessage(err?.message || 'Error processing scan. See console.');
        setTimeout(() => { setIsProcessing(false); startScanner(); }, 3000);
      }
    };

    const onScanFailure = (error) => {};

    try {
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      scannerInstanceRef.current = html5QrcodeScanner;
      scannerRef.current = html5QrcodeScanner;
    } catch (err) {
      console.error('Failed to render html5QrcodeScanner:', err);
      setMessage('Scanner initialization failed — see console.');
      if (container) { stopLeftoverStreams(container); container.innerHTML = ''; }
      scannerStartingRef.current = false;
      return;
    }

    scannerStartingRef.current = false;
  }

  return (
    <div>
      <div id="stationary-reader" className="rounded-md overflow-hidden" style={{ width: 360 }} />
      <div className="mt-3">{message && <div className="text-sm text-green-700">{message}</div>}</div>
    </div>
  );
}
