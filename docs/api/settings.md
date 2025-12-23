# Settings API

## GET /api/settings

Get all shop settings.

**Response:**
```json
{
  "settings": {
    "shop_name": {
      "en": "Apolo Coffee",
      "kh": "អាប៉ូឡូ កាហ្វេ"
    },
    "exchange_rate": 4100,
    "contact_info": {
      "phone": "+855123456789",
      "email": "hello@apolocoffee.com",
      "address": "Phnom Penh, Cambodia"
    },
    "business_hours": {
      "monday": { "open": "07:00", "close": "22:00" },
      "sunday": { "open": "08:00", "close": "20:00" }
    },
    "tax_rate": 10,
    "payment_methods": ["CASH", "ABA_KHQR", "WING"]
  }
}
```

---

## GET /api/settings?key=xxx

Get specific setting.

**Response:**
```json
{
  "key": "exchange_rate",
  "value": 4100
}
```

---

## PUT /api/settings

Update setting(s).

**Request:**
```json
{
  "key": "exchange_rate",
  "value": 4150
}
```

**Or bulk update:**
```json
{
  "settings": {
    "exchange_rate": 4150,
    "tax_rate": 12
  }
}
```

---

## Default Settings

| Key | Type | Description |
|-----|------|-------------|
| `shop_name` | object | Shop name (EN/KH) |
| `exchange_rate` | number | USD to KHR rate |
| `contact_info` | object | Phone, email, address |
| `business_hours` | object | Opening hours by day |
| `tax_rate` | number | Tax percentage (0-100) |
| `payment_methods` | array | Enabled payment methods |
| `telegram_bot_token` | string | Telegram bot token |
| `facebook_page_id` | string | Facebook page ID |

---

# React Query Hooks

```tsx
import {
  useSettings,
  useSetting,
  useUpdateSettings
} from '@/lib/api-hooks'

// Get all settings
const { data } = useSettings()

// Get specific setting
const { data: rate } = useSetting('exchange_rate')

// Update settings
const update = useUpdateSettings()
await update.mutateAsync({
  key: 'exchange_rate',
  value: 4150
})
```
