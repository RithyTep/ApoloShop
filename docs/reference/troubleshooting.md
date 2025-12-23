# Troubleshooting

## Common Issues

### Database Connection

**Error:** `Can't reach database server`

**Solution:**
1. Check DATABASE_URL in `.env`
2. Verify database is running
3. Check network/firewall settings

```bash
# Test connection
bunx prisma db pull
```

---

### Prisma Schema Sync

**Error:** `The database schema is not in sync`

**Solution:**
```bash
# Push schema changes
bunx prisma db push

# Or reset and reseed (dev only)
bunx prisma db push --force-reset
bun run db:seed
```

---

### Authentication Issues

**Issue:** Login successful but not redirecting

**Cause:** Router.push doesn't trigger cookie refresh

**Solution:** Use hard navigation
```tsx
// Instead of
router.push('/admin')

// Use
window.location.href = '/admin'
```

---

**Issue:** Session not persisting

**Cause:** Cookie not being set properly

**Check:**
1. JWT_SECRET is set in `.env`
2. Cookie domain matches
3. HTTPS in production

---

### Build Errors

**Error:** `Module not found: @/components/...`

**Solution:**
1. Check import path casing (Linux is case-sensitive)
2. Verify file exists
3. Restart dev server

```bash
# Clear cache and rebuild
rm -rf .next
bun dev
```

---

**Error:** `Type error: Property 'X' does not exist`

**Solution:**
```bash
# Regenerate Prisma types
bunx prisma generate
```

---

### React Query Issues

**Issue:** Data not updating after mutation

**Solution:** Invalidate queries after mutation
```tsx
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: updateOrder,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }
})
```

---

**Issue:** Infinite refetching

**Cause:** Unstable query key reference

**Solution:**
```tsx
// Bad - creates new object each render
useQuery({ queryKey: ['orders', { filter }] })

// Good - stable reference
const queryKey = useMemo(() => ['orders', filter], [filter])
useQuery({ queryKey })
```

---

### Icon Import Errors

**Error:** `Module '"lucide-react"' has no exported member 'XXX'`

**Solution:** Check icon name. Common mappings:
| Old (phosphor) | New (lucide) |
|----------------|--------------|
| ChatCircle | MessageCircle |
| Envelope | Mail |
| CaretDown | ChevronDown |
| DotsThree | MoreHorizontal |

---

### Tailwind CSS Issues

**Issue:** Styles not applying

**Check:**
1. Class names are correct
2. File is in content paths
3. No typos in class names

```bash
# Restart with fresh cache
rm -rf .next
bun dev
```

---

### KHQR Payment

**Issue:** QR code not generating

**Check:**
1. Merchant ID is configured
2. Amount is valid number
3. Currency is USD or KHR

---

### Export Failures

**Issue:** Excel/PDF export failing

**Check:**
1. Date range is valid
2. Data exists for filters
3. Required packages installed

```bash
bun add xlsx jspdf
```

---

## Debug Commands

```bash
# Check Prisma connection
bunx prisma db pull

# View database in browser
bunx prisma studio

# Check TypeScript errors
bun run build

# Check lint errors
bun lint

# Check environment
cat .env | head -5
```

---

## Reset Everything

```bash
# Nuclear option - reset everything
rm -rf node_modules .next
bun install
bunx prisma generate
bunx prisma db push --force-reset
bun run db:seed
bun dev
```

---

## Get Help

1. Check this documentation
2. Search existing issues
3. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
