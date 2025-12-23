import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductGrid } from '@/components/product-grid'

// Mock the API hooks
vi.mock('@/lib/api-hooks', () => ({
  useProducts: vi.fn(),
  useCategories: vi.fn(),
}))

import { useProducts, useCategories } from '@/lib/api-hooks'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('ProductGrid', () => {
  const mockOnAddToCart = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading skeleton', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: undefined,
    } as never)

    const { container } = render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="EN" />,
      { wrapper: createWrapper() }
    )

    // Check for loading state - either skeleton or loading indicator
    const hasLoadingElements = container.querySelectorAll('[class*="skeleton"], [class*="Skeleton"], [class*="animate"]').length > 0
    expect(hasLoadingElements || container.textContent?.includes('Loading')).toBeTruthy()
  })

  it('should render products', async () => {
    const mockProducts = {
      products: [
        {
          id: '1',
          nameEn: 'Espresso',
          nameKh: 'អេស្ប្រេសូ',
          priceUsd: 2.5,
          priceKhr: 10000,
          isActive: true,
          inventory: { quantity: 10 },
        },
        {
          id: '2',
          nameEn: 'Latte',
          nameKh: 'ឡាតេ',
          priceUsd: 4.0,
          priceKhr: 16000,
          isActive: true,
          inventory: { quantity: 5 },
        },
      ],
    }

    vi.mocked(useProducts).mockReturnValue({
      data: mockProducts,
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: { categories: [] },
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="EN" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Espresso')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('$2.50')).toBeInTheDocument()
    expect(screen.getByText('$4.00')).toBeInTheDocument()
  })

  it('should display KHR prices when currency is KHR', () => {
    const mockProducts = {
      products: [
        {
          id: '1',
          nameEn: 'Espresso',
          nameKh: 'អេស្ប្រេសូ',
          priceUsd: 2.5,
          priceKhr: 10000,
          isActive: true,
          inventory: { quantity: 10 },
        },
      ],
    }

    vi.mocked(useProducts).mockReturnValue({
      data: mockProducts,
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: { categories: [] },
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="KHR" language="EN" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('10,000៛')).toBeInTheDocument()
  })

  it('should display Khmer names when language is KH', () => {
    const mockProducts = {
      products: [
        {
          id: '1',
          nameEn: 'Espresso',
          nameKh: 'អេស្ប្រេសូ',
          priceUsd: 2.5,
          priceKhr: 10000,
          isActive: true,
          inventory: { quantity: 10 },
        },
      ],
    }

    vi.mocked(useProducts).mockReturnValue({
      data: mockProducts,
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: { categories: [] },
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="KH" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('អេស្ប្រេសូ')).toBeInTheDocument()
    expect(screen.getByText('ផលិតផលរបស់យើង')).toBeInTheDocument()
  })

  it('should call onAddToCart when button is clicked', async () => {
    const user = userEvent.setup()
    const mockProducts = {
      products: [
        {
          id: '1',
          nameEn: 'Espresso',
          nameKh: 'អេស្ប្រេសូ',
          priceUsd: 2.5,
          priceKhr: 10000,
          imageUrl: '/espresso.jpg',
          isActive: true,
          inventory: { quantity: 10 },
        },
      ],
    }

    vi.mocked(useProducts).mockReturnValue({
      data: mockProducts,
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: { categories: [] },
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="EN" />,
      { wrapper: createWrapper() }
    )

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    await user.click(addButton)

    expect(mockOnAddToCart).toHaveBeenCalledWith('1', 'Espresso', 2.5, '/espresso.jpg')
  })

  it('should disable add to cart for out of stock items', () => {
    const mockProducts = {
      products: [
        {
          id: '1',
          nameEn: 'Out of Stock Item',
          nameKh: 'អស់ស្តុក',
          priceUsd: 5,
          priceKhr: 20000,
          isActive: true,
          inventory: { quantity: 0 },
        },
      ],
    }

    vi.mocked(useProducts).mockReturnValue({
      data: mockProducts,
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: { categories: [] },
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="EN" />,
      { wrapper: createWrapper() }
    )

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    expect(addButton).toBeDisabled()
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })

  it('should render category filters', async () => {
    const mockCategories = {
      categories: [
        { id: 'cat-1', nameEn: 'Coffee', nameKh: 'កាហ្វេ', isActive: true },
        { id: 'cat-2', nameEn: 'Tea', nameKh: 'តែ', isActive: true },
      ],
    }

    vi.mocked(useProducts).mockReturnValue({
      data: { products: [] },
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: mockCategories,
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="EN" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tea' })).toBeInTheDocument()
  })

  it('should show empty state when no products', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: { products: [] },
      isLoading: false,
    } as never)
    vi.mocked(useCategories).mockReturnValue({
      data: { categories: [] },
    } as never)

    render(
      <ProductGrid onAddToCart={mockOnAddToCart} currency="USD" language="EN" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('No products available')).toBeInTheDocument()
  })
})
