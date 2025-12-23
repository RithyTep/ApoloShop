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

  // Create Sample Products
  const products = [
    {
      nameEn: "Espresso",
      nameKh: "អេស្ប្រេសូ",
      descriptionEn: "Rich and bold single shot espresso",
      descriptionKh: "អេស្ប្រេសូដែលសម្បូរនិងក្លិនក្រអូប",
      priceUsd: 2.0,
      priceKhr: 8200,
      categoryId: hotCoffee!.id,
      sku: "HC-001",
      imageUrl: "/images/espresso.jpg",
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
      imageUrl: "/images/cappuccino.jpg",
    },
    {
      nameEn: "Iced Latte",
      nameKh: "ឡាតេត្រជាក់",
      descriptionEn: "Chilled espresso with cold milk over ice",
      descriptionKh: "អេស្ប្រេសូត្រជាក់ជាមួយទឹកដោះគោត្រជាក់",
      priceUsd: 4.0,
      priceKhr: 16400,
      categoryId: icedCoffee!.id,
      sku: "IC-001",
      imageUrl: "/images/iced-latte.jpg",
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
      imageUrl: "/images/iced-americano.jpg",
    },
    {
      nameEn: "Croissant",
      nameKh: "ក្រូសង់",
      descriptionEn: "Buttery, flaky French pastry",
      descriptionKh: "នំបារាំងដែលរសជាតិប្រេនិងស្រួយ",
      priceUsd: 2.5,
      priceKhr: 10250,
      categoryId: pastries!.id,
      sku: "PA-001",
      imageUrl: "/images/croissant.jpg",
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
      imageUrl: "/images/chocolate-muffin.jpg",
    },
  ];

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
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
