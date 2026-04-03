"use client";

import { ShieldCheck, Wallet, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

// Dynamic payout tiers based on member count
function getPayoutTiers(memberCount: number): { label: string; pct: number; color: string }[] {
  if (memberCount <= 3) {
    return [{ label: "WINNER TAKES ALL", pct: 100, color: "text-yellow-500" }];
  }
  if (memberCount <= 5) {
    return [
      { label: "1ST PLACE", pct: 70, color: "text-yellow-500" },
      { label: "2ND PLACE", pct: 30, color: "text-gray-300" },
    ];
  }
  if (memberCount <= 7) {
    return [
      { label: "1ST PLACE", pct: 50, color: "text-yellow-500" },
      { label: "2ND PLACE", pct: 30, color: "text-gray-300" },
      { label: "3RD PLACE", pct: 20, color: "text-red-500" },
    ];
  }
  // 8+ players
  return [
    { label: "1ST PLACE", pct: 50, color: "text-yellow-500" },
    { label: "2ND PLACE", pct: 25, color: "text-gray-300" },
    { label: "3RD PLACE", pct: 15, color: "text-red-500" },
    { label: "4TH PLACE", pct: 10, color: "text-gray-500" },
  ];
}

export default function TreasurerCard({
  leagueName,
  membersCount,
  entryFee = 100
}: {
  leagueName: string;
  membersCount: number;
  entryFee?: number;
}) {
  const [hasPaid, setHasPaid] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalPool = membersCount * entryFee;
  const payoutTiers = getPayoutTiers(membersCount);

  // UPI payment link
  const upiId = "[REDACTED-UPI]";
  const upiLink = `upi://pay?pa=${upiId}&pn=HITMAN&am=${entryFee}&tn=HITMAN_League_${leagueName.replace(/\s+/g, "_")}`;

  useEffect(() => {
    // Generate a real QR code
    QRCode.toDataURL(upiLink, {
      width: 180,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.error("QR code generation failed:", err);
    });
  }, [upiLink]);

  return (
    <div className="glass-panel p-6 lg:p-8 rounded-sm w-full max-w-2xl mx-auto mt-8 border-red-500/20">
      <div className="flex flex-col md:flex-row gap-8 items-start">

        {/* Left: Pool Distribution */}
        <div className="flex-1 space-y-6 w-full">
          <div>
            <h3 className="text-xl font-bold text-white font-mono tracking-widest flex items-center mb-2">
              <Wallet className="mr-2 text-red-500" />
              TREASURER POOL
            </h3>
            <p className="text-gray-400 font-mono text-sm">{leagueName}</p>
          </div>

          <div className="bg-black/50 p-4 rounded-sm border border-white/10 font-mono space-y-3">
            <div className="flex justify-between text-gray-300 text-sm">
              <span className="flex items-center space-x-2">
                <Users size={14} className="text-red-500" />
                <span>ACTIVE PLAYERS</span>
              </span>
              <span className="text-white font-bold">{membersCount}</span>
            </div>
            <div className="flex justify-between text-gray-300 text-sm">
              <span>ENTRY FEE</span>
              <span className="text-white font-bold">₹{entryFee}</span>
            </div>
            <div className="flex justify-between text-red-500 font-bold border-t border-white/10 pt-3 mt-3">
              <span>TOTAL PRIZE POOL</span>
              <span className="text-xl">₹{totalPool.toLocaleString("en-IN")}</span>
            </div>
            {/* Pool growth indicator */}
            <div className="pt-2">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
                <span>POOL GROWTH</span>
                <span>{membersCount} / 30 players</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-400 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (membersCount / 30) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Payout Distribution */}
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-gray-400 tracking-widest text-xs">PAYOUT DISTRIBUTION</h4>
              <span className="text-[9px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-sm border border-white/10">
                {membersCount <= 3 ? "WTA MODE" : membersCount <= 5 ? "TOP 2" : membersCount <= 7 ? "TOP 3" : "TOP 4"}
              </span>
            </div>
            {payoutTiers.map((tier, i) => (
              <div key={i} className="flex justify-between text-white bg-white/5 px-3 py-2 border border-white/10 rounded-sm">
                <span className={`${tier.color} font-bold`}>{tier.label} ({tier.pct}%)</span>
                <span className="font-bold">₹{Math.floor(totalPool * tier.pct / 100).toLocaleString("en-IN")}</span>
              </div>
            ))}
            <p className="text-[9px] text-gray-600 font-mono mt-2">
              * Payout tiers auto-adjust as more players join. Currently in{" "}
              {membersCount <= 3 ? "winner-takes-all" : membersCount <= 5 ? "top-2" : membersCount <= 7 ? "top-3" : "top-4"} mode.
            </p>
          </div>
        </div>

        {/* Right: Real Payment QR */}
        <div className="w-full md:w-64 flex flex-col items-center p-6 bg-black/80 border border-white/10 rounded-sm">
          {!hasPaid ? (
            <>
              <div className="text-center mb-4">
                <span className="text-red-500 font-bold font-mono tracking-widest text-sm block mb-1">SCAN TO PAY</span>
                <span className="text-white text-xs font-mono opacity-50">UPI PAYMENT</span>
              </div>

              {qrDataUrl ? (
                <div className="bg-white p-2 rounded-sm border-2 border-red-500 mb-4">
                  <img src={qrDataUrl} alt="Pay via UPI" className="w-[160px] h-[160px]" />
                </div>
              ) : (
                <div className="w-[160px] h-[160px] bg-gray-800 rounded-sm mb-4 flex items-center justify-center">
                  <span className="text-gray-500 text-xs font-mono animate-pulse">Loading QR...</span>
                </div>
              )}

              <div className="text-center mb-4">
                <div className="text-white font-mono text-xs font-bold">₹{entryFee}</div>
                <div className="text-gray-500 text-[9px] font-mono mt-1 break-all">{upiId}</div>
              </div>

              <button
                onClick={() => setHasPaid(true)}
                className="w-full neo-brutal bg-red-600 text-white font-bold font-mono py-2 rounded-sm hover:bg-red-500 transition text-sm"
              >
                CONFIRM PAYMENT
              </button>
              <p className="text-[8px] text-gray-600 mt-2 text-center font-mono">
                Scan with any UPI app (GPay, PhonePe, Paytm)
              </p>
            </>
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-10 space-y-4">
              <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50">
                <ShieldCheck size={32} className="text-green-500" />
              </div>
              <h4 className="text-green-500 font-bold font-mono text-center">PAYMENT SECURED</h4>
              <p className="text-gray-400 text-xs font-mono text-center">Your entry fee of ₹{entryFee} has been recorded. Your team is locked in.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
