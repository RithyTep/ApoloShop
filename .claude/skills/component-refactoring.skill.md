# Component Refactoring Skill

> Sources: [langgenius/dify](https://github.com/langgenius/dify), [LovroPodobnik/refactoring-ui-skill](https://github.com/LovroPodobnik/refactoring-ui-skill)

## Overview

This skill provides systematic guidance for refactoring React components following clean code principles, DRY (Don't Repeat Yourself), and UI design best practices.

## Core Principles

### 1. Clarity Over Cleverness
- Prefer explicit, readable code over clever one-liners
- Use descriptive variable and function names
- Break complex logic into named helper functions

### 2. Systems Over Ad-hoc Decisions
- Establish restrictive design systems for spacing, typography, and color
- Define component patterns before implementation
- Use consistent naming conventions

### 3. Single Responsibility
- Each component should do one thing well
- Extract complex logic into custom hooks
- Separate presentation from business logic

## When to Refactor

### Code Smells Indicating Refactoring Need

1. **Component too large** (>300 lines)
   - Split into smaller, focused components
   - Extract reusable hooks

2. **Prop drilling** (>3 levels deep)
   - Consider Context API or state management
   - Create intermediate container components

3. **Duplicate code** (same logic in 3+ places)
   - Extract into reusable utilities
   - Create shared components or hooks

4. **Complex conditionals**
   - Use early returns
   - Extract into well-named functions
   - Consider polymorphism or strategy pattern

5. **Mixed concerns**
   - Separate UI from data fetching
   - Extract API calls into service layer
   - Use custom hooks for state logic

## Refactoring Workflow

### Step 1: Analyze Component Complexity

```bash
# Identify metrics
- Lines of code
- Number of props
- Number of useState/useEffect calls
- Cyclomatic complexity
```

### Step 2: Identify Extraction Opportunities

```typescript
// BEFORE: Complex component
function ProductPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  
  useEffect(() => {
    // fetch logic
  }, [])
  
  const filteredProducts = useMemo(() => {
    // filter logic
  }, [products, filter])
  
  // 200+ lines of JSX...
}

// AFTER: Clean separation
function ProductPage() {
  const { products, loading, error } = useProducts()
  const { filter, setFilter, filteredProducts } = useProductFilter(products)
  
  if (loading) return <ProductSkeleton />
  if (error) return <ErrorState error={error} />
  
  return (
    <ProductLayout>
      <ProductFilter value={filter} onChange={setFilter} />
      <ProductGrid products={filteredProducts} />
    </ProductLayout>
  )
}
```

### Step 3: Extract Custom Hooks

```typescript
// hooks/useProducts.ts
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { products, loading, error, refetch: fetchProducts }
}
```

### Step 4: Extract Child Components

```typescript
// Extract when:
// - Section is reused elsewhere
// - Section is independently testable
// - Section has its own state
// - Section improves readability

// ProductCard.tsx
interface ProductCardProps {
  product: Product
  onAddToCart: (id: string) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card>
      <ProductImage src={product.image} alt={product.name} />
      <ProductInfo name={product.name} price={product.price} />
      <AddToCartButton onClick={() => onAddToCart(product.id)} />
    </Card>
  )
}
```

## Component Patterns

### Compound Components
```typescript
// Use for related components that share state
<Tabs>
  <Tabs.List>
    <Tabs.Tab>Tab 1</Tabs.Tab>
    <Tabs.Tab>Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel>Content 1</Tabs.Panel>
    <Tabs.Panel>Content 2</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
```

### Render Props / Children as Function
```typescript
// Use for flexible rendering logic
<DataFetcher url="/api/products">
  {({ data, loading, error }) => (
    loading ? <Spinner /> : <ProductList products={data} />
  )}
</DataFetcher>
```

### Container/Presenter Pattern
```typescript
// Container: handles data and logic
function ProductListContainer() {
  const { products, loading } = useProducts()
  return <ProductListPresenter products={products} loading={loading} />
}

// Presenter: handles rendering
function ProductListPresenter({ products, loading }: Props) {
  if (loading) return <Skeleton />
  return <ul>{products.map(p => <ProductItem key={p.id} {...p} />)}</ul>
}
```

## UI Refactoring Guidelines

### Visual Hierarchy
- Use font size, weight, and color to establish importance
- Primary actions should be most prominent
- Secondary elements should recede visually

### Layout and Spacing
- Use consistent spacing scale (4, 8, 12, 16, 24, 32, 48, 64)
- Group related elements with consistent padding
- Use whitespace to separate distinct sections

### Component Size Guidelines
```
Small components:   < 50 lines  (ideal)
Medium components:  50-150 lines (acceptable)
Large components:   150-300 lines (consider refactoring)
Very large:         > 300 lines (definitely refactor)
```

## ApoloShop-Specific Patterns

### Page Components
```typescript
// Pattern for admin pages
export function ProductsPage() {
  const { t } = useTranslation()
  
  return (
    <PageLayout>
      <PageHeader 
        title={t('products.title')} 
        action={<CreateProductButton />}
      />
      <PageContent>
        <ProductFilters />
        <ProductTable />
      </PageContent>
    </PageLayout>
  )
}
```

### Form Components
```typescript
// Use React Hook Form pattern
export function ProductForm({ onSubmit }: Props) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  })
  
  return (
    <Form {...form}>
      <FormField name="name" control={form.control} />
      <FormField name="price" control={form.control} />
      <FormField name="category" control={form.control} />
      <SubmitButton loading={form.formState.isSubmitting} />
    </Form>
  )
}
```

## Refactoring Checklist

Before refactoring:
- [ ] Write tests for current behavior
- [ ] Identify specific improvement goals
- [ ] Plan extraction points

During refactoring:
- [ ] Make small, incremental changes
- [ ] Keep tests passing at each step
- [ ] Commit frequently

After refactoring:
- [ ] Verify all tests pass
- [ ] Check for performance regressions
- [ ] Update documentation if needed
- [ ] Review with team if significant changes

## Anti-Patterns to Avoid

1. **Premature optimization** - Don't extract until needed
2. **Over-abstraction** - Keep it simple until complexity demands it
3. **Prop explosion** - Too many props signals component does too much
4. **Utility dump components** - Every component should have clear purpose
5. **Deep nesting** - Flatten component hierarchy where possible

## Resources

- [React Patterns](https://reactpatterns.com/)
- [Refactoring UI](https://refactoringui.com/)
- [Clean Code in JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Kent C. Dodds - Application State Management](https://kentcdodds.com/blog/application-state-management-with-react)
