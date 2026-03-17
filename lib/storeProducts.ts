/**
 * Premium ve Kredi ürün kuralları + mağaza metinleri
 */

export const PREMIUM_BENEFITS = {
  tr: [
    'Sınırsız mesaj — Arkadaş olmasanız da herkese yazın',
    'Gelişmiş filtreler — Tüm filtre seçenekleri açık',
    'Profilinizi kim gördü — Ziyaretçi listesini tam görün',
    'Öne çıkan profil — Keşfet\'te daha üst sıralarda',
  ],
  en: [
    'Unlimited messages — Chat with anyone, not just friends',
    'Advanced filters — All filter options unlocked',
    'Who viewed you — See your full visitor list',
    'Featured profile — Rank higher in Explore',
  ],
} as const;

export const CREDIT_RULES = {
  tr: {
    messagePerCredit: 1,
    description: 'Premium değilseniz arkadaş olmayan biriyle her mesaj 1 kredi harcar. Arkadaşlarla mesajlaşma ücretsiz.',
  },
  en: {
    messagePerCredit: 1,
    description: 'Without Premium, each message to a non-friend costs 1 credit. Messaging with friends is free.',
  },
} as const;

export const CREDIT_PACKAGES = [
  { id: 'pack_50', credits: 50, priceLabelTr: '₺19,99', priceLabelEn: '$4.99', popular: false },
  { id: 'pack_150', credits: 150, priceLabelTr: '₺49,99', priceLabelEn: '$9.99', popular: true },
  { id: 'pack_500', credits: 500, priceLabelTr: '₺129,99', priceLabelEn: '$24.99', popular: false },
] as const;

export const PREMIUM_PRICE = {
  tr: '₺79,99/ay',
  en: '$14.99/mo',
} as const;

export type PremiumPlanId = 'monthly' | '3month' | 'yearly';

export const PREMIUM_PLANS: Array<{
  id: PremiumPlanId;
  months: number;
  labelTr: string;
  labelEn: string;
  priceTr: string;
  priceEn: string;
  popular?: boolean;
}> = [
  { id: 'monthly', months: 1, labelTr: '1 Aylık', labelEn: '1 Month', priceTr: '₺79,99', priceEn: '$14.99', popular: false },
  { id: '3month', months: 3, labelTr: '3 Aylık', labelEn: '3 Months', priceTr: '₺199,99', priceEn: '$34.99', popular: false },
  { id: 'yearly', months: 12, labelTr: '1 Yıllık', labelEn: '1 Year', priceTr: '₺599,99', priceEn: '$99.99', popular: true },
];
