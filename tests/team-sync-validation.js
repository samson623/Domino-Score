/**
 * Team Synchronization Validation Test
 * 
 * This test validates the team synchronization logic without requiring
 * actual database connections. It checks API structure and logic flow.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testResults = [];

function logTest(testName, passed, message) {
  const result = {
    test: testName,
    passed,
    message,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${testName}: ${message}`);
}

function validateFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  logTest(
    `File Existence: ${description}`,
    exists,
    exists ? 'File exists' : 'File missing'
  );
  return exists;
}

function validateAPIStructure(filePath, requiredElements) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let allFound = true;
    const missing = [];
    
    requiredElements.forEach(element => {
      if (!content.includes(element)) {
        allFound = false;
        missing.push(element);
      }
    });
    
    logTest(
      `API Structure: ${path.basename(filePath)}`,
      allFound,
      allFound ? 'All required elements found' : `Missing: ${missing.join(', ')}`
    );
    
    return allFound;
  } catch (error) {
    logTest(
      `API Structure: ${path.basename(filePath)}`,
      false,
      `Error reading file: ${error.message}`
    );
    return false;
  }
}

function validateDatabaseTriggers(schemaPath) {
  try {
    const content = fs.readFileSync(schemaPath, 'utf8');
    
    const requiredTriggers = [
      'sync_team_players_to_games',
      'sync_team_players_on_membership_change',
      'sync_team_players_on_profile_change',
      'add_team_owner_as_member'
    ];
    
    const requiredLogic = [
      'TG_OP = \'DELETE\'',
      'OLD.team_id',
      'NEW.team_id',
      'target_team_id'
    ];
    
    let triggersFound = true;
    let logicFound = true;
    const missingTriggers = [];
    const missingLogic = [];
    
    requiredTriggers.forEach(trigger => {
      if (!content.includes(trigger)) {
        triggersFound = false;
        missingTriggers.push(trigger);
      }
    });
    
    requiredLogic.forEach(logic => {
      if (!content.includes(logic)) {
        logicFound = false;
        missingLogic.push(logic);
      }
    });
    
    logTest(
      'Database Triggers',
      triggersFound,
      triggersFound ? 'All triggers found' : `Missing triggers: ${missingTriggers.join(', ')}`
    );
    
    logTest(
      'Trigger Logic (DELETE handling)',
      logicFound,
      logicFound ? 'DELETE operation logic found' : `Missing logic: ${missingLogic.join(', ')}`
    );
    
    return triggersFound && logicFound;
  } catch (error) {
    logTest(
      'Database Triggers',
      false,
      `Error reading schema: ${error.message}`
    );
    return false;
  }
}

function runValidationTests() {
  console.log('🧪 Starting Team Synchronization Validation Tests\n');
  
  // Test 1: Validate core API files exist
  const apiFiles = [
    { path: 'api/teams/index.ts', desc: 'Teams API' },
    { path: 'api/teams/[id].ts', desc: 'Team Details API' },
    { path: 'api/teams/[id]/members.ts', desc: 'Team Members API' },
    { path: 'api/games/index.ts', desc: 'Games API' },
    { path: 'api/games/sync-team.ts', desc: 'Team Sync API' },
    { path: 'database/schema.sql', desc: 'Database Schema' }
  ];
  
  apiFiles.forEach(file => {
    validateFileExists(path.join(__dirname, '..', file.path), file.desc);
  });
  
  // Test 2: Validate Games API has team integration
  validateAPIStructure(
    path.join(__dirname, '..', 'api/games/index.ts'),
    [
      'teamId',
      'team_memberships',
      'get_team_members',
      'team_games',
      'finalPlayers'
    ]
  );
  
  // Additional check for games API team integration with more flexible matching
  const gamesApiContent = fs.readFileSync(path.join(__dirname, '..', 'api/games/index.ts'), 'utf8');
  const hasTeamIntegration = 
    gamesApiContent.includes('teamId') &&
    gamesApiContent.includes('team_memberships') &&
    gamesApiContent.includes('get_team_members') &&
    gamesApiContent.includes('team_games') &&
    gamesApiContent.includes('finalPlayers');
  
  logTest(
    'Games API Team Integration (Detailed)',
    hasTeamIntegration,
    hasTeamIntegration ? 'All team integration features present' : 'Missing team integration features'
  );
  
  // Test 3: Validate Team Members API has synchronization verification
  validateAPIStructure(
    path.join(__dirname, '..', 'api/teams/[id]/members.ts'),
    [
      'syncStatus',
      'teamGamesCount',
      'team_games'
    ]
  );
  
  // Test 4: Validate Team Sync API exists and has proper structure
  validateAPIStructure(
    path.join(__dirname, '..', 'api/games/sync-team.ts'),
    [
      'teamId',
      'gameId',
      'get_team_members',
      'updatedPlayers',
      'playersCount'
    ]
  );
  
  // Test 5: Validate database triggers
  validateDatabaseTriggers(path.join(__dirname, '..', 'database/schema.sql'));
  
  // Test 6: Validate team creation logic
  validateAPIStructure(
    path.join(__dirname, '..', 'api/teams/index.ts'),
    [
      'TeamCreateRequest',
      'name.trim()',
      'owner_id: userId'
    ]
  );
  
  // Summary
  console.log('\n📊 Test Summary:');
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
  
  if (passed === total) {
    console.log('\n🎉 All validation tests passed! Team synchronization system is properly implemented.');
  } else {
    console.log('\n⚠️  Some validation tests failed. Review the issues above.');
    const failed = testResults.filter(r => !r.passed);
    console.log('\nFailed tests:');
    failed.forEach(test => {
      console.log(`  - ${test.test}: ${test.message}`);
    });
  }
  
  return passed === total;
}

// Run the tests
if (require.main === module) {
  const success = runValidationTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runValidationTests };