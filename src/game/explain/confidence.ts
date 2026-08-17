import type { ConfidenceStars } from '../strategy/recommend'

export function renderStars(stars: ConfidenceStars): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}
