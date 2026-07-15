import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Parse .env file manually to load env variables for database connectivity BEFORE importing Prisma
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      const val = values.join('=').replace(/^['"]|['"]$/g, '');
      process.env[key.trim()] = val.trim();
    }
  }
}

// Declare a global reference to prisma to be initialized in main()
let prisma;

const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const USER_IDS = {
  owner: 'e4d7bf2e-0a5d-4f18-b2a6-ff2c38d2f5a8',
  seeker: 'd9e87fb4-9c02-4217-ba5d-ee062e5ab71c',
  admin: 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6',
};

async function cleanup() {
  console.log('\n🧹 Cleaning up test users and associated records...');
  const ids = Object.values(USER_IDS);
  
  // Deleting the profiles will cascade and delete listings, interests, notifications, etc.
  await prisma.profile.deleteMany({
    where: { id: { in: ids } },
  });
  console.log('✨ Cleanup complete.');
}

async function waitForServer(url, retries = 120, delay = 1000) {
  console.log(`⏳ Waiting for Next.js server to be ready on ${url}...`);
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(url);
      console.log('🚀 Next.js server is online!');
      return true;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Server at ${url} did not start within ${retries} seconds.`);
}

async function runTests() {
  console.log('\n🏁 Starting Endpoint Verification Tests...\n');
  const results = [];

  // --- STEP 1: Signup Validation ---
  console.log('--- Step 1: Simulating User Signup (POST /api/auth/signup) ---');
  
  // Owner Signup
  const ownerSignupPayload = {
    name: 'Test Owner',
    phone: '9999999999',
    email: 'owner@test.com',
  };
  console.log(`👉 Sending Owner signup request...`);
  const ownerSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ownerSignupPayload),
  });
  const ownerSignupData = await ownerSignupRes.json();
  console.log(`Response Status: ${ownerSignupRes.status}`);
  console.log(`Response Body:`, ownerSignupData);
  
  // Seeker Signup
  const seekerSignupPayload = {
    name: 'Test Seeker',
    phone: '8888888888',
    email: 'seeker@test.com',
  };
  console.log(`👉 Sending Seeker signup request...`);
  const seekerSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seekerSignupPayload),
  });
  const seekerSignupData = await seekerSignupRes.json();
  console.log(`Response Status: ${seekerSignupRes.status}`);
  console.log(`Response Body:`, seekerSignupData);

  const step1Passed = ownerSignupRes.status === 200 && seekerSignupRes.status === 200;
  results.push({ name: 'Simulate User Signup (Validation)', passed: step1Passed });

  if (!step1Passed) {
    throw new Error('Step 1 (Signup Validation) failed. Aborting tests.');
  }

  // Database Seed Mock Profiles (Simulate Supabase success callback)
  console.log('\n👤 Creating test profile records directly in database...');
  await prisma.profile.createMany({
    data: [
      {
        id: USER_IDS.owner,
        name: ownerSignupPayload.name,
        email: ownerSignupPayload.email,
        phone: '+91' + ownerSignupPayload.phone,
        phoneVerified: true,
        role: 'USER',
        status: 'ACTIVE',
      },
      {
        id: USER_IDS.seeker,
        name: seekerSignupPayload.name,
        email: seekerSignupPayload.email,
        phone: '+91' + seekerSignupPayload.phone,
        phoneVerified: true,
        role: 'USER',
        status: 'ACTIVE',
      },
      {
        id: USER_IDS.admin,
        name: 'Test Admin',
        email: 'admin@test.com',
        phone: '+917777777777',
        phoneVerified: true,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    ],
  });
  console.log('✅ Profiles populated in PostgreSQL.');

  // --- STEP 2: Listing Submission ---
  console.log('\n--- Step 2: Simulating Listing Submission (POST /api/listings) ---');
  const listingPayload = {
    listingFor: 'SALE',
    propertyType: 'APARTMENT',
    title: 'Test Luxury Apartment in Bandra',
    description: 'A beautiful luxury apartment in Bandra West with sea view.',
    askingPrice: '18000000',
    city: 'Mumbai',
    locality: 'Bandra West',
    pinCode: '400050',
    fullAddress: 'Flat 402, Sea Breeze, Bandra West',
    bedrooms: 3,
    bathrooms: 3,
  };
  
  console.log('👉 Submitting listing on behalf of Owner...');
  const listingRes = await fetch(`${BASE_URL}/api/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mock-user-id': USER_IDS.owner,
    },
    body: JSON.stringify(listingPayload),
  });
  const listingData = await listingRes.json();
  console.log(`Response Status: ${listingRes.status}`);
  console.log(`Response Body:`, listingData);

  const step2Passed = listingRes.status === 200 && listingData.listing?.id;
  results.push({ name: 'Simulate Listing Submission', passed: step2Passed });

  if (!step2Passed) {
    throw new Error('Step 2 (Listing Submission) failed. Aborting.');
  }

  const listingId = listingData.listing.id;

  // Make the listing active so seeker can express interest
  console.log('⚙️ Activating listing in the database...');
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: 'ACTIVE' },
  });

  // --- STEP 3: Express Interest ---
  console.log('\n--- Step 3: Simulating Seeker Expressing Interest (POST /api/interests) ---');
  const interestPayload = { listingId };
  
  console.log('👉 Sending interest expression on behalf of Seeker...');
  const interestRes = await fetch(`${BASE_URL}/api/interests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mock-user-id': USER_IDS.seeker,
    },
    body: JSON.stringify(interestPayload),
  });
  const interestData = await interestRes.json();
  console.log(`Response Status: ${interestRes.status}`);
  console.log(`Response Body:`, interestData);

  const step3Passed = interestRes.status === 200 && interestData.interest?.id;
  results.push({ name: 'Simulate Seeker Expressing Interest', passed: step3Passed });

  if (!step3Passed) {
    throw new Error('Step 3 (Expressing Interest) failed. Aborting.');
  }

  const interestId = interestData.interest.id;

  // --- STEP 4: Deal Closure ---
  console.log('\n--- Step 4: Simulating Deal Closure (PUT /api/interests/[id]) ---');
  const closurePayload = {
    status: 'SOLD',
  };
  
  console.log('👉 Closing deal on behalf of Admin...');
  const closureRes = await fetch(`${BASE_URL}/api/interests/${interestId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-mock-user-id': USER_IDS.admin,
    },
    body: JSON.stringify(closurePayload),
  });
  const closureData = await closureRes.json();
  console.log(`Response Status: ${closureRes.status}`);
  console.log(`Response Body:`, closureData);

  const step4Passed = closureRes.status === 200 && closureData.interest?.status === 'SOLD';
  results.push({ name: 'Simulate Deal Closure (SOLD)', passed: step4Passed });

  if (!step4Passed) {
    throw new Error('Step 4 (Deal Closure) failed. Aborting.');
  }

  // --- DB STATE VALIDATION ---
  console.log('\n🔍 Verifying final database state values...');
  const updatedInterest = await prisma.interest.findUnique({
    where: { id: interestId },
    include: { listing: true },
  });

  const dbListingStatus = updatedInterest.listing.status;
  const dbCommissionAmount = parseFloat(updatedInterest.commissionAmount.toString());
  const expectedCommission = parseFloat(listingPayload.askingPrice) * 0.02;

  console.log(`Listing Status (expected: DEACTIVATED): ${dbListingStatus}`);
  console.log(`Commission Amount (expected: ${expectedCommission}): ${dbCommissionAmount}`);

  const validationPassed = dbListingStatus === 'DEACTIVATED' && dbCommissionAmount === expectedCommission;
  results.push({ name: 'Database State Validation', passed: validationPassed });

  // --- SUMMARY RESULTS ---
  console.log('\n======================================');
  console.log('🧪 TEST EXECUTION SUMMARY:');
  console.log('======================================');
  let allPassed = true;
  for (const res of results) {
    const icon = res.passed ? '✅' : '❌';
    console.log(`${icon} ${res.name}: ${res.passed ? 'PASSED' : 'FAILED'}`);
    if (!res.passed) allPassed = false;
  }
  console.log('======================================');

  if (!allPassed) {
    throw new Error('Some test cases failed.');
  }
}

