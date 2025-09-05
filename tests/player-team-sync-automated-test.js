/**
 * Automated Test Suite for Player-Team Synchronization
 * Tests the createTeam() and addPlayerIfNotExists() functions
 */

class PlayerTeamSyncTest {
    constructor() {
        this.players = [];
        this.teams = [];
        this.testResults = [];
        this.localStorage = new Map(); // Mock localStorage
    }

    // Mock localStorage implementation
    setItem(key, value) {
        this.localStorage.set(key, value);
    }

    getItem(key) {
        return this.localStorage.get(key) || null;
    }

    removeItem(key) {
        this.localStorage.delete(key);
    }

    // Implementation of the functions being tested (copied from main app)
    addPlayerIfNotExists(playerName) {
        if (!playerName) return;
        const nameExists = this.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!nameExists) {
            const newPlayer = { id: Date.now().toString(), name: playerName };
            this.players.push(newPlayer);
            this.setItem('dominoPlayers', JSON.stringify(this.players));
        }
    }

    findOrCreateTeam(player1Name, player2Name) {
        const sortedNames = [player1Name, player2Name].sort();
        
        let existingTeam = this.teams.find(team => 
            team.player1 === sortedNames[0] && team.player2 === sortedNames[1]
        );

        if (existingTeam) {
            return existingTeam;
        } else {
            const newTeam = {
                id: Date.now().toString(),
                player1: sortedNames[0],
                player2: sortedNames[1],
            };
            this.teams.push(newTeam);
            this.setItem('dominoTeams', JSON.stringify(this.teams));
            return newTeam;
        }
    }

    createTeam(player1Name, player2Name) {
        if (!player1Name || !player2Name) {
            return { error: 'Please enter both player names' };
        }

        if (player1Name.toLowerCase() === player2Name.toLowerCase()) {
            return { error: 'Please enter two different player names' };
        }

        // This is the key part: it adds players to the master list if they are new.
        this.addPlayerIfNotExists(player1Name);
        this.addPlayerIfNotExists(player2Name);
        
        // This part then creates the team itself.
        const team = this.findOrCreateTeam(player1Name, player2Name);
        
        return { success: true, team: team };
    }

    // Test utility functions
    logResult(testName, passed, message, details = null) {
        const result = {
            testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${testName}: ${message}`);
        if (details) {
            console.log(`   Details: ${JSON.stringify(details)}`);
        }
    }

    reset() {
        this.players = [];
        this.teams = [];
        this.localStorage.clear();
    }

    // Individual test methods
    testAddNewPlayer() {
        const initialCount = this.players.length;
        this.addPlayerIfNotExists('TestPlayer1');
        const finalCount = this.players.length;
        
        this.logResult(
            'Add New Player',
            finalCount === initialCount + 1,
            `Player count increased from ${initialCount} to ${finalCount}`,
            { initialCount, finalCount, players: this.players }
        );
    }

    testPreventDuplicatePlayer() {
        this.addPlayerIfNotExists('DuplicateTest');
        const countAfterFirst = this.players.length;
        
        this.addPlayerIfNotExists('DuplicateTest'); // Same name
        const countAfterSecond = this.players.length;
        
        this.logResult(
            'Prevent Duplicate Players',
            countAfterFirst === countAfterSecond,
            `Player count remained ${countAfterSecond} (no duplicate added)`,
            { countAfterFirst, countAfterSecond }
        );
    }

    testCaseInsensitiveDuplicatePrevention() {
        this.addPlayerIfNotExists('CaseTest');
        const countAfterFirst = this.players.length;
        
        this.addPlayerIfNotExists('casetest'); // Different case
        const countAfterSecond = this.players.length;
        
        this.logResult(
            'Case Insensitive Duplicate Prevention',
            countAfterFirst === countAfterSecond,
            `Player count remained ${countAfterSecond} (case insensitive check worked)`,
            { countAfterFirst, countAfterSecond }
        );
    }

    testTeamCreationWithNewPlayers() {
        const initialPlayerCount = this.players.length;
        const initialTeamCount = this.teams.length;
        
        const result = this.createTeam('NewPlayer1', 'NewPlayer2');
        
        const finalPlayerCount = this.players.length;
        const finalTeamCount = this.teams.length;
        
        this.logResult(
            'Team Creation with New Players',
            result.success && finalPlayerCount === initialPlayerCount + 2 && finalTeamCount === initialTeamCount + 1,
            `Created team successfully, added 2 players and 1 team`,
            { 
                result, 
                playerCountChange: finalPlayerCount - initialPlayerCount,
                teamCountChange: finalTeamCount - initialTeamCount
            }
        );
    }

    testTeamCreationWithExistingPlayers() {
        // Add some existing players first
        this.addPlayerIfNotExists('ExistingPlayer1');
        this.addPlayerIfNotExists('ExistingPlayer2');
        
        const initialPlayerCount = this.players.length;
        const initialTeamCount = this.teams.length;
        
        const result = this.createTeam('ExistingPlayer1', 'ExistingPlayer2');
        
        const finalPlayerCount = this.players.length;
        const finalTeamCount = this.teams.length;
        
        this.logResult(
            'Team Creation with Existing Players',
            result.success && finalPlayerCount === initialPlayerCount && finalTeamCount === initialTeamCount + 1,
            `Created team with existing players, no new players added`,
            { 
                result, 
                playerCountChange: finalPlayerCount - initialPlayerCount,
                teamCountChange: finalTeamCount - initialTeamCount
            }
        );
    }

    testDuplicateTeamPrevention() {
        // Create a team first
        this.createTeam('TeamPlayer1', 'TeamPlayer2');
        const initialTeamCount = this.teams.length;
        
        // Try to create the same team again
        const result = this.createTeam('TeamPlayer1', 'TeamPlayer2');
        const finalTeamCount = this.teams.length;
        
        this.logResult(
            'Duplicate Team Prevention',
            result.success && finalTeamCount === initialTeamCount,
            `Team creation succeeded but no duplicate team was added`,
            { result, teamCountChange: finalTeamCount - initialTeamCount }
        );
    }

    testPlayerNameSorting() {
        const result = this.createTeam('Zebra', 'Alpha');
        const team = result.team;
        
        this.logResult(
            'Player Name Sorting in Teams',
            team.player1 === 'Alpha' && team.player2 === 'Zebra',
            `Players sorted correctly: ${team.player1} comes before ${team.player2}`,
            { team }
        );
    }

    testErrorHandlingSameNames() {
        const result = this.createTeam('SameName', 'SameName');
        
        this.logResult(
            'Error Handling - Same Player Names',
            result.error !== undefined,
            `Correctly rejected same player names: ${result.error}`,
            { result }
        );
    }

    testErrorHandlingEmptyNames() {
        const result1 = this.createTeam('', 'ValidName');
        const result2 = this.createTeam('ValidName', '');
        const result3 = this.createTeam('', '');
        
        this.logResult(
            'Error Handling - Empty Names',
            result1.error && result2.error && result3.error,
            `Correctly rejected empty names in all cases`,
            { result1, result2, result3 }
        );
    }

    testLocalStoragePersistence() {
        this.addPlayerIfNotExists('StorageTestPlayer');
        this.createTeam('StoragePlayer1', 'StoragePlayer2');
        
        const playersInStorage = JSON.parse(this.getItem('dominoPlayers') || '[]');
        const teamsInStorage = JSON.parse(this.getItem('dominoTeams') || '[]');
        
        this.logResult(
            'LocalStorage Persistence',
            playersInStorage.length > 0 && teamsInStorage.length > 0,
            `Data correctly saved to localStorage`,
            { 
                playersInMemory: this.players.length,
                playersInStorage: playersInStorage.length,
                teamsInMemory: this.teams.length,
                teamsInStorage: teamsInStorage.length
            }
        );
    }

    // Main test runner
    runAllTests() {
        console.log('🚀 Starting Player-Team Synchronization Tests...');
        console.log('=' .repeat(60));
        
        this.reset();
        
        // Run all tests
        this.testAddNewPlayer();
        this.testPreventDuplicatePlayer();
        this.testCaseInsensitiveDuplicatePrevention();
        this.testTeamCreationWithNewPlayers();
        this.testTeamCreationWithExistingPlayers();
        this.testDuplicateTeamPrevention();
        this.testPlayerNameSorting();
        this.testErrorHandlingSameNames();
        this.testErrorHandlingEmptyNames();
        this.testLocalStoragePersistence();
    }

    generateSummary() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('=' .repeat(60));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`   - ${r.testName}: ${r.message}`));
        }
        
        console.log('\n📈 FINAL DATA STATE:');
        console.log(`Players: ${this.players.length}`);
        console.log(`Teams: ${this.teams.length}`);
        
        if (this.players.length > 0) {
            console.log('\nPlayers List:');
            this.players.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));
        }
        
        if (this.teams.length > 0) {
            console.log('\nTeams List:');
            this.teams.forEach(t => console.log(`   - ${t.player1} & ${t.player2} (ID: ${t.id})`));
        }
        
        console.log('\n🎉 Testing completed!');
        
        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: (passedTests / totalTests) * 100,
            allTestsPassed: failedTests === 0
        };
    }
}

// Run the tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerTeamSyncTest;
} else {
    // Browser environment
    const tester = new PlayerTeamSyncTest();
    tester.runAllTests();
}

// Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
    const tester = new PlayerTeamSyncTest();
    tester.runAllTests();
    
    // Generate final summary and exit
    const results = tester.generateSummary();
    process.exit(results.allTestsPassed ? 0 : 1);
}