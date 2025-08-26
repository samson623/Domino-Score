import React, { useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

const HomePage = () => {
  useEffect(() => {
    // This will run the script after the component mounts
    const script = document.createElement('script');
    script.src = '/scripts/main.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up the script when the component unmounts
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Domino Score</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
      </Head>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" />
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.4.0/jspdf.umd.min.js" />

      <div className="bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        {/* Navigation */}
        <nav className="domino-bg text-white p-4 sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <i className="fas fa-dice-six text-2xl"></i>
              <h1 className="text-xl font-bold">Domino Score</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => showExportModal()} className="p-2 rounded-lg bg-green-600 hover:bg-green-700 transition" title="Export Data">
                <i className="fas fa-download"></i>
              </button>
              <button onClick={() => showResetModal()} className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition" title="Reset All Data">
                <i className="fas fa-trash-alt"></i>
              </button>
              <button id="themeToggle" className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition">
                <i className="fas fa-moon" id="themeIcon"></i>
              </button>
              <div className="hidden md:flex space-x-2">
                <button onClick={() => showSection('home')} data-section="home" className="nav-btn px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-20">
                  <i className="fas fa-home mr-1"></i>Home
                </button>
                <button onClick={() => showSection('live')} data-section="live" className="nav-btn px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-20">
                  <i className="fas fa-play mr-1"></i>Live Game
                </button>
                <button onClick={() => showSection('players')} data-section="players" className="nav-btn px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-20">
                  <i className="fas fa-user-plus mr-1"></i>Players
                </button>
                <button onClick={() => showSection('teams')} data-section="teams" className="nav-btn px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-20">
                  <i className="fas fa-users mr-1"></i>Teams
                </button>
                <button onClick={() => showSection('leaderboard')} data-section="leaderboard" className="nav-btn px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-20">
                  <i className="fas fa-trophy mr-1"></i>Leaderboard
                </button>
                <button onClick={() => showSection('history')} data-section="history" className="nav-btn px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-20">
                  <i className="fas fa-list mr-1"></i>History
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 fixed bottom-0 left-0 right-0 z-50">
          <div className="flex justify-around py-2">
            <button onClick={() => showSection('home')} data-section="home" className="mobile-nav-btn flex flex-col items-center p-2 text-gray-600 dark:text-gray-100">
              <i className="fas fa-home text-lg"></i>
              <span className="text-xs">Home</span>
            </button>
            <button onClick={() => showSection('live')} data-section="live" className="mobile-nav-btn flex flex-col items-center p-2 text-gray-600 dark:text-gray-100">
              <i className="fas fa-play text-lg"></i>
              <span className="text-xs">Live</span>
            </button>
            <button onClick={() => showSection('players')} data-section="players" className="mobile-nav-btn flex flex-col items-center p-2 text-gray-600 dark:text-gray-100">
              <i className="fas fa-user-plus text-lg"></i>
              <span className="text-xs">Players</span>
            </button>
            <button onClick={() => showSection('teams')} data-section="teams" className="mobile-nav-btn flex flex-col items-center p-2 text-gray-600 dark:text-gray-100">
              <i className="fas fa-users text-lg"></i>
              <span className="text-xs">Teams</span>
            </button>
            <button onClick={() => showSection('leaderboard')} data-section="leaderboard" className="mobile-nav-btn flex flex-col items-center p-2 text-gray-600 dark:text-gray-100">
              <i className="fas fa-trophy text-lg"></i>
              <span className="text-xs">Stats</span>
            </button>
            <button onClick={() => showSection('history')} data-section="history" className="mobile-nav-btn flex flex-col items-center p-2 text-gray-600 dark:text-gray-100">
              <i className="fas fa-list text-lg"></i>
              <span className="text-xs">History</span>
            </button>
          </div>
        </div>

        <div className="container mx-auto p-4 pb-20">
          {/* Home Section */}
          <div id="homeSection" className="section">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Today's Performance */}
              <div className="domino-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <i className="fas fa-calendar-day mr-2 text-blue-500"></i>
                  Today's Performance
                </h3>
                <div id="todaysPerformance" className="space-y-3">
                  {/* Dynamic content */}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="domino-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <i className="fas fa-bolt mr-2 text-yellow-500"></i>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button onClick={() => startNewGame()} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium">
                    <i className="fas fa-play mr-2"></i>Start New Game
                  </button>
                  <button onClick={() => showSection('players')} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium">
                    <i className="fas fa-user-plus mr-2"></i>Add Player
                  </button>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    <i className="fas fa-star mr-1"></i>PETAROLL: 75-0 or 150-&lt;75 = 2 wins!
                  </p>
                </div>
              </div>

              {/* Recent Games */}
              <div className="domino-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <i className="fas fa-history mr-2 text-purple-500"></i>
                  Recent Games
                </h3>
                <div id="recentGames" className="space-y-2">
                  {/* Dynamic content */}
                </div>
              </div>

              {/* Daily Player Summary */}
              <div className="domino-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <i className="fas fa-user-check mr-2 text-indigo-500"></i>
                  Daily Player Summary
                </h3>
                <div id="dailyPlayerSummaryList" className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Dynamic content */}
                </div>
              </div>

              {/* Achievements */}
              <div className="domino-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <i className="fas fa-award mr-2 text-green-500"></i>
                  Achievements
                </h3>
                <div id="achievementsList" className="space-y-3 text-sm max-h-60 overflow-y-auto pr-2">
                  {/* Dynamic content */}
                </div>
              </div>

            </div>
          </div>

          {/* Live Game Section */}
          <div id="liveSection" className="section hidden">
            <div className="max-w-4xl mx-auto">
              {/* Game Mode Selection */}
              <div className="domino-card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 text-center">Select Game Mode</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => selectGameMode('team')} id="teamModeBtn" className="game-mode-btn p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition">
                    <i className="fas fa-users text-3xl mb-2"></i>
                    <h3 className="text-lg font-bold">Team vs Team</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">2 vs 2 players</p>
                  </button>
                  <button onClick={() => selectGameMode('single')} id="singleModeBtn" className="game-mode-btn p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition">
                    <i className="fas fa-user text-3xl mb-2"></i>
                    <h3 className="text-lg font-bold">One on One</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">1 vs 1 player</p>
                  </button>
                </div>
              </div>

              {/* Game Setup */}
              <div id="gameSetup" className="domino-card p-6 mb-6 hidden">
                <h2 className="text-2xl font-bold mb-6 text-center">Setup New Game</h2>

                {/* Team Mode Setup */}
                <div id="teamModeSetup" className="hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-center">Team 1</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">Load Saved Team (Optional)</label>
                        <select id="gameTeam1SavedTeamSelect" className="w-full p-3 border rounded-lg" onChange={(e) => handleSavedTeamSelection('1', e.target.value)}>
                          {/* Options populated by JS */}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Player 1</label>
                        <select id="gameTeam1Player1Input" className="w-full p-3 border rounded-lg"></select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Player 2</label>
                        <select id="gameTeam1Player2Input" className="w-full p-3 border rounded-lg"></select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-center">Team 2</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">Load Saved Team (Optional)</label>
                        <select id="gameTeam2SavedTeamSelect" className="w-full p-3 border rounded-lg" onChange={(e) => handleSavedTeamSelection('2', e.target.value)}>
                          {/* Options populated by JS */}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Player 1</label>
                        <select id="gameTeam2Player1Input" className="w-full p-3 border rounded-lg"></select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Player 2</label>
                        <select id="gameTeam2Player2Input" className="w-full p-3 border rounded-lg"></select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Mode Setup */}
                <div id="singleModeSetup" className="hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Player 1 Name</label>
                      <select id="player1Select" className="w-full p-3 border rounded-lg">
                        <option value="">Select player</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Player 2 Name</label>
                      <select id="player2Select" className="w-full p-3 border rounded-lg">
                        <option value="">Select player</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Best Of Selection */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Match Length</label>
                  <select id="bestOfSelect" className="w-full p-3 border rounded-lg">
                    <option value="1">Single Game</option>
                    <option value="3">Best of 3</option>
                    <option value="5">Best of 5</option>
                  </select>
                </div>

                <button onClick={() => startGame()} className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-bold text-lg">
                  <i className="fas fa-flag-checkered mr-2"></i>Start Game to 150!
                </button>
              </div>

              {/* Live Game Interface */}
              <div id="liveGame" className="hidden">
                {/* PETAROLL Alert */}
                <div id="petarollAlert" className="hidden mb-4 p-4 bg-orange-100 dark:bg-orange-900 rounded-lg text-center">
                  <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                    <i className="fas fa-fire mr-2"></i>PETAROLL ALERT! Game will end at 75-0!<i className="fas fa-fire ml-2"></i>
                  </p>
                </div>

                {/* Match Score */}
                <div id="matchScore" className="text-center font-bold text-lg mb-4"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Team 1 Score */}
                  <div className="domino-card p-6">
                    <div className="text-center">
                      <div id="team1Players" className="text-xl font-bold mb-4"></div>
                      <div className="text-6xl font-bold mb-4" id="team1Score">0</div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
                        <div id="team1Progress" className="bg-blue-500 h-4 rounded-full transition-all duration-300" style={{width: '0%'}}></div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <button onClick={() => addScore(1, 5)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+5</button>
                        <button onClick={() => addScore(1, 10)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+10</button>
                        <button onClick={() => addScore(1, 15)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+15</button>
                        <button onClick={() => addScore(1, 20)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+20</button>
                        <button onClick={() => addScore(1, 25)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+25</button>
                        <button onClick={() => addScore(1, 30)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+30</button>
                        <button onClick={() => addScore(1, 35)} className="score-btn bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold">+35</button>
                        <button onClick={() => undoScore(1)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">
                          <i className="fas fa-undo"></i>
                        </button>
                      </div>
                      {/* Custom score input */}
                      <div className="flex justify-center items-center space-x-2 mt-2">
                        <button onClick={() => subtractCustomScore(1)} className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg font-bold">
                          <i className="fas fa-minus"></i>
                        </button>
                        <input type="number" id="customScore1" className="custom-score-input p-2 border rounded-lg" placeholder="Custom" min="-150" max="150" />
                        <button onClick={() => addCustomScore(1)} className="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg font-bold">
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Team 2 Score */}
                  <div className="domino-card p-6">
                    <div className="text-center">
                      <div id="team2Players" className="text-xl font-bold mb-4"></div>
                      <div className="text-6xl font-bold mb-4" id="team2Score">0</div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
                        <div id="team2Progress" className="bg-red-500 h-4 rounded-full transition-all duration-300" style={{width: '0%'}}></div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <button onClick={() => addScore(2, 5)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+5</button>
                        <button onClick={() => addScore(2, 10)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+10</button>
                        <button onClick={() => addScore(2, 15)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+15</button>
                        <button onClick={() => addScore(2, 20)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+20</button>
                        <button onClick={() => addScore(2, 25)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+25</button>
                        <button onClick={() => addScore(2, 30)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+30</button>
                        <button onClick={() => addScore(2, 35)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">+35</button>
                        <button onClick={() => undoScore(2)} className="score-btn bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold">
                          <i className="fas fa-undo"></i>
                        </button>
                      </div>
                      {/* Custom score input */}
                      <div className="flex justify-center items-center space-x-2 mt-2">
                        <button onClick={() => subtractCustomScore(2)} className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg font-bold">
                          <i className="fas fa-minus"></i>
                        </button>
                        <input type="number" id="customScore2" className="custom-score-input p-2 border rounded-lg" placeholder="Custom" min="-150" max="150" />
                        <button onClick={() => addCustomScore(2)} className="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg font-bold">
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Controls */}
                <div className="domino-card p-6 text-center">
                  <div id="gameControls" className="flex justify-center space-x-4">
                    <button onClick={() => endGame()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg">
                      <i className="fas fa-stop mr-2"></i>End Game
                    </button>
                    <button onClick={() => resetGame()} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-6 rounded-lg">
                      <i className="fas fa-sync mr-2"></i>Reset
                    </button>
                    <button id="micBtn" onClick={() => toggleMic()} className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-6 rounded-lg transition-all">
                      <i className="fas fa-microphone mr-2"></i>Voice
                    </button>
                  </div>
                  <div id="confirmScoreContainer" className="hidden mt-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button id="confirmScoreBtn" className="w-full sm:w-2/3 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-bold text-lg animate-pulse">
                        <i className="fas fa-check-double mr-2"></i>Confirm Final Score
                      </button>
                      <button id="correctScoreBtn" className="w-full sm:w-1/3 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium">
                        <i className="fas fa-edit mr-2"></i>Edit
                      </button>
                    </div>
                  </div>
                  <div id="voiceOutput" className="mt-4 text-sm text-gray-600 dark:text-gray-300"></div>
                </div>

                {/* Turn Timer */}
                <div className="domino-card p-6 mt-6 text-center">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Turn Time Limit (seconds, max 60)</label>
                    <input type="number" id="turnTimeInput" className="w-24 p-2 border rounded-lg" min="5" max="60" defaultValue="60" />
                  </div>
                  <div className="mb-4 text-3xl font-bold" id="turnTimerDisplay">--</div>
                  <div className="flex justify-center space-x-4">
                    <button onClick={() => startTurnTimer()} className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg">
                      <i className="fas fa-play mr-2"></i>Start Timer
                    </button>
                    <button onClick={() => stopTurnTimer()} className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded-lg">
                      <i className="fas fa-stop mr-2"></i>Stop
                    </button>
                  </div>
                </div>

                {/* Score History */}
                <div className="domino-card p-6 mt-6">
                  <h3 className="text-lg font-bold mb-4">Score History</h3>
                  <div id="scoreHistory" className="max-h-40 overflow-y-auto space-y-2">
                    {/* Dynamic content */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Players Section */}
          <div id="playersSection" className="section hidden">
            <div className="mb-6">
              <button onClick={() => showCreatePlayerForm()} className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-user-plus mr-2"></i>Add New Player
              </button>
            </div>

            {/* Create Player Form */}
            <div id="createPlayerForm" className="domino-card p-6 mb-6 hidden">
              <h3 className="text-xl font-bold mb-4">Add New Player</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Player Name</label>
                <input type="text" id="newPlayerName" className="w-full p-3 border rounded-lg" placeholder="Enter player name" />
              </div>
              <div className="flex space-x-4 mt-6">
                <button onClick={() => createPlayer()} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg font-medium">
                  <i className="fas fa-save mr-2"></i>Save Player
                </button>
                <button onClick={() => hideCreatePlayerForm()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium">
                  <i className="fas fa-times mr-2"></i>Cancel
                </button>
              </div>
            </div>

            {/* Players List */}
            <div id="playersList" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Dynamic content */}
            </div>
          </div>

          {/* Teams Section */}
          <div id="teamsSection" className="section hidden">
            <div className="mb-6">
              <button onClick={() => showCreateTeam()} className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-plus mr-2"></i>Create New Team
              </button>
            </div>

            {/* Create Team Form */}
            <div id="createTeamForm" className="domino-card p-6 mb-6 hidden">
              <h3 className="text-xl font-bold mb-4">Create New Team</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Player 1 Name</label>
                  <input type="text" id="teamPlayer1Input" className="w-full p-3 border rounded-lg" placeholder="Enter player 1 name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Player 2 Name</label>
                  <input type="text" id="teamPlayer2Input" className="w-full p-3 border rounded-lg" placeholder="Enter player 2 name" />
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <button onClick={() => createTeam()} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg font-medium">
                  <i className="fas fa-save mr-2"></i>Create Team
                </button>
                <button onClick={() => hideCreateTeam()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium">
                  <i className="fas fa-times mr-2"></i>Cancel
                </button>
              </div>
            </div>

            {/* Teams List */}
            <div id="teamsList" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Dynamic content */}
            </div>
          </div>

          {/* History Section */}
          <div id="historySection" className="section hidden">
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => showHistory('daily')} className="history-tab bg-blue-500 text-white py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-calendar-day mr-1"></i>Daily
                </button>
                <button onClick={() => showHistory('weekly')} className="history-tab bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-calendar-week mr-1"></i>Weekly
                </button>
                <button onClick={() => showHistory('monthly')} className="history-tab bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-calendar-alt mr-1"></i>Monthly
                </button>
                <button onClick={() => showHistory('alltime')} className="history-tab bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-infinity mr-1"></i>All Time
                </button>
              </div>
            </div>
            <div className="domino-card p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                <span>
                  <i className="fas fa-list mr-2 text-blue-500"></i>
                  Game History
                </span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  Total Games: <span id="totalGamesCount">0</span>
                </span>
              </h3>
              <div id="gameHistoryList" className="space-y-2">
                {/* Dynamic content */}
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div id="leaderboardSection" className="section hidden">
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => showLeaderboard('daily')} className="leaderboard-tab bg-blue-500 text-white py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-calendar-day mr-1"></i>Daily
                </button>
                <button onClick={() => showLeaderboard('weekly')} className="leaderboard-tab bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-calendar-week mr-1"></i>Weekly
                </button>
                <button onClick={() => showLeaderboard('monthly')} className="leaderboard-tab bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-calendar-alt mr-1"></i>Monthly
                </button>
                <button onClick={() => showLeaderboard('alltime')} className="leaderboard-tab bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium">
                  <i className="fas fa-infinity mr-1"></i>All Time
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Rankings */}
              <div className="domino-card p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                  <span>
                    <i className="fas fa-users mr-2 text-blue-500"></i>
                    Team Rankings
                  </span>
                  <span id="teamPeriodInfo" className="text-sm font-normal text-gray-500 dark:text-gray-400"></span>
                </h3>
                <div id="teamRankings">
                  {/* Dynamic content */}
                </div>
              </div>

              {/* Player Stats */}
              <div className="domino-card p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                  <span>
                    <i className="fas fa-user mr-2 text-green-500"></i>
                    Top Players
                  </span>
                  <span id="playerPeriodInfo" className="text-sm font-normal text-gray-500 dark:text-gray-400"></span>
                </h3>
                <div id="playerStats">
                  {/* Dynamic content */}
                </div>
              </div>
            </div>

            {/* New Stats Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Opponent Comparison */}
              <div className="domino-card p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <i className="fas fa-balance-scale mr-2 text-red-500"></i>
                  Opponent Comparison
                </h3>
                <div className="space-y-2">
                  <select id="comparison-select1" className="w-full p-2 border rounded-lg"></select>
                  <select id="comparison-select2" className="w-full p-2 border rounded-lg"></select>
                  <div id="comparison-period-selector" className="flex justify-center space-x-4 py-2">
                    <div className="flex items-center">
                      <input type="radio" id="period-daily" name="comparison-period" value="daily" defaultChecked />
                      <label htmlFor="period-daily" className="ml-2 cursor-pointer">Today</label>
                    </div>
                    <div className="flex items-center">
                      <input type="radio" id="period-alltime" name="comparison-period" value="alltime" />
                      <label htmlFor="period-alltime" className="ml-2 cursor-pointer">All Time</label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => runOpponentComparison()} className="w-2/3 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg">Compare</button>
                    <button onClick={() => resetOpponentComparison()} className="w-1/3 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg">Reset</button>
                  </div>
                </div>
                <div id="comparison-results" className="mt-4"></div>
              </div>

              {/* Streaks & Slumps */}
              <div className="domino-card p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <i className="fas fa-chart-line mr-2 text-purple-500"></i>
                  Streaks & Slumps
                </h3>
                <div id="streaks-slumps-list" className="space-y-4"></div>
              </div>

              {/* PETAROLL Leaders */}
              <div className="domino-card p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <i className="fas fa-fire-alt mr-2 text-orange-500"></i>
                  PETAROLL Leaders
                </h3>
                <div id="petaroll-leaders-list" className="space-y-4"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Win Modal */}
        <div id="winModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div className="domino-card p-8 m-4 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <div id="winMessage" className="text-lg mb-6"></div>
            <div className="flex space-x-4 justify-center">
              <button id="playAgainBtn" onClick={() => playAgain()} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-play mr-2"></i>Play Again
              </button>
              <button onClick={() => closeWinModal()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-times mr-2"></i>Close
              </button>
            </div>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        <div id="resetModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div className="domino-card p-8 m-4 max-w-md w-full text-center">
            <div className="text-6xl mb-4 text-red-500">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Reset Data</h2>
            <p className="text-lg mb-6">Choose what you would like to reset.</p>
            <div className="flex flex-col space-y-4 justify-center">
              <button onClick={() => resetTodayData()} className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-calendar-day mr-2"></i>Reset Today's Data
              </button>
              <button onClick={() => resetAllData()} className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-trash-alt mr-2"></i>Reset Everything
              </button>
              <button onClick={() => closeResetModal()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium mt-4">
                <i className="fas fa-times mr-2"></i>Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Generic Confirmation Modal */}
        <div id="confirmModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div className="domino-card p-8 m-4 max-w-md w-full text-center">
            <div id="confirmModalIcon" className="text-6xl mb-4 text-red-500">⚠️</div>
            <h2 id="confirmModalTitle" className="text-2xl font-bold mb-4">Are you sure?</h2>
            <p id="confirmModalMessage" className="text-lg mb-6">This action cannot be undone.</p>
            <div className="flex space-x-4 justify-center">
              <button id="confirmModalConfirmBtn" className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg font-medium">
                Confirm
              </button>
              <button onClick={() => closeConfirmModal()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Generic Toast Notification */}
        <div id="toast" className="hidden fixed bottom-4 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg">
          <p id="toastMessage"></p>
        </div>


        {/* Export Modal */}
        <div id="exportModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div className="domino-card p-8 m-4 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">Export Data</h2>
            <p className="text-center mb-6">Choose a format to download your data.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => exportDataAs('pdf')} className="bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <i className="fas fa-file-pdf mr-2"></i>Export as PDF
              </button>
              <button onClick={() => exportDataAs('csv')} className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <i className="fas fa-file-csv mr-2"></i>Export as CSV
              </button>
              <button onClick={() => exportDataAs('txt')} className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <i className="fas fa-file-alt mr-2"></i>Export as TXT
              </button>
              <button onClick={() => exportData()} className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <i className="fas fa-file-code mr-2"></i>Export as JSON
              </button>
            </div>
            <div className="text-center mt-6">
              <button onClick={() => closeExportModal()} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-6 rounded-lg font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Edit Game Modal */}
        <div id="editGameModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div className="domino-card p-8 m-4 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Edit Game</h2>
            <div id="editGameForm">
              {/* Dynamic content */}
            </div>
            <div className="flex space-x-4 mt-6">
              <button onClick={() => saveGameEdits()} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-save mr-2"></i>Save Changes
              </button>
              <button onClick={() => closeEditGameModal()} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium">
                <i className="fas fa-times mr-2"></i>Cancel
              </button>
            </div>
          </div>
        </div>

        <div id="achievementToast" className="hidden"></div>
      </div>
    </>
  );
};

export default HomePage;
