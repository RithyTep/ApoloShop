import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      permissions: {
        products: ["read", "write", "delete"],
        categories: ["read", "write", "delete"],
        orders: ["read", "write", "delete"],
        customers: ["read", "write", "delete"],
        inventory: ["read", "write", "delete"],
        settings: ["read", "write"],
        users: ["read", "write", "delete"],
        cms: ["read", "write", "delete"],
        promotions: ["read", "write", "delete"],
        reports: ["read"],
      },
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "staff" },
    update: {},
    create: {
      name: "staff",
      permissions: {
        products: ["read"],
        categories: ["read"],
        orders: ["read", "write"],
        customers: ["read", "write"],
        inventory: ["read", "write"],
        settings: [],
        users: [],
        cms: ["read"],
        promotions: ["read"],
        reports: ["read"],
      },
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: "cashier" },
    update: {},
    create: {
      name: "cashier",
      permissions: {
        products: ["read"],
        categories: ["read"],
        orders: ["read", "write"],
        customers: ["read"],
        inventory: [],
        settings: [],
        users: [],
        cms: [],
        promotions: ["read"],
        reports: [],
      },
    },
  });

  console.log("✅ Roles created:", adminRole.name, staffRole.name, cashierRole.name);

  // Create Admin User
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@apolodev.com" },
    update: {},
    create: {
      email: "admin@apolodev.com",
      name: "Admin User",
      passwordHash: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log("✅ Admin user created:", adminUser.email);

  // Create Categories
  const categories = [
    { nameEn: "Hot Coffee", nameKh: "កាហ្វេក្តៅ", slug: "hot-coffee", sortOrder: 1 },
    { nameEn: "Iced Coffee", nameKh: "កាហ្វេត្រជាក់", slug: "iced-coffee", sortOrder: 2 },
    { nameEn: "Tea", nameKh: "តែ", slug: "tea", sortOrder: 3 },
    { nameEn: "Pastries", nameKh: "នំ", slug: "pastries", sortOrder: 4 },
    { nameEn: "Cakes", nameKh: "នំប៉័ង", slug: "cakes", sortOrder: 5 },
    { nameEn: "Snacks", nameKh: "អាហារសម្រន់", slug: "snacks", sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("✅ Categories created:", categories.length);

  // Get categories for products
  const hotCoffee = await prisma.category.findUnique({ where: { slug: "hot-coffee" } });
  const icedCoffee = await prisma.category.findUnique({ where: { slug: "iced-coffee" } });
  const pastries = await prisma.category.findUnique({ where: { slug: "pastries" } });

  // Get all categories for more products
  const tea = await prisma.category.findUnique({ where: { slug: "tea" } });
  const cakes = await prisma.category.findUnique({ where: { slug: "cakes" } });
  const snacks = await prisma.category.findUnique({ where: { slug: "snacks" } });

  // Create Sample Products with real Unsplash images
  const products = [
    // Hot Coffee
    {
      nameEn: "Espresso",
      nameKh: "អេស្ប្រេសូ",
      descriptionEn: "Rich and bold single shot espresso",
      descriptionKh: "អេស្ប្រេសូដែលសម្បូរនិងក្លិនក្រអូប",
      priceUsd: 2.0,
      priceKhr: 8200,
      categoryId: hotCoffee!.id,
      sku: "HC-001",
      imageUrl: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Cappuccino",
      nameKh: "កាពូឈីណូ",
      descriptionEn: "Espresso with steamed milk and foam",
      descriptionKh: "អេស្ប្រេសូជាមួយទឹកដោះគោចំហុយនិងពពុះ",
      priceUsd: 3.5,
      priceKhr: 14350,
      categoryId: hotCoffee!.id,
      sku: "HC-002",
      imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Latte",
      nameKh: "ឡាតេ",
      descriptionEn: "Smooth espresso with steamed milk",
      descriptionKh: "អេស្ប្រេសូរលោងជាមួយទឹកដោះគោចំហុយ",
      priceUsd: 3.5,
      priceKhr: 14350,
      categoryId: hotCoffee!.id,
      sku: "HC-003",
      imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Mocha",
      nameKh: "មូខា",
      descriptionEn: "Espresso with chocolate and steamed milk",
      descriptionKh: "អេស្ប្រេសូជាមួយសូកូឡានិងទឹកដោះគោចំហុយ",
      priceUsd: 4.0,
      priceKhr: 16400,
      categoryId: hotCoffee!.id,
      sku: "HC-004",
      imageUrl: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=400&fit=crop",
    },
    // Iced Coffee
    {
      nameEn: "Iced Latte",
      nameKh: "ឡាតេត្រជាក់",
      descriptionEn: "Chilled espresso with cold milk over ice",
      descriptionKh: "អេស្ប្រេសូត្រជាក់ជាមួយទឹកដោះគោត្រជាក់",
      priceUsd: 4.0,
      priceKhr: 16400,
      categoryId: icedCoffee!.id,
      sku: "IC-001",
      imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Iced Americano",
      nameKh: "អាមេរីកាណូត្រជាក់",
      descriptionEn: "Espresso shots with cold water and ice",
      descriptionKh: "អេស្ប្រេសូជាមួយទឹកត្រជាក់និងទឹកកក",
      priceUsd: 3.0,
      priceKhr: 12300,
      categoryId: icedCoffee!.id,
      sku: "IC-002",
      imageUrl: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Cold Brew",
      nameKh: "កូលប្រូ",
      descriptionEn: "Slow-steeped cold coffee for smooth taste",
      descriptionKh: "កាហ្វេត្រជាក់ស្រក់យឺតសម្រាប់រសជាតិរលោង",
      priceUsd: 4.5,
      priceKhr: 18450,
      categoryId: icedCoffee!.id,
      sku: "IC-003",
      imageUrl: "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Iced Mocha",
      nameKh: "មូខាត្រជាក់",
      descriptionEn: "Iced espresso with chocolate and milk",
      descriptionKh: "អេស្ប្រេសូត្រជាក់ជាមួយសូកូឡានិងទឹកដោះគោ",
      priceUsd: 4.5,
      priceKhr: 18450,
      categoryId: icedCoffee!.id,
      sku: "IC-004",
      imageUrl: "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=400&h=400&fit=crop",
    },
    // Tea
    {
      nameEn: "Green Tea",
      nameKh: "តែបៃតង",
      descriptionEn: "Traditional Japanese green tea",
      descriptionKh: "តែបៃតងបែបប្រពៃណីជប៉ុន",
      priceUsd: 2.5,
      priceKhr: 10250,
      categoryId: tea!.id,
      sku: "TE-001",
      imageUrl: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Thai Milk Tea",
      nameKh: "តែទឹកដោះគោថៃ",
      descriptionEn: "Sweet and creamy Thai iced tea",
      descriptionKh: "តែថៃត្រជាក់ផ្អែមនិងរលោង",
      priceUsd: 3.5,
      priceKhr: 14350,
      categoryId: tea!.id,
      sku: "TE-002",
      imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Matcha Latte",
      nameKh: "ម៉ាឆាឡាតេ",
      descriptionEn: "Premium matcha with steamed milk",
      descriptionKh: "ម៉ាឆាប្រណីតជាមួយទឹកដោះគោចំហុយ",
      priceUsd: 4.5,
      priceKhr: 18450,
      categoryId: tea!.id,
      sku: "TE-003",
      imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&h=400&fit=crop",
    },
    // Pastries
    {
      nameEn: "Croissant",
      nameKh: "ក្រូសង់",
      descriptionEn: "Buttery, flaky French pastry",
      descriptionKh: "នំបារាំងដែលរសជាតិប្រេនិងស្រួយ",
      priceUsd: 2.5,
      priceKhr: 10250,
      categoryId: pastries!.id,
      sku: "PA-001",
      imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Chocolate Muffin",
      nameKh: "នំសូកូឡា",
      descriptionEn: "Moist chocolate muffin with chocolate chips",
      descriptionKh: "នំសូកូឡាទន់ជាមួយគ្រាប់សូកូឡា",
      priceUsd: 3.0,
      priceKhr: 12300,
      categoryId: pastries!.id,
      sku: "PA-002",
      imageUrl: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Blueberry Muffin",
      nameKh: "នំប្លូបឺរី",
      descriptionEn: "Fresh blueberry muffin with streusel topping",
      descriptionKh: "នំប្លូបឺរីស្រស់ជាមួយស្ករលើផ្ទៃ",
      priceUsd: 3.0,
      priceKhr: 12300,
      categoryId: pastries!.id,
      sku: "PA-003",
      imageUrl: "https://images.unsplash.com/photo-1587668178277-295251f900ce?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Danish Pastry",
      nameKh: "នំដាណេម៉ាក",
      descriptionEn: "Flaky pastry with fruit filling",
      descriptionKh: "នំស្រួយជាមួយផ្លែឈើខាងក្នុង",
      priceUsd: 3.5,
      priceKhr: 14350,
      categoryId: pastries!.id,
      sku: "PA-004",
      imageUrl: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&h=400&fit=crop",
    },
    // Cakes
    {
      nameEn: "Chocolate Cake",
      nameKh: "នំសូកូឡា",
      descriptionEn: "Rich chocolate layer cake",
      descriptionKh: "នំសូកូឡាច្រើនស្រទាប់",
      priceUsd: 4.5,
      priceKhr: 18450,
      categoryId: cakes!.id,
      sku: "CA-001",
      imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Cheesecake",
      nameKh: "នំឈីស",
      descriptionEn: "Creamy New York style cheesecake",
      descriptionKh: "នំឈីសរលោងបែបញូវយ៉ក",
      priceUsd: 5.0,
      priceKhr: 20500,
      categoryId: cakes!.id,
      sku: "CA-002",
      imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Tiramisu",
      nameKh: "ទីរ៉ាមីស៊ូ",
      descriptionEn: "Italian coffee-flavored dessert",
      descriptionKh: "បង្អែមអ៊ីតាលីរសជាតិកាហ្វេ",
      priceUsd: 5.5,
      priceKhr: 22550,
      categoryId: cakes!.id,
      sku: "CA-003",
      imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop",
    },
    // Snacks
    {
      nameEn: "Cookies",
      nameKh: "នំខូឃី",
      descriptionEn: "Fresh baked chocolate chip cookies",
      descriptionKh: "នំខូឃីសូកូឡាដុតថ្មី",
      priceUsd: 2.0,
      priceKhr: 8200,
      categoryId: snacks!.id,
      sku: "SN-001",
      imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Brownie",
      nameKh: "ប្រោនី",
      descriptionEn: "Fudgy chocolate brownie",
      descriptionKh: "ប្រោនីសូកូឡារលោង",
      priceUsd: 3.0,
      priceKhr: 12300,
      categoryId: snacks!.id,
      sku: "SN-002",
      imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop",
    },
    {
      nameEn: "Banana Bread",
      nameKh: "នំប៉័ងចេក",
      descriptionEn: "Moist homemade banana bread",
      descriptionKh: "នំប៉័ងចេកទន់ធ្វើផ្ទះ",
      priceUsd: 3.0,
      priceKhr: 12300,
      categoryId: snacks!.id,
      sku: "SN-003",
      imageUrl: "https://images.unsplash.com/photo-1605090930430-9af5f0fb6e2d?w=400&h=400&fit=crop",
    },
  ];

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        imageUrl: product.imageUrl,
        nameEn: product.nameEn,
        nameKh: product.nameKh,
        descriptionEn: product.descriptionEn,
        descriptionKh: product.descriptionKh,
        priceUsd: product.priceUsd,
        priceKhr: product.priceKhr,
      },
      create: product,
    });

    // Create inventory for each product
    await prisma.inventory.upsert({
      where: { productId: created.id },
      update: {},
      create: {
        productId: created.id,
        quantity: 100,
        minLevel: 10,
      },
    });
  }

  console.log("✅ Products created:", products.length);

  // Create Default Settings
  const settings = [
    {
      key: "shop_name",
      value: { en: "ApoloShop", kh: "អាប៉ូឡូហាង" },
    },
    {
      key: "exchange_rate",
      value: { usd_to_khr: 4100 },
    },
    {
      key: "contact_info",
      value: {
        phone: "+855 12 345 678",
        email: "contact@apolodev.com",
        address: { en: "Phnom Penh, Cambodia", kh: "ភ្នំពេញ កម្ពុជា" },
        telegram: "@apolodev",
        messenger: "apolodev",
      },
    },
    {
      key: "business_hours",
      value: {
        monday: { open: "07:00", close: "21:00" },
        tuesday: { open: "07:00", close: "21:00" },
        wednesday: { open: "07:00", close: "21:00" },
        thursday: { open: "07:00", close: "21:00" },
        friday: { open: "07:00", close: "22:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { open: "08:00", close: "20:00" },
      },
    },
    {
      key: "tax_rate",
      value: { percentage: 10 },
    },
    {
      key: "payment_methods",
      value: {
        cash: true,
        aba_khqr: true,
        wing: true,
        payway: false,
        bank_transfer: true,
      },
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("✅ Settings created:", settings.length);

  // Create Sample Customer
  const customer = await prisma.customer.upsert({
    where: { phone: "+855-12-000-000" },
    update: {},
    create: {
      name: "Walk-in Customer",
      phone: "+855-12-000-000",
      notes: "Default customer for walk-in orders",
      tags: ["walk-in"],
    },
  });

  console.log("✅ Sample customer created:", customer.name);

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Email: admin@apolodev.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
