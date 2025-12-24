import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('should merge Tailwind classes correctly', () => {
    // Later class should override earlier conflicting classes
    expect(cn('px-4', 'px-6')).toBe('px-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('bg-white', 'bg-black')).toBe('bg-black')
  })

  it('should handle arrays of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })

  it('should handle objects with boolean values', () => {
    expect(cn({
      'base-class': true,
      'active-class': true,
      'disabled-class': false,
    })).toBe('base-class active-class')
  })

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'other')).toBe('base other')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })

  it('should handle complex Tailwind patterns', () => {
    expect(cn(
      'p-4 rounded-md bg-white',
      'hover:bg-gray-100',
      'p-6' // Should override p-4
    )).toBe('rounded-md bg-white hover:bg-gray-100 p-6')
  })

  it('should handle responsive prefixes', () => {
    expect(cn('md:p-4', 'lg:p-6', 'md:p-8')).toBe('lg:p-6 md:p-8')
  })
})
