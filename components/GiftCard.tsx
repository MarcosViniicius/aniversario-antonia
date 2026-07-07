'use client'

import { Sparkles, Home, ShoppingBag, ChefHat, Gem, Banknote, Lock, CheckCircle2, Users, PlusCircle } from 'lucide-react'
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
  claims: ClaimRecord[]
  isMyGift: boolean
  userClaimsCount: number  // 0 | 1 | 2
  onClick: () => void
}

export default function GiftCard({ gift, claims, isMyGift, userClaimsCount, onClick }: Props) {
  const cfg  = categoryConfig[gift.category]
  const Icon = categoryIcons[gift.category]

  const isUnlimited = gift.limit === null
  const isFull      = !isUnlimited && claims.length >= (gift.limit ?? 1)
  const canClick    = !isFull && !isMyGift && userClaimsCount < 2

  const borderColor = isMyGift  ? '#4CAF9A'
    : isFull        ? '#E5D5CF'
    : canClick && userClaimsCount === 1 ? '#C9A84C'
    : cfg.borderColor

  const bgColor = isMyGift ? '#EDF7F5'
    : isFull     ? '#F8F5F3'
    : 'white'

  const ariaLabel = isMyGift
    ? `Seu presente: ${gift.name}`
    : isFull
    ? `${gift.name} — já escolhido`
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
        opacity:   isFull && !isMyGift ? 0.65 : 1,
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!canClick) return
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = userClaimsCount === 1
          ? '0 6px 20px rgba(201,168,76,0.22)'
          : '0 6px 20px rgba(201,132,107,0.18)'
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

        {isMyGift && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#4CAF9A', color: 'white' }}>
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
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>{claims.length}</span>
          </div>
        )}
        {/* "2º presente" badge */}
        {canClick && userClaimsCount === 1 && (
          <div className="ml-auto flex items-center gap-1">
            <PlusCircle size={13} style={{ color: '#C9A84C' }} />
          </div>
        )}
      </div>

      {/* Gift name */}
      <p className="text-sm font-semibold leading-snug"
        style={{ color: isFull && !isMyGift ? '#A08070' : '#3D2B1F' }}>
        {gift.name}
      </p>

      {/* Brand */}
      {gift.brand && (
        <p className="text-xs" style={{ color: '#B08070' }}>{gift.brand}</p>
      )}

      {/* Footer */}
      {isUnlimited ? (
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
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                {userClaimsCount === 1
                  ? 'Adicionar como 2º presente'
                  : claims.length === 0
                  ? 'Seja o primeiro a contribuir'
                  : `${claims.length} contribuindo — participe também`}
              </span>
              {process.env.NEXT_PUBLIC_PIX_KEY ? (
                <p className="text-xs mt-2 font-mono break-all" style={{ color: '#2D8070' }}>
                  Chave: {process.env.NEXT_PUBLIC_PIX_KEY}
                </p>
              ) : (
                <p className="text-xs mt-2" style={{ color: '#8A9A96' }}>
                  Sua intenção será registrada. A chave Pix será informada no evento.
                </p>
              )}
            </>
          )}
        </div>
      ) : isFull ? (
        <div className="flex items-center gap-1.5 mt-auto">
          <CheckCircle2 size={12} style={{ color: isMyGift ? '#4CAF9A' : '#C0A898' }} />
          <span className="text-xs" style={{ color: isMyGift ? '#2D8070' : '#A08070' }}>
            {claims[0]?.claimedBy}
          </span>
        </div>
      ) : (
        <div className="mt-auto">
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: userClaimsCount === 1 ? '#FDF6E8' : cfg.bgColor,
              color:           userClaimsCount === 1 ? '#C9A84C'  : cfg.color,
            }}>
            {userClaimsCount === 1
              ? 'Adicionar como 2º presente'
              : 'Disponível — clique para escolher'}
          </span>
        </div>
      )}
    </div>
  )
}
