import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Centralized utility to merge Tailwind CSS classes cleanly,
 * resolving conflicting utility classes and conditionals.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export default cn
