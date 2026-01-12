import { Metadata } from "next"
import { getShopCustomization, getProducts } from "@/lib/server-utils"
import { ShopClientWrapper } from "@/components/shop/shop-client-wrapper"
import { WishlistContent } from "@/components/wishlist-content"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved products",
}

export default async function WishlistPage() {
  const [customization, products] = await Promise.all([
    getShopCustomization(),
    getProducts(),
  ])

  const { theme } = customization

  return (
    <ShopClientWrapper theme={theme} products={products}>
      <main className="pt-20">
        <WishlistContent />
      </main>
    </ShopClientWrapper>
  )
}
