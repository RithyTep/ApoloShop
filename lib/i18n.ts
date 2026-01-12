// i18n configuration for multi-language support
export const translations = {
  en: {
    // Order Status
    orderStatus: {
      new: "New",
      confirmed: "Confirmed",
      preparing: "Preparing",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    orderNotification: {
      title: "Order Status",
      sendUpdate: "Send Update",
      updateSent: "Update sent successfully",
      messagePlaceholder: "Custom message (optional)",
      telegramBtn: "Send via Telegram",
      messengerBtn: "Send via Facebook",
    },
    // Customer History
    customerHistory: {
      title: "Customer Order History",
      phone: "Phone",
      orderCount: "Orders",
      totalSpent: "Total Spent",
      lastOrder: "Last Order",
      notes: "Notes",
      tags: "Tags",
      vip: "VIP",
      frequentBuyer: "Frequent Buyer",
      addNote: "Add Note",
    },
    // Kitchen Screen
    kitchenScreen: {
      title: "Kitchen Order Board",
      pending: "Pending Orders",
      noOrders: "No pending orders",
      startPrep: "Start Preparing",
      markComplete: "Mark Complete",
      itemCount: "items",
    },
    // Receipt
    receipt: {
      receipt: "Receipt",
      invoice: "Invoice",
      orderId: "Order ID",
      orderDate: "Order Date",
      customerName: "Customer Name",
      phone: "Phone",
      items: "Items",
      quantity: "Qty",
      price: "Price",
      subtotal: "Subtotal",
      discount: "Discount",
      total: "Total",
      paymentMethod: "Payment Method",
      paid: "Paid",
      print: "Print Receipt",
      thankyou: "Thank you for your order!",
    },
    // Search
    search: {
      placeholder: "Search products...",
      noResults: "No results found",
      searching: "Searching...",
      viewAll: "View all results",
    },
    // Recently Viewed
    recentlyViewed: {
      title: "Recently Viewed",
      clear: "Clear",
      noProducts: "No recently viewed products",
    },
    // Product Recommendations
    recommendations: {
      title: "You May Also Like",
      alsoBought: "Customers Also Bought",
      similarProducts: "Similar Products",
      noRecommendations: "No recommendations available",
    },
    // Wishlist
    wishlist: {
      title: "My Wishlist",
      empty: "Your wishlist is empty",
      items: "items",
      clearAll: "Clear All",
      emptyTitle: "Your wishlist is empty",
      emptyDescription: "Browse our products and save your favorites",
      addedToWishlist: "Added to wishlist",
      removedFromWishlist: "Removed from wishlist",
      save: "Save",
      saved: "Saved",
    },
  },
  kh: {
    // Order Status
    orderStatus: {
      new: "ថ្មីៗ",
      confirmed: "បានរួបរួម",
      preparing: "កំពុងរៀបចំ",
      completed: "ត្រូវបានបញ្ចប់",
      cancelled: "បានលុបចោល",
    },
    orderNotification: {
      title: "ស្ថានភាពលម្អិត",
      sendUpdate: "ផ្ញើឆ្នាំងហើយ",
      updateSent: "ផ្ញើឆ្នាំងបានដោងលោក",
      messagePlaceholder: "សារលម្អិត (ស្ម័គ្រចិត្ត)",
      telegramBtn: "ផ្ញើតាម Telegram",
      messengerBtn: "ផ្ញើតាម Facebook",
    },
    // Customer History
    customerHistory: {
      title: "ប្រវត្តិលម្អិតអតិថិជន",
      phone: "លេខទូរស័ព្ទ",
      orderCount: "ចំនួនលម្អិត",
      totalSpent: "សរុបចំណាយ",
      lastOrder: "លម្អិតចុងក្រោយ",
      notes: "ចម្លង",
      tags: "ស្លាក",
      vip: "សមាជិក VIP",
      frequentBuyer: "អ្នកទិញញឹក",
      addNote: "បន្ថែមចម្លង",
    },
    // Kitchen Screen
    kitchenScreen: {
      title: "ក្តារលម្អិតផ្ទាំងរបស់ក្រុមចម្អិន",
      pending: "លម្អិតដែលរង់ចាំ",
      noOrders: "គ្មានលម្អិតដែលរង់ចាំ",
      startPrep: "ចាប់ផ្តើមរៀបចំ",
      markComplete: "សម្គាល់ឥតខ្ចោះ",
      itemCount: "ធាតុ",
    },
    // Receipt
    receipt: {
      receipt: "ឯកសារលម្អិត",
      invoice: "ក្រងប្រាក់",
      orderId: "លេខលម្អិត",
      orderDate: "កាលបរិច្ឆេទលម្អិត",
      customerName: "ឈ្មោះអតិថិជន",
      phone: "លេខទូរស័ព្ទ",
      items: "ធាតុ",
      quantity: "ចំនួន",
      price: "តម្លៃ",
      subtotal: "រង្វង់រង",
      discount: "ការបង្រៀន",
      total: "សរុប",
      paymentMethod: "វិធីសាលត្រូវ",
      paid: "បានបង់ប្រាក់",
      print: "បោះពុម្ពឯកសារលម្អិត",
      thankyou: "សូមអរគុណដែលបានទិញលម្អិត!",
    },
    // Search
    search: {
      placeholder: "ស្វែងរកផលិតផល...",
      noResults: "រកមិនឃើញលទ្ធផល",
      searching: "កំពុងស្វែងរក...",
      viewAll: "មើលលទ្ធផលទាំងអស់",
    },
    // Recently Viewed
    recentlyViewed: {
      title: "បានមើលថ្មីៗ",
      clear: "សម្អាត",
      noProducts: "មិនមានផលិតផលដែលបានមើលថ្មីៗ",
    },
    // Product Recommendations
    recommendations: {
      title: "អ្នកក៏អាចចូលចិត្ត",
      alsoBought: "អតិថិជនក៏បានទិញ",
      similarProducts: "ផលិតផលស្រដៀងគ្នា",
      noRecommendations: "មិនមានការណែនាំ",
    },
    // Wishlist
    wishlist: {
      title: "បញ្ជីប្រាថ្នារបស់ខ្ញុំ",
      empty: "បញ្ជីប្រាថ្នារបស់អ្នកគឺទទេ",
      items: "មុខទំនិញ",
      clearAll: "សម្អាតទាំងអស់",
      emptyTitle: "បញ្ជីប្រាថ្នារបស់អ្នកគឺទទេ",
      emptyDescription: "រកមើលផលិតផលរបស់យើងហើយរក្សាទុកអ្វីដែលអ្នកចូលចិត្ត",
      addedToWishlist: "បានបន្ថែមទៅបញ្ជីប្រាថ្នា",
      removedFromWishlist: "បានដកចេញពីបញ្ជីប្រាថ្នា",
      save: "រក្សាទុក",
      saved: "បានរក្សាទុក",
    },
  },
}

export type Language = "en" | "kh"
