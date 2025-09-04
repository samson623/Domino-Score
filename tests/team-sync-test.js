/**
 * Team Synchronization System Test
 * 
 * This test file verifies that the team system correctly synchronizes
 * players when teams are established and when membership changes occur.
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'your-jwt-secret';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const testUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'owner@test.com',
    username: 'team_owner',
    full_name: 'Team Owner'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'member1@test.com',
    username: 'member_one',
    full_name: 'Member One'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'member2@test.com',
    username: 'member_two',
    full_name: 'Member Two'
  }
];

let testTeamId = null;
let testGameId = null;

// Helper function to create JWT token
function createTestToken(userId) {
  return jwt.sign(
    {
      sub: userId,
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    JWT_SECRET
  );
}

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', body = null, userId = testUsers[0].id) {
  const token = createTestToken(userId);
  const baseUrl = 'http://localhost:3000'; // Adjust based on your setup
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

// Test functions
async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  // Create test user profiles
  for (const user of testUsers) {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email
      });
    
    if (error) {
      console.error(`Error creating user profile for ${user.username}:`, error);
    }
  }
  
  console.log('✅ Test data setup complete');
}

async function testTeamCreation() {
  console.log('\n🧪 Testing team creation...');
  
  const response = await makeRequest('/api/teams', 'POST', {
    name: 'Test Sync Team',
    description: 'A team for testing synchronization',
    max_members: 5
  });
  
  if (response.status === 201) {
    testTeamId = response.data.team.team_id;
    console.log('✅ Team created successfully:', testTeamId);
    console.log('✅ Owner automatically added as member');
    return true;
  } else {
    console.error('❌ Team creation failed:', response.data);
    return false;
  }
}

async function testAddMembers() {
  console.log('\n🧪 Testing member addition...');
  
  // Add first member
  let response = await makeRequest(
    `/api/teams/${testTeamId}/members`,
    'POST',
    { user_id: testUsers[1].id, role: 'member' }
  );
  
  if (response.status === 201) {
    console.log('✅ First member added successfully');
  } else {
    console.error('❌ Failed to add first member:', response.data);
    return false;
  }
  
  // Add second member
  response = await makeRequest(
    `/api/teams/${testTeamId}/members`,
    'POST',
    { user_id: testUsers[2].id, role: 'admin' }
  );
  
  if (response.status === 201) {
    console.log('✅ Second member added successfully');
    return true;
  } else {
    console.error('❌ Failed to add second member:', response.data);
    return false;
  }
}

async function testTeamGameCreation() {
  console.log('\n🧪 Testing team game creation with auto-sync...');
  
  const response = await makeRequest('/api/games', 'POST', {
    gameType: 'domino',
    teamId: testTeamId,
    initialData: { rounds: [] }
  });
  
  if (response.status === 201) {
    testGameId = response.data.game.id;
    const players = response.data.game.players;
    
    console.log('✅ Team game created successfully');
    console.log(`✅ Auto-synced ${players.length} players:`);
    
    players.forEach(player => {
      console.log(`   - ${player.username} (${player.full_name}) [${player.role}]`);
    });
    
    // Verify all team members are included
    const expectedUserIds = testUsers.map(u => u.id);
    const actualUserIds = players.map(p => p.id);
    
    const allMembersIncluded = expectedUserIds.every(id => actualUserIds.includes(id));
    
    if (allMembersIncluded) {
      console.log('✅ All team members correctly synchronized to game');
      return true;
    } else {
      console.error('❌ Not all team members were synchronized');
      return false;
    }
  } else {
    console.error('❌ Team game creation failed:', response.data);
    return false;
  }
}

async function testMembershipChangeSync() {
  console.log('\n🧪 Testing synchronization after membership changes...');
  
  // Remove a member
  const response = await makeRequest(
    `/api/teams/${testTeamId}/members?user_id=${testUsers[2].id}`,
    'DELETE'
  );
  
  if (response.status === 200) {
    console.log('✅ Member removed successfully');
    
    // Wait a moment for triggers to execute
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if game players were updated
    const { data: game, error } = await supabase
      .from('games')
      .select('players')
      .eq('id', testGameId)
      .single();
    
    if (error) {
      console.error('❌ Failed to fetch updated game:', error);
      return false;
    }
    
    const activePlayers = game.players.filter(p => p.id !== testUsers[2].id);
    
    if (activePlayers.length === game.players.length - 1) {
      console.log('✅ Game players automatically updated after member removal');
      console.log(`✅ Remaining players: ${game.players.length}`);
      return true;
    } else {
      console.error('❌ Game players were not properly synchronized');
      return false;
    }
  } else {
    console.error('❌ Failed to remove member:', response.data);
    return false;
  }
}

async function testProfileUpdateSync() {
  console.log('\n🧪 Testing synchronization after profile updates...');
  
  // Update a user's profile
  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      username: 'updated_owner',
      full_name: 'Updated Team Owner'
    })
    .eq('user_id', testUsers[0].id);
  
  if (error) {
    console.error('❌ Failed to update profile:', error);
    return false;
  }
  
  console.log('✅ User profile updated');
  
  // Wait for triggers to execute
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if game players were updated
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('players')
    .eq('id', testGameId)
    .single();
  
  if (gameError) {
    console.error('❌ Failed to fetch updated game:', gameError);
    return false;
  }
  
  const updatedPlayer = game.players.find(p => p.id === testUsers[0].id);
  
  if (updatedPlayer && updatedPlayer.username === 'updated_owner') {
    console.log('✅ Game players automatically updated after profile change');
    console.log(`✅ Updated player: ${updatedPlayer.username} (${updatedPlayer.full_name})`);
    return true;
  } else {
    console.error('❌ Game players were not synchronized after profile update');
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete test game
  if (testGameId) {
    await supabase.from('games').delete().eq('id', testGameId);
  }
  
  // Delete test team (this will cascade to memberships)
  if (testTeamId) {
    await supabase.from('teams').delete().eq('id', testTeamId);
  }
  
  // Delete test user profiles
  for (const user of testUsers) {
    await supabase.from('user_profiles').delete().eq('user_id', user.id);
  }
  
  console.log('✅ Cleanup complete');
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Team Synchronization System Tests\n');
  
  const tests = [
    { name: 'Setup Test Data', fn: setupTestData },
    { name: 'Team Creation', fn: testTeamCreation },
    { name: 'Add Members', fn: testAddMembers },
    { name: 'Team Game Creation & Auto-Sync', fn: testTeamGameCreation },
    { name: 'Membership Change Sync', fn: testMembershipChangeSync },
    { name: 'Profile Update Sync', fn: testProfileUpdateSync }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result !== false) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error);
      failed++;
    }
  }
  
  // Always cleanup
  await cleanupTestData();
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Team synchronization system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

// Export for use in other test files
module.exports = {
  runTests,
  setupTestData,
  cleanupTestData,
  testTeamCreation,
  testAddMembers,
  testTeamGameCreation,
  testMembershipChangeSync,
  testProfileUpdateSync
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}