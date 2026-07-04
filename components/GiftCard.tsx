'use client'

import { Sparkles, Home, ShoppingBag, ChefHat, Gem, Banknote, Lock, CheckCircle2, Users } from 'lucide-react'
import { type Gift, categoryConfig, type GiftCategory } from '@/lib/gifts-data'

const categoryIcons: Record<GiftCategory, React.ElementType> = {
  beleza:     Sparkles,
  casa:       Home,
  calcados:   ShoppingBag,
  cozinha:    ChefHat,
  acessorios: Gem,
  pix:        Banknote,
}

interface ClaimRecord {
  claimedBy: string
  claimedAt: string
}

interface Props {
  gift: Gift
  claims: ClaimRecord[]   // array of claimants for this gift
  isMyGift: boolean       // current user has claimed this gift
  hasUserClaimed: boolean // current user has claimed ANY gift
  onClick: () => void
}

export default function GiftCard({ gift, claims, isMyGift, hasUserClaimed, onClick }: Props) {
  const cfg  = categoryConfig[gift.category]
  const Icon = categoryIcons[gift.category]

  const isUnlimited = gift.limit === null
  const isFull      = !isUnlimited && claims.length >= (gift.limit ?? 1)
  const canClick    = !isFull && !isMyGift

  // Visual state
  const borderColor = isMyGift  ? '#4CAF9A'
    : isFull        ? '#E5D5CF'
    : cfg.borderColor

  const bgColor = isMyGift ? '#EDF7F5'
    : isFull     ? '#F8F5F3'
    : 'white'

  const ariaLabel = isMyGift
    ? `Seu presente: ${gift.name}`
    : isFull
    ? `${gift.name} — já escolhido por ${claims[0]?.claimedBy}`
    : isUnlimited
    ? `${gift.name} — contribuição, ${claims.length} pessoa(s) já contribuindo`
    : `${gift.name} — disponível, clique para escolher`

  return (
    <div
      role={canClick ? 'button' : undefined}
      tabIndex={canClick ? 0 : undefined}
      onClick={canClick ? onClick : undefined}
      onKeyDown={canClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      aria-label={ariaLabel}
      className="relative rounded-2xl p-4 border-2 flex flex-col gap-2 select-none"
      style={{
        backgroundColor: bgColor,
        borderColor,
        cursor:    canClick ? 'pointer' : 'default',
        opacity:   isFull && !isMyGift ? 0.68 : 1,
        transition: 'transform 150ms ease, box-shadow 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!canClick) return
        const el = e.currentTarget as HTMLDivElement
        el.style.transform  = 'translateY(-2px)'
        el.style.boxShadow  = '0 6px 20px rgba(201,132,107,0.18)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
      }}
      onMouseDown={(e) => {
        if (!canClick) return
        ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(0.97)'
      }}
      onMouseUp={(e) => {
        if (!canClick) return
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
    >
      {/* Category row */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isMyGift ? '#C8EDE7' : cfg.bgColor }}
        >
          <Icon size={14} style={{ color: isMyGift ? '#4CAF9A' : cfg.color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: isMyGift ? '#4CAF9A' : cfg.color }}>
          {cfg.label}
        </span>

        {/* Status chip */}
        {isMyGift && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#4CAF9A', color: 'white' }}
          >
            {isUnlimited ? 'Você contribui' : 'Seu presente'}
          </span>
        )}
        {isFull && !isMyGift && (
          <span className="ml-auto">
            <Lock size={13} style={{ color: '#C0A898' }} />
          </span>
        )}
        {isUnlimited && !isMyGift && claims.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <Users size={12} style={{ color: cfg.color }} />
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>
              {claims.length}
            </span>
          </div>
        )}
      </div>

      {/* Gift name */}
      <p
        className="text-sm font-semibold leading-snug"
        style={{ color: isFull && !isMyGift ? '#A08070' : '#3D2B1F' }}
      >
        {gift.name}
      </p>

      {/* Brand */}
      {gift.brand && (
        <p className="text-xs" style={{ color: '#B08070' }}>
          {gift.brand}
        </p>
      )}

      {/* Footer */}
      {isUnlimited ? (
        // PIX footer
        <div className="mt-auto">
          {isMyGift ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} style={{ color: '#4CAF9A' }} />
              <span className="text-xs" style={{ color: '#2D8070' }}>
                {claims.find(c => c.claimedBy)?.claimedBy ?? ''} está contribuindo
              </span>
            </div>
          ) : (
            <>
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
              >
                {hasUserClaimed
                  ? 'Clique para substituir'
                  : claims.length === 0
                  ? 'Seja o primeiro a contribuir'
                  : `${claims.length} contribuindo — participe também`}
              </span>
              <p className="text-xs mt-2" style={{ color: '#8A9A96' }}>
                Sua intenção será registrada. A chave Pix será informada no evento.
              </p>
            </>
          )}
        </div>
      ) : isFull ? (
        // Regular gift — claimed
        <div className="flex items-center gap-1.5 mt-auto">
          <CheckCircle2 size={12} style={{ color: isMyGift ? '#4CAF9A' : '#C0A898' }} />
          <span className="text-xs" style={{ color: isMyGift ? '#2D8070' : '#A08070' }}>
            {claims[0]?.claimedBy}
          </span>
        </div>
      ) : (
        // Regular gift — available
        <div className="mt-auto">
          <span
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
          >
            {hasUserClaimed ? 'Clique para substituir' : 'Disponível — clique para escolher'}
          </span>
        </div>
      )}
    </div>
  )
}
