'use client';

/**
 * Phase 5A: Market Ticker
 * Bottom ticker showing market signals (informational only)
 */

const MARKET_DATA = [
  { label: 'Cement (OPC 53)', value: '₹380/bag', change: '-2.0%', negative: true },
  { label: 'Steel (TMT FE500)', value: '₹58,000/ton', change: '+1.5%', negative: false },
  { label: 'Bitumen (VG-30)', value: '₹42/kg', change: 'Stable', negative: false },
];

export default function MarketTicker() {
  return (
    <div className="h-12 bg-gray-900 text-white flex items-center px-6 overflow-hidden">
      <div className="flex items-center gap-8 animate-scroll">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Indicative Market Signals
        </span>
        {MARKET_DATA.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
            <span
              className={`text-xs ${
                item.negative ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
