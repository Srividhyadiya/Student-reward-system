import React, { useEffect, useRef, useState } from "react";
import './CanteenScanner.css';

// Contract (inputs/outputs):
// - Scans a barcode/QR code using the laptop camera and reads the string (e.g., "STU001").
// - Looks up the document with id === scanned text in `students` collection.
// - Displays name and department, calls deductEducoins(studentId) to decrement coins.
// - Shows a success message and auto-clears after 5 seconds to allow next scan.

export default function CanteenScanner() {
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const scannerStartingRef = useRef(false);
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // API base: prefer explicit env var. In dev force localhost:5000 to avoid
  // accidental routing to the Vite server port.
  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);
  const [apiStatus, setApiStatus] = useState({ base: API_BASE, last: null });
  // Log for quick verification in browser console
  if (import.meta.env.DEV) {
    console.debug("CanteenScanner API_BASE:", API_BASE);
  }

  // Helper to stop any leftover media streams inside a container element
  function stopLeftoverStreams(container) {
    if (!container) return;
    const vids = container.querySelectorAll("video");
    vids.forEach((v) => {
      try {
        const s = v.srcObject;
        if (s && s.getTracks) {
          s.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {
              // ignore
            }
          });
        }
      } catch {
        // ignore
      }
      try {
        v.remove();
      } catch {
        // ignore
      }
    });
  }

  useEffect(() => {
    startScanner();

    return () => {
      // cleanup
      if (scannerInstanceRef.current) {
        try {
          scannerInstanceRef.current.clear();
        } catch {
          // ignore
        }
      }
      // also stop any leftover video streams in the container
      const container = document.getElementById("canteen-reader");
      stopLeftoverStreams(container);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    // Prevent concurrent starts which can open multiple camera previews
    if (scannerStartingRef.current) return;
    scannerStartingRef.current = true;

    setMessage("");
    setStudent(null);
    setIsProcessing(false);

    const config = { fps: 10, qrbox: { width: 300, height: 200 } };

    // If a previous instance exists, clear it first (await to let it remove DOM)
    if (scannerInstanceRef.current) {
      try {
        // clear() may remove DOM nodes; await to ensure it's done before we re-create
        await scannerInstanceRef.current.clear();
      } catch {
        // ignore errors from clear
      }
      scannerInstanceRef.current = null;
    }

    // (leftover streams will be stopped using the component-scoped helper)

    // Dynamically import html5-qrcode so Vite doesn't attempt to statically
    // resolve it during server-side analysis. This also ensures the module is
    // only loaded in the browser runtime.
    // Some html5-qrcode distributions expect bundled third-party deps (ZXing)
    // to be available. Loading the UMD/minified bundle via a script tag makes
    // sure all globals and third-party pieces are initialized correctly in
    // the browser runtime. We load it from the dev server's node_modules path.
    if (typeof window.Html5QrcodeScanner === "undefined") {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/node_modules/html5-qrcode/html5-qrcode.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load html5-qrcode script"));
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

    // Ensure container is present and empty to avoid DOM removeChild issues inside
    // the library when it manipulates children.
    const container = document.getElementById("canteen-reader");
    if (container) {
      container.innerHTML = "";
      // defensively stop any leftover media streams
      stopLeftoverStreams(container);
    }

  const html5QrcodeScanner = new Html5QrcodeScanner("canteen-reader", config, false);

    const onScanSuccess = async (decodedText) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setMessage("Processing...");

      // Stop scanner UI while processing
      try {
        await html5QrcodeScanner.clear();
      } catch {
        // ignore
      }

      try {
        const studentId = decodedText.trim();

        // Call backend API to get student details. Use explicit base so Vite dev server
        // doesn't accidentally route the request to itself (which would 404).
        const url = `${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}`;
        let res;
        try {
          res = await fetch(url);
          setApiStatus({ base: API_BASE, last: res.status });
        } catch (fetchErr) {
          setApiStatus({ base: API_BASE, last: 'network-error' });
          throw fetchErr;
        }
        if (!res.ok) {
          if (res.status === 404) {
            setMessage(`No student found for id: ${studentId}`);
          } else {
            setMessage(`Server error (${res.status})`);
          }
          setTimeout(() => {
            setIsProcessing(false);
            startScanner();
          }, 2000);
          return;
        }

        const data = await res.json();
  setApiStatus({ base: API_BASE, last: res.status });
        setStudent({ id: studentId, name: data.name || "(no name)", department: data.department || "(no dept)" });

        setMessage("✅ Student loaded");

        // Auto-clear after 5 seconds and restart scanner
        setTimeout(() => {
          setStudent(null);
          setMessage("");
          setIsProcessing(false);
          startScanner();
        }, 5000);
      } catch (err) {
        console.error(err);
        // Differentiate network/backend errors from scanner errors
        setMessage(err?.message || "Error processing scan. See console.");
        setTimeout(() => {
          setIsProcessing(false);
          startScanner();
        }, 3000);
      }
    };

    const onScanFailure = () => {
      // called for each failed scan attempt — we don't need to spam the UI
      // console.debug("scan failure", error);
    };

    try {
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      scannerInstanceRef.current = html5QrcodeScanner;
      scannerRef.current = html5QrcodeScanner;
    } catch (err) {
      console.error("Failed to render html5QrcodeScanner:", err);
      setMessage("Scanner initialization failed — see console.");
      // As a fallback, ensure container is emptied so subsequent attempts start fresh
      if (container) {
        try {
          stopLeftoverStreams(container);
          container.innerHTML = "";
        } catch {
          // ignore
        }
      }
      scannerStartingRef.current = false;
      return;
    }

    // Mark that starting is complete
    scannerStartingRef.current = false;
  }

  // No local DB ops here; the backend handles DB lookups. If you later want
  // the frontend to trigger coin deduction, call a POST/PUT endpoint here.

  return (
    <div className="flex flex-col items-center justify-center p-6">
      {import.meta.env.DEV && (
        <div className="mb-2 text-xs text-gray-500">
          API: <span className="font-mono">{apiStatus.base}</span> • last: <span className="font-mono">{String(apiStatus.last)}</span>
        </div>
      )}
      <div className="w-full max-w-2xl">
        <div className="bg-white shadow-md rounded-lg p-4 text-center">
          <h2 className="text-lg font-semibold mb-3">Canteen Scanner</h2>
          <p className="text-sm text-gray-500 mb-4">Point your laptop camera at the student ID barcode or QR code.</p>

          <div className="mx-auto" style={{ width: 360 }}>
            <div id="canteen-reader" className="rounded-md overflow-hidden" />
          </div>

          <div className="mt-4">
            {message && <div className="text-sm text-green-700">{message}</div>}
          </div>
        </div>

        {student && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-md font-medium">Student Details</h3>
            <div className="mt-2 text-sm text-gray-700">
              <div><span className="font-semibold">ID:</span> {student.id}</div>
              <div><span className="font-semibold">Name:</span> {student.name}</div>
              <div><span className="font-semibold">Department:</span> {student.department}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}