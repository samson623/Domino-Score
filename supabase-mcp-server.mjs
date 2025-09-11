#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'supabase-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'query_database':
          return await this.handleQueryDatabase(args);
        case 'insert_data':
          return await this.handleInsertData(args);
        case 'update_data':
          return await this.handleUpdateData(args);
        case 'delete_data':
          return await this.handleDeleteData(args);
        case 'get_user_profile':
          return await this.handleGetUserProfile(args);
        case 'get_user_games':
          return await this.handleGetUserGames(args);
        case 'get_user_billing':
          return await this.handleGetUserBilling(args);
        case 'create_game':
          return await this.handleCreateGame(args);
        case 'update_game':
          return await this.handleUpdateGame(args);
        case 'get_leaderboard':
          return await this.handleGetLeaderboard(args);
        case 'authenticate_user':
          return await this.handleAuthenticateUser(args);
        case 'register_user':
          return await this.handleRegisterUser(args);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  setupRequestHandlers() {
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'query_database',
            description: 'Execute a custom SQL query on the Supabase database',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to execute' },
                params: { type: 'array', description: 'Query parameters', items: { type: 'any' } }
              },
              required: ['query']
            }
          },
          {
            name: 'insert_data',
            description: 'Insert data into a Supabase table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                data: { type: 'object', description: 'Data to insert' }
              },
              required: ['table', 'data']
            }
          },
          {
            name: 'update_data',
            description: 'Update data in a Supabase table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                data: { type: 'object', description: 'Data to update' },
                filters: { type: 'object', description: 'Filter conditions' }
              },
              required: ['table', 'data', 'filters']
            }
          },
          {
            name: 'delete_data',
            description: 'Delete data from a Supabase table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                filters: { type: 'object', description: 'Filter conditions' }
              },
              required: ['table', 'filters']
            }
          },
          {
            name: 'get_user_profile',
            description: 'Get user profile information',
            inputSchema: {
              type: 'object',
              properties: { userId: { type: 'string', description: 'User ID' } },
              required: ['userId']
            }
          },
          {
            name: 'get_user_games',
            description: 'Get user game history and scores',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string', description: 'User ID' },
                limit: { type: 'number', description: 'Maximum number of games to return', default: 10 }
              },
              required: ['userId']
            }
          },
          {
            name: 'get_user_billing',
            description: 'Get user billing information',
            inputSchema: {
              type: 'object',
              properties: { userId: { type: 'string', description: 'User ID' } },
              required: ['userId']
            }
          },
          {
            name: 'create_game',
            description: 'Create a new game record',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string', description: 'User ID' },
                gameType: { type: 'string', description: 'Type of game (dominoes, custom, etc.)' },
                players: { type: 'array', description: 'Array of player objects' },
                initialData: { type: 'object', description: 'Initial game data/scores' }
              },
              required: ['userId', 'gameType']
            }
          },
          {
            name: 'update_game',
            description: 'Update an existing game',
            inputSchema: {
              type: 'object',
              properties: {
                gameId: { type: 'string', description: 'Game ID' },
                scores: { type: 'object', description: 'Updated scores' },
                winner: { type: 'string', description: 'Winner of the game' },
                completed: { type: 'boolean', description: 'Whether the game is completed' },
                duration: { type: 'string', description: 'Game duration (ISO 8601 interval)' }
              },
              required: ['gameId']
            }
          },
          {
            name: 'get_leaderboard',
            description: 'Get leaderboard data',
            inputSchema: {
              type: 'object',
              properties: {
                gameType: { type: 'string', description: 'Filter by game type' },
                limit: { type: 'number', description: 'Maximum number of results', default: 50 },
                userId: { type: 'string', description: 'Get stats for specific user' }
              }
            }
          },
          {
            name: 'authenticate_user',
            description: 'Authenticate a user with email and password',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'User email' },
                password: { type: 'string', description: 'User password' }
              },
              required: ['email', 'password']
            }
          },
          {
            name: 'register_user',
            description: 'Register a new user',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'User email' },
                password: { type: 'string', description: 'User password' },
                username: { type: 'string', description: 'Username' },
                fullName: { type: 'string', description: 'Full name' }
              },
              required: ['email', 'password']
            }
          }
        ]
      };
    });
  }

  async handleQueryDatabase(args) {
    try {
      const { query, params = [] } = args;
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: query,
        query_params: params
      });

      if (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Database query failed: ${error.message}`
        );
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Query execution failed: ${error.message}`
      );
    }
  }

  async handleInsertData(args) {
    try {
      const { table, data } = args;
      const { data: result, error } = await supabase.from(table).insert(data).select();
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Insert failed: ${error.message}`);
      }
      return { content: [{ type: 'text', text: `Successfully inserted data into ${table}:\n${JSON.stringify(result, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Insert operation failed: ${error.message}`);
    }
  }

  async handleUpdateData(args) {
    try {
      const { table, data, filters } = args;
      let query = supabase.from(table).update(data);
      Object.entries(filters).forEach(([key, value]) => { query = query.eq(key, value); });
      const { data: result, error } = await query.select();
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Update failed: ${error.message}`);
      }
      return { content: [{ type: 'text', text: `Successfully updated ${result.length} records in ${table}:\n${JSON.stringify(result, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Update operation failed: ${error.message}`);
    }
  }

  async handleDeleteData(args) {
    try {
      const { table, filters } = args;
      let query = supabase.from(table).delete();
      Object.entries(filters).forEach(([key, value]) => { query = query.eq(key, value); });
      const { data: result, error } = await query.select();
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Delete failed: ${error.message}`);
      }
      return { content: [{ type: 'text', text: `Successfully deleted ${result.length} records from ${table}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Delete operation failed: ${error.message}`);
    }
  }

  async handleGetUserProfile(args) {
    try {
      const { userId } = args;
      const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') {
        throw new McpError(ErrorCode.InternalError, `Failed to get user profile: ${error.message}`);
      }
      return { content: [{ type: 'text', text: data ? `User Profile:\n${JSON.stringify(data, null, 2)}` : `No profile found for user ${userId}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Get user profile failed: ${error.message}`);
    }
  }

  async handleGetUserGames(args) {
    try {
      const { userId, limit = 10 } = args;
      const { data, error } = await supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to get user games: ${error.message}`);
      }
      return { content: [{ type: 'text', text: `User Games (${data.length} results):\n${JSON.stringify(data, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Get user games failed: ${error.message}`);
    }
  }

  async handleGetUserBilling(args) {
    try {
      const { userId } = args;
      const { data, error } = await supabase.from('user_billing').select('*').eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') {
        throw new McpError(ErrorCode.InternalError, `Failed to get user billing: ${error.message}`);
      }
      return { content: [{ type: 'text', text: data ? `User Billing:\n${JSON.stringify(data, null, 2)}` : `No billing info found for user ${userId}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Get user billing failed: ${error.message}`);
    }
  }

  async handleCreateGame(args) {
    try {
      const { userId, gameType, players = [], initialData = {} } = args;
      const { data: game, error } = await supabase
        .from('games')
        .insert({ user_id: userId, game_type: gameType, players: players, scores: initialData, completed: false })
        .select()
        .single();
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to create game: ${error.message}`);
      }
      return { content: [{ type: 'text', text: `Game created successfully:\n${JSON.stringify(game, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Create game failed: ${error.message}`);
    }
  }

  async handleUpdateGame(args) {
    try {
      const { gameId, scores, winner, completed, duration } = args;
      const updateData = { updated_at: new Date().toISOString() };
      if (scores !== undefined) updateData.scores = scores;
      if (winner !== undefined) updateData.winner = winner;
      if (completed !== undefined) updateData.completed = completed;
      if (duration !== undefined) updateData.duration = duration;
      const { data: game, error } = await supabase.from('games').update(updateData).eq('id', gameId).select().single();
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to update game: ${error.message}`);
      }
      return { content: [{ type: 'text', text: `Game updated successfully:\n${JSON.stringify(game, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Update game failed: ${error.message}`);
    }
  }

  async handleGetLeaderboard(args) {
    try {
      const { gameType, limit = 50, userId } = args;
      let query = supabase
        .from('leaderboard')
        .select(`*, user_profiles!inner(username, full_name, avatar_url)`) 
        .order('total_score', { ascending: false })
        .limit(limit);
      if (gameType) query = query.eq('game_type', gameType);
      if (userId) query = query.eq('user_id', userId);
      const { data: leaderboard, error } = await query;
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to get leaderboard: ${error.message}`);
      }
      let userStats = null;
      if (userId) {
        const { data: stats } = await supabase.rpc('get_user_stats', { user_uuid: userId, game_type_filter: gameType || null });
        userStats = stats?.[0] || null;
      }
      return { content: [{ type: 'text', text: `Leaderboard (${leaderboard?.length || 0} results):\n${JSON.stringify({ leaderboard, userStats }, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Get leaderboard failed: ${error.message}`);
    }
  }

  async handleAuthenticateUser(args) {
    try {
      const { email, password } = args;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Authentication failed: ${error.message}`);
      }
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', data.user.id).single();
      return { content: [{ type: 'text', text: `User authenticated successfully:\n${JSON.stringify({ user: data.user, session: data.session, profile: profile || null }, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Authentication failed: ${error.message}`);
    }
  }

  async handleRegisterUser(args) {
    try {
      const { email, password, username, fullName } = args;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username || null, full_name: fullName || null } }
      });
      if (error) {
        throw new McpError(ErrorCode.InternalError, `Registration failed: ${error.message}`);
      }
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          username: username || null,
          full_name: fullName || null,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return { content: [{ type: 'text', text: `User registered successfully:\n${JSON.stringify({ user: data.user, session: data.session, message: 'Please check your email to confirm your account' }, null, 2)}` }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Registration failed: ${error.message}`);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supabase MCP server started');
  }
}

const server = new SupabaseMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});


