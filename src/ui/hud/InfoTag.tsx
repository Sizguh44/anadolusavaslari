// Durum etiketi — içeriğine göre anlamlı ton atar.
// İçerdiği string'e bakarak modunu çıkarır (İlhak/İntikal/Saldırı/Başkent/…).
// Yeni etiket tonları eklendiğinde yalnızca bu eşleme ve stil tabanı güncellenir.

import type { ReactNode } from 'react'

export type InfoTagTone =
  | 'neutral'
  | 'annex'
  | 'transfer'
  | 'attack'
  | 'capital'
  | 'source'
  | 'target'
  | 'cap-full'
  | 'espionage'
  | 'investment'

function inferTone(label: string): InfoTagTone {
  if (label === 'İlhak') return 'annex'
  if (label === 'İntikal') return 'transfer'
  if (label === 'Saldırı') return 'attack'
  if (label === 'Başkent') return 'capital'
  if (label === 'Kaynak') return 'source'
  if (label === 'Hedef') return 'target'
  if (label === 'Ordu tavan' || label === 'Sur tavan') return 'cap-full'
  if (label.startsWith('Casus')) return 'espionage'
  if (label.startsWith('Yatırım')) return 'investment'
  return 'neutral'
}

interface InfoTagProps {
  tone?: InfoTagTone
  children: ReactNode
}

export function InfoTag({ tone, children }: InfoTagProps) {
  const inferred = tone ?? (typeof children === 'string' ? inferTone(children) : 'neutral')
  return <span className={`info-tag info-tag--${inferred}`}>{children}</span>
}
