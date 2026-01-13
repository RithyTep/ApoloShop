import { Metadata } from "next"
import { cookies } from "next/headers"
import { getShopCustomization, getProducts } from "@/lib/server-utils"
import { ShopClientWrapper } from "@/components/shop/shop-client-wrapper"
import { CustomerAccountDashboard } from "@/components/customer-account-dashboard"

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your account, orders, addresses, wishlist, and loyalty points",
}

export default async function AccountPage() {
  const [customization, products] = await Promise.all([
    getShopCustomization(),
    getProducts(),
  ])

  const { theme } = customization

  // Get customer info from cookies (set during checkout or login)
  const cookieStore = await cookies()
  const customerId = cookieStore.get("customerId")?.value || ""
  const customerName = cookieStore.get("customerName")?.value || ""
  const customerPhone = cookieStore.get("customerPhone")?.value || ""

  return (
    <ShopClientWrapper theme={theme} products={products}>
      <main className="pt-20 min-h-screen bg-background">
        <CustomerAccountDashboard
          customerId={customerId}
          customerName={customerName}
          customerPhone={customerPhone}
        />
      </main>
    </ShopClientWrapper>
  )
}
