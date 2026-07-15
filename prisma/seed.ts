import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // 1. Seed Amenities
  const amenitiesData = [
    // Basic
    { name: 'Lift / Elevator', iconName: 'ArrowUpDown', category: 'Basic' },
    { name: 'Power Backup', iconName: 'Zap', category: 'Basic' },
    { name: 'Water Supply (24h)', iconName: 'Droplet', category: 'Basic' },
    { name: 'Piped Gas', iconName: 'Flame', category: 'Basic' },
    { name: 'EV Charging Station', iconName: 'BatteryCharging', category: 'Basic' },
    // Security
    { name: '24x7 Security Guard', iconName: 'Shield', category: 'Security' },
    { name: 'CCTV Surveillance', iconName: 'Video', category: 'Security' },
    { name: 'Intercom Facility', iconName: 'PhoneCall', category: 'Security' },
    { name: 'Fire Safety Systems', iconName: 'FlameKindling', category: 'Security' },
    { name: 'Gated Community', iconName: 'Fence', category: 'Security' },
    // Lifestyle
    { name: 'Swimming Pool', iconName: 'Waves', category: 'Lifestyle' },
    { name: 'Gym / Fitness Center', iconName: 'Dumbbell', category: 'Lifestyle' },
    { name: 'Clubhouse', iconName: 'Users', category: 'Lifestyle' },
    { name: 'Park / Garden', iconName: 'Trees', category: 'Lifestyle' },
    { name: 'Children\'s Play Area', iconName: 'Smile', category: 'Lifestyle' },
    { name: 'Jogging / Cycle Track', iconName: 'Footprints', category: 'Lifestyle' },
    { name: 'Community Hall', iconName: 'Building', category: 'Lifestyle' },
    { name: 'Indoor Games Room', iconName: 'Gamepad2', category: 'Lifestyle' },
    // Sports
    { name: 'Tennis Court', iconName: 'Activity', category: 'Sports' },
    { name: 'Basketball Court', iconName: 'Target', category: 'Sports' },
    { name: 'Badminton Court', iconName: 'Award', category: 'Sports' },
    // Additional
    { name: 'Visitor Parking', iconName: 'Car', category: 'Additional' },
    { name: 'Rainwater Harvesting', iconName: 'CloudRain', category: 'Additional' },
    { name: 'Sewage Treatment Plant', iconName: 'Filter', category: 'Additional' },
    { name: 'Maintenance Staff', iconName: 'Wrench', category: 'Additional' },
    { name: 'Waste Disposal', iconName: 'Trash2', category: 'Additional' },
  ];

  console.log('Seeding amenities...');
  for (const amenity of amenitiesData) {
    await prisma.amenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: {
        name: amenity.name,
        iconName: amenity.iconName,
        category: amenity.category,
        isActive: true,
      },
    });
  }

  // 2. Seed Cities and Localities
  const citiesData = [
    {
      name: 'Mumbai',
      state: 'Maharashtra',
      imageUrl: '/images/cities/mumbai.jpg',
      localities: [
        { name: 'Bandra West', pinCode: '400050', latitude: 19.0596, longitude: 72.8295 },
        { name: 'Andheri East', pinCode: '400069', latitude: 19.1179, longitude: 72.8631 },
        { name: 'Worli', pinCode: '400018', latitude: 19.0178, longitude: 72.8173 },
        { name: 'Powai', pinCode: '400076', latitude: 19.1176, longitude: 72.9060 },
      ],
    },
    {
      name: 'Bangalore',
      state: 'Karnataka',
      imageUrl: '/images/cities/bangalore.jpg',
      localities: [
        { name: 'Indiranagar', pinCode: '560038', latitude: 12.9719, longitude: 77.6412 },
        { name: 'Whitefield', pinCode: '560066', latitude: 12.9698, longitude: 77.7500 },
        { name: 'Koramangala', pinCode: '560034', latitude: 12.9352, longitude: 77.6244 },
        { name: 'Jayanagar', pinCode: '560041', latitude: 12.9250, longitude: 77.5897 },
      ],
    },
    {
      name: 'Delhi NCR',
      state: 'Delhi',
      imageUrl: '/images/cities/delhi.jpg',
      localities: [
        { name: 'Dwarka', pinCode: '110075', latitude: 28.5850, longitude: 77.0505 },
        { name: 'Connaught Place', pinCode: '110001', latitude: 28.6304, longitude: 77.2177 },
        { name: 'Sector 62, Noida', pinCode: '201301', latitude: 28.6219, longitude: 77.3639 },
        { name: 'DLF Phase 3, Gurgaon', pinCode: '122002', latitude: 28.4939, longitude: 77.0972 },
      ],
    },
    {
      name: 'Pune',
      state: 'Maharashtra',
      imageUrl: '/images/cities/pune.jpg',
      localities: [
        { name: 'Koregaon Park', pinCode: '411001', latitude: 18.5362, longitude: 73.8930 },
        { name: 'Kothrud', pinCode: '411038', latitude: 18.5074, longitude: 73.8077 },
        { name: 'Hinjewadi', pinCode: '411057', latitude: 18.5913, longitude: 73.7389 },
        { name: 'Wakad', pinCode: '411057', latitude: 18.5987, longitude: 73.7749 },
      ],
    },
  ];

  console.log('Seeding cities and localities...');
  for (const cityData of citiesData) {
    const city = await prisma.city.upsert({
      where: { name: cityData.name },
      update: {
        state: cityData.state,
        imageUrl: cityData.imageUrl,
      },
      create: {
        name: cityData.name,
        state: cityData.state,
        imageUrl: cityData.imageUrl,
        isActive: true,
      },
    });

    for (const loc of cityData.localities) {
      // Find or create locality by name and pinCode for this city
      const existingLoc = await prisma.locality.findFirst({
        where: {
          name: loc.name,
          cityId: city.id,
        },
      });

      if (!existingLoc) {
        await prisma.locality.create({
          data: {
            name: loc.name,
            pinCode: loc.pinCode,
            latitude: loc.latitude,
            longitude: loc.longitude,
            cityId: city.id,
            isActive: true,
          },
        });
      }
    }
  }

  // 3. Seed System Settings
  const settingsData = [
    { key: 'brandName', value: 'ListMe' },
    { key: 'contactPhone', value: '+91 99999 99999' },
    { key: 'contactEmail', value: 'support@listme.in' },
    { key: 'officeAddress', value: 'ListMe Tech Space, Indiranagar, Bangalore, India' },
  ];

  console.log('Seeding system settings...');
  for (const setting of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }

  console.log('Seeding finished successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
