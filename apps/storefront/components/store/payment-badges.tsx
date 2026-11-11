/**
 * Accepted-payment marks.
 *
 * Only show a badge for a method that actually appears at checkout — a customer
 * who picks you because of a logo and then can't find it at payment is worse off
 * than one who never saw it.
 *
 * Card marks follow the card-payments switch and coin marks follow the crypto
 * addresses in /admin/settings, so neither can advertise a method checkout
 * isn't offering. Apple Pay and Amazon Pay default to off: both are enabled on the Stripe account but
 * neither is usable yet (Apple Pay needs domain verification; both need the
 * account to finish onboarding).
 */

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li
      title={label}
      className="flex h-8 w-12 items-center justify-center rounded-md border border-sand-200 bg-white"
    >
      <span className="sr-only">{label}</span>
      {children}
    </li>
  )
}

const COIN_STYLE: Record<string, { label: string; color: string }> = {
  BTC: { label: "Bitcoin", color: "#F7931A" },
  USDT: { label: "Tether (USDT)", color: "#26A17B" },
  USDC: { label: "USD Coin", color: "#2775CA" },
}

export function PaymentBadges({
  className = "",
  showCards = false,
  coins = [],
  showApplePay = false,
  showAmazonPay = false,
}: {
  className?: string
  /** Card marks only when card checkout is actually switched on. */
  showCards?: boolean
  /** Coins checkout is offering right now. */
  coins?: string[]
  showApplePay?: boolean
  showAmazonPay?: boolean
}) {
  if (!showCards && coins.length === 0) return null

  return (
    <ul
      aria-label="Accepted payment methods"
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
    >
      {coins.map((coin) => (
        <Tile key={coin} label={COIN_STYLE[coin]?.label ?? coin}>
          <span
            className="text-[10px] font-bold tracking-wide"
            style={{ color: COIN_STYLE[coin]?.color ?? "#514e48" }}
          >
            {coin}
          </span>
        </Tile>
      ))}

      {showCards && (
        <>
      <Tile label="Visa">
        <svg viewBox="0 0 40 13" className="h-3 w-auto" aria-hidden="true">
          <text
            x="0"
            y="11"
            fill="#1434CB"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="13"
            fontWeight="700"
            fontStyle="italic"
            letterSpacing="0.5"
          >
            VISA
          </text>
        </svg>
      </Tile>

      <Tile label="Mastercard">
        <svg viewBox="0 0 32 20" className="h-5 w-auto" aria-hidden="true">
          <circle cx="12" cy="10" r="8" fill="#EB001B" />
          <circle cx="20" cy="10" r="8" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </Tile>

      <Tile label="American Express">
        <svg viewBox="0 0 40 24" className="h-5 w-auto" aria-hidden="true">
          <rect width="40" height="24" rx="3" fill="#006FCF" />
          <text
            x="20"
            y="15.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.3"
          >
            AMEX
          </text>
        </svg>
      </Tile>

      <Tile label="Discover">
        <svg viewBox="0 0 44 14" className="h-2.5 w-auto" aria-hidden="true">
          <text
            x="0"
            y="11"
            fill="#4D4D4D"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="9"
            fontWeight="700"
          >
            DISC
          </text>
          <circle cx="34" cy="7.5" r="5" fill="#FF6000" />
        </svg>
      </Tile>

      {showApplePay && (
        <Tile label="Apple Pay">
          <svg viewBox="0 0 40 17" className="h-4 w-auto" aria-hidden="true">
            <text
              x="20"
              y="13"
              textAnchor="middle"
              fill="#000000"
              fontFamily="-apple-system, Helvetica, Arial, sans-serif"
              fontSize="12"
              fontWeight="600"
            >
               Pay
            </text>
          </svg>
        </Tile>
      )}

      {showAmazonPay && (
        <Tile label="Amazon Pay">
          <svg viewBox="0 0 40 18" className="h-4 w-auto" aria-hidden="true">
            <text
              x="20"
              y="11"
              textAnchor="middle"
              fill="#232F3E"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="10"
              fontWeight="600"
            >
              pay
            </text>
            <path
              d="M8 14c4 2.6 20 2.6 24 0"
              stroke="#FF9900"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </Tile>
      )}
        </>
      )}
    </ul>
  )
}
