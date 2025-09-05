/**
 * Demonstration of Player-Team Synchronization
 * Shows how createTeam() and addPlayerIfNotExists() keep players and teams in sync
 */

class DemoPlayerTeamSync {
    constructor() {
        this.players = [];
        this.teams = [];
        this.localStorage = new Map();
    }

    // Mock localStorage
    setItem(key, value) {
        this.localStorage.set(key, value);
    }

    getItem(key) {
        return this.localStorage.get(key) || null;
    }

    // Core synchronization functions
    addPlayerIfNotExists(playerName) {
        if (!playerName) return;
        const nameExists = this.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!nameExists) {
            const newPlayer = { id: Date.now().toString(), name: playerName };
            this.players.push(newPlayer);
            this.setItem('dominoPlayers', JSON.stringify(this.players));
            console.log(`   ➕ Added new player: ${playerName}`);
        } else {
            console.log(`   ✓ Player already exists: ${playerName}`);
        }
    }

    findOrCreateTeam(player1Name, player2Name) {
        const sortedNames = [player1Name, player2Name].sort();
        
        let existingTeam = this.teams.find(team => 
            team.player1 === sortedNames[0] && team.player2 === sortedNames[1]
        );

        if (existingTeam) {
            console.log(`   ✓ Team already exists: ${existingTeam.player1} & ${existingTeam.player2}`);
            return existingTeam;
        } else {
            const newTeam = {
                id: Date.now().toString(),
                player1: sortedNames[0],
                player2: sortedNames[1],
            };
            this.teams.push(newTeam);
            this.setItem('dominoTeams', JSON.stringify(this.teams));
            console.log(`   ➕ Created new team: ${newTeam.player1} & ${newTeam.player2}`);
            return newTeam;
        }
    }

    createTeam(player1Name, player2Name) {
        console.log(`\n🎯 Creating team with: "${player1Name}" and "${player2Name}"`);
        
        if (!player1Name || !player2Name) {
            console.log('   ❌ Error: Please enter both player names');
            return { error: 'Please enter both player names' };
        }

        if (player1Name.toLowerCase() === player2Name.toLowerCase()) {
            console.log('   ❌ Error: Please enter two different player names');
            return { error: 'Please enter two different player names' };
        }

        console.log('   🔄 Checking/adding players to master list...');
        this.addPlayerIfNotExists(player1Name);
        this.addPlayerIfNotExists(player2Name);
        
        console.log('   🔄 Creating/finding team...');
        const team = this.findOrCreateTeam(player1Name, player2Name);
        
        console.log('   ✅ Team creation completed!');
        return { success: true, team: team };
    }

    showCurrentState() {
        console.log('\n📊 CURRENT STATE:');
        console.log(`Players (${this.players.length}):`);
        this.players.forEach((p, i) => console.log(`   ${i + 1}. ${p.name}`));
        
        console.log(`\nTeams (${this.teams.length}):`);
        this.teams.forEach((t, i) => console.log(`   ${i + 1}. ${t.player1} & ${t.player2}`));
    }

    runDemo() {
        console.log('🚀 PLAYER-TEAM SYNCHRONIZATION DEMO');
        console.log('=' .repeat(50));
        console.log('This demo shows how createTeam() automatically keeps players and teams in sync.');
        
        this.showCurrentState();
        
        // Demo 1: Create team with completely new players
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 1: Creating team with new players');
        this.createTeam('Alice', 'Bob');
        this.showCurrentState();
        
        // Demo 2: Create team with one existing, one new player
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 2: Creating team with mixed existing/new players');
        this.createTeam('Alice', 'Charlie'); // Alice exists, Charlie is new
        this.showCurrentState();
        
        // Demo 3: Create team with both existing players
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 3: Creating team with existing players');
        this.createTeam('Bob', 'Charlie'); // Both exist
        this.showCurrentState();
        
        // Demo 4: Try to create duplicate team
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 4: Attempting to create duplicate team');
        this.createTeam('Alice', 'Bob'); // Same as Demo 1
        this.showCurrentState();
        
        // Demo 5: Case insensitive handling
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 5: Case insensitive player handling');
        this.createTeam('alice', 'DAVID'); // alice exists (different case), DAVID is new
        this.showCurrentState();
        
        // Demo 6: Player name sorting in teams
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 6: Player name sorting (Zebra comes after Alpha)');
        this.createTeam('Zebra', 'Alpha'); // Should be sorted as Alpha & Zebra
        this.showCurrentState();
        
        // Demo 7: Error handling
        console.log('\n' + '=' .repeat(50));
        console.log('DEMO 7: Error handling');
        this.createTeam('SameName', 'SameName'); // Same names
        this.createTeam('', 'ValidName'); // Empty name
        this.showCurrentState();
        
        console.log('\n' + '=' .repeat(50));
        console.log('🎉 DEMO COMPLETED!');
        console.log('\nKey Points Demonstrated:');
        console.log('✓ New players are automatically added to the master list');
        console.log('✓ Existing players are not duplicated');
        console.log('✓ Case-insensitive player name checking');
        console.log('✓ Player names are sorted alphabetically in teams');
        console.log('✓ Duplicate teams are prevented');
        console.log('✓ Proper error handling for invalid inputs');
        console.log('✓ Data is persisted to localStorage');
        
        console.log('\n📈 FINAL STATISTICS:');
        console.log(`Total unique players created: ${this.players.length}`);
        console.log(`Total unique teams created: ${this.teams.length}`);
        console.log(`Players per team average: ${(this.players.length / Math.max(this.teams.length, 1)).toFixed(1)}`);
    }
}

// Run the demo
if (typeof require !== 'undefined' && require.main === module) {
    const demo = new DemoPlayerTeamSync();
    demo.runDemo();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DemoPlayerTeamSync;
}