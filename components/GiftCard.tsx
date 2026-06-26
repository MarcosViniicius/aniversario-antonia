'use client'

import { Sparkles, Home, ShoppingBag, ChefHat, Gem, Banknote, Lock, CheckCircle2 } from 'lucide-react'
import { type Gift, categoryConfig, type GiftCategory } from '@/lib/gifts-data'

const categoryIcons: Record<GiftCategory, React.ElementType> = {
  beleza:    Sparkles,
  casa:      Home,
  calcados:  ShoppingBag,
  cozinha:   ChefHat,
  acessorios: Gem,
  pix:       Banknote,
}

interface ClaimRecord {
  claimedBy: string
  claimedAt: string
}

interface Props {
  gift: Gift
  claim?: ClaimRecord
  isMyGift: boolean
  hasUserClaimed: boolean
  onClick: () => void
}

export default function GiftCard({ gift, claim, isMyGift, hasUserClaimed, onClick }: Props) {
  const cfg = categoryConfig[gift.category]
  const Icon = categoryIcons[gift.category]
  const isClaimed = !!claim
  const canClick = !isClaimed && !hasUserClaimed

  const borderColor = isMyGift
    ? '#4CAF9A'
    : isClaimed
    ? '#E5D5CF'
    : cfg.borderColor

  const bgColor = isMyGift
    ? '#EDF7F5'
    : isClaimed
    ? '#F8F5F3'
    : 'white'

  return (
    <div
      role={canClick ? 'button' : undefined}
      tabIndex={canClick ? 0 : undefined}
      onClick={canClick ? onClick : undefined}
      onKeyDown={canClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      aria-label={
        isMyGift
          ? `Seu presente: ${gift.name}`
          : isClaimed
          ? `${gift.name} — escolhido por ${claim!.claimedBy}`
          : `${gift.name} — disponível, clique para escolher`
      }
      className="relative rounded-2xl p-4 border-2 flex flex-col gap-2 select-none"
      style={{
        backgroundColor: bgColor,
        borderColor,
        cursor: canClick ? 'pointer' : 'default',
        opacity: isClaimed && !isMyGift ? 0.72 : 1,
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        boxShadow: canClick ? undefined : 'none',
      }}
      onMouseEnter={(e) => {
        if (!canClick) return
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(201,132,107,0.18)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = ''
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
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
      {/* Header row */}
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
            Seu presente
          </span>
        )}
        {isClaimed && !isMyGift && (
          <span className="ml-auto">
            <Lock size={13} style={{ color: '#C0A898' }} />
          </span>
        )}
      </div>

      {/* Name */}
      <p
        className="text-sm font-semibold leading-snug"
        style={{ color: isClaimed && !isMyGift ? '#A08070' : '#3D2B1F' }}
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
      {isClaimed ? (
        <div className="flex items-center gap-1.5 mt-auto">
          <CheckCircle2 size={12} style={{ color: isMyGift ? '#4CAF9A' : '#C0A898' }} />
          <span className="text-xs" style={{ color: isMyGift ? '#2D8070' : '#A08070' }}>
            {claim!.claimedBy}
          </span>
        </div>
      ) : (
        !hasUserClaimed && (
          <div className="mt-auto">
            <span
              className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
            >
              Disponível — clique para escolher
            </span>
          </div>
        )
      )}
    </div>
  )
}