async function main() {
  let serverProcess;
  try {
    // Dynamically import prisma here to ensure process.env.DATABASE_URL is set first
    const prismaModule = await import('./prisma');
    prisma = prismaModule.prisma;

    // 1. Initial cleanup to prevent key collision if re-run
    await cleanup();

    // 2. Spawn Next.js dev server on port 3009
    console.log(`⚡ Spawning Next.js dev server on port ${PORT}...`);
    serverProcess = spawn('npx', ['next', 'dev', '-p', String(PORT), '-H', '127.0.0.1'], {
      shell: true,
      stdio: 'pipe', // Pipe output to hide development noise
      env: { ...process.env, ENABLE_MOCK_AUTH: 'true' },
    });

    // 3. Wait for the server to spin up
    await waitForServer(BASE_URL);

    // 4. Run tests
    await runTests();

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    process.exitCode = 1;
  } finally {
    // 5. Cleanup database records
    try {
      if (prisma) {
        await cleanup();
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup database:', cleanupErr.message);
    }

    // 6. Kill Next.js server child process cleanly using taskkill on Windows
    if (serverProcess) {
      console.log('🔌 Shutting down Next.js dev server...');
      try {
        // Use taskkill /f /t to terminate the process group since shell: true creates a wrapper
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], { shell: true });
        console.log('👋 Server stopped.');
      } catch (err) {
        console.error('Failed to kill Next.js server process:', err.message);
      }
    }
    
    // Disconnect Prisma Client
    if (prisma) {
      await prisma.$disconnect();
    }
    console.log('\n🏁 Verification run finished.');
  }
}

main();
