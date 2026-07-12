/**
 * Example client demonstrating how to use grudgeDot services
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const AI_AGENT_URL = 'http://localhost:3001';
const GAME_SERVER_URL = 'http://localhost:3002';
const CLOUD_STORAGE_URL = 'http://localhost:3003';

class GrudgedotClient {
  constructor() {
    this.aiSocket = null;
    this.gameSocket = null;
    this.playerId = null;
    this.agentId = null;
  }

  // AI Agent Examples
  async connectToAIAgent() {
    console.log('Connecting to AI Agent service...');
    this.aiSocket = io(AI_AGENT_URL);

    this.aiSocket.on('connect', () => {
      console.log('✓ Connected to AI Agent service');
      
      // Register an agent
      this.aiSocket.emit('agent:register', {
        agentId: 'example-agent',
        type: 'assistant'
      });
    });

    this.aiSocket.on('agent:registered', (agent) => {
      console.log('✓ Agent registered:', agent);
      this.agentId = agent.id;
      
      // Send a query to the agent
      this.queryAIAgent('How should I design my game level?');
    });

    this.aiSocket.on('agent:response', (data) => {
      console.log('✓ AI Response:', data.response.answer);
    });

    this.aiSocket.on('agent:error', (error) => {
      console.error('✗ AI Agent error:', error);
    });
  }

  queryAIAgent(query) {
    if (!this.aiSocket || !this.agentId) {
      console.error('Not connected to AI Agent');
      return;
    }

    console.log(`Querying AI Agent: "${query}"`);
    this.aiSocket.emit('agent:query', {
      agentId: this.agentId,
      query: query
    });
  }

  async createAIAgent() {
    try {
      const response = await axios.post(`${AI_AGENT_URL}/agent/create`, {
        agentId: 'combat-ai',
        type: 'combat',
        config: {
          difficulty: 'medium',
          aggressiveness: 0.7
        }
      });
      console.log('✓ AI Agent created:', response.data);
      return response.data.agent;
    } catch (error) {
      console.error('✗ Failed to create AI agent:', error.message);
    }
  }

  // Game Server Examples
  async connectToGameServer() {
    console.log('Connecting to Game Server...');
    this.gameSocket = io(GAME_SERVER_URL);

    this.gameSocket.on('connect', () => {
      console.log('✓ Connected to Game Server');
      
      // Join as a player
      this.gameSocket.emit('player:join', {
        username: 'ExamplePlayer',
        characterId: 'char-001'
      });
    });

    this.gameSocket.on('player:joined', (player) => {
      console.log('✓ Joined game as:', player);
      this.playerId = player.id;
      
      // Move the player
      setTimeout(() => {
        this.movePlayer(100, 200, 0);
      }, 1000);
    });

    this.gameSocket.on('player:new', (data) => {
      console.log('✓ New player joined:', data);
    });

    this.gameSocket.on('player:moved', (data) => {
      console.log('✓ Player moved:', data.playerId, 'to', data.position);
    });

    this.gameSocket.on('game:tick', (gameState) => {
      // Update game state (runs at 60Hz by default)
      // console.log('Game tick:', gameState.players.length, 'players');
    });

    this.gameSocket.on('player:left', (data) => {
      console.log('✓ Player left:', data.playerId);
    });
  }

  movePlayer(x, y, z) {
    if (!this.gameSocket) {
      console.error('Not connected to Game Server');
      return;
    }

    console.log(`Moving player to (${x}, ${y}, ${z})`);
    this.gameSocket.emit('player:move', {
      position: { x, y, z }
    });
  }

  async createGameRoom() {
    try {
      const response = await axios.post(`${GAME_SERVER_URL}/room/create`, {
        roomName: 'Example Room',
        maxPlayers: 10
      });
      console.log('✓ Game room created:', response.data);
      return response.data.room;
    } catch (error) {
      console.error('✗ Failed to create room:', error.message);
    }
  }

  // Cloud Storage Examples
  async uploadCharacterAsset() {
    try {
      // Example: Upload a small test image (base64 encoded)
      const testImage = Buffer.from('test-image-data').toString('base64');
      
      const response = await axios.post(
        `${CLOUD_STORAGE_URL}/characters/char-001/upload`,
        {
          fileName: 'character-skin.png',
          fileData: testImage,
          fileType: 'image/png'
        }
      );
      
      console.log('✓ Character asset uploaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('✗ Failed to upload asset:', error.message);
    }
  }

  async uploadHeroAsset() {
    try {
      const testData = Buffer.from('test-hero-model').toString('base64');
      
      const response = await axios.post(
        `${CLOUD_STORAGE_URL}/heroes/hero-001/upload`,
        {
          fileName: 'hero-model.glb',
          fileData: testData,
          fileType: 'model/gltf-binary'
        }
      );
      
      console.log('✓ Hero asset uploaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('✗ Failed to upload hero asset:', error.message);
    }
  }

  async listCharacterAssets() {
    try {
      const response = await axios.get(
        `${CLOUD_STORAGE_URL}/characters/char-001/assets`
      );
      console.log('✓ Character assets:', response.data.files);
      return response.data.files;
    } catch (error) {
      console.error('✗ Failed to list assets:', error.message);
    }
  }

  // Health Checks
  async checkServices() {
    console.log('\nChecking service health...');
    
    try {
      const [aiHealth, gameHealth, storageHealth] = await Promise.all([
        axios.get(`${AI_AGENT_URL}/health`),
        axios.get(`${GAME_SERVER_URL}/health`),
        axios.get(`${CLOUD_STORAGE_URL}/health`)
      ]);

      console.log('✓ AI Agent Service:', aiHealth.data.status);
      console.log('✓ Game Server:', gameHealth.data.status);
      console.log('✓ Cloud Storage:', storageHealth.data.status);
      
      return true;
    } catch (error) {
      console.error('✗ Service health check failed:', error.message);
      console.error('Make sure all services are running with: npm run docker:up');
      return false;
    }
  }

  // Cleanup
  disconnect() {
    if (this.aiSocket) {
      this.aiSocket.disconnect();
      console.log('Disconnected from AI Agent service');
    }
    if (this.gameSocket) {
      this.gameSocket.disconnect();
      console.log('Disconnected from Game Server');
    }
  }
}

// Run example
async function runExample() {
  const client = new GrudgedotClient();

  // Check if services are running
  const servicesHealthy = await client.checkServices();
  if (!servicesHealthy) {
    console.log('\nPlease start the services first:');
    console.log('  npm run docker:up');
    process.exit(1);
  }

  console.log('\n=== Running grudgeDot Examples ===\n');

  // AI Agent examples
  console.log('--- AI Agent Examples ---');
  await client.createAIAgent();
  await client.connectToAIAgent();

  // Wait a bit for AI agent to process
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Game Server examples
  console.log('\n--- Game Server Examples ---');
  await client.createGameRoom();
  await client.connectToGameServer();

  // Wait a bit for game server to process
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Cloud Storage examples
  console.log('\n--- Cloud Storage Examples ---');
  await client.uploadCharacterAsset();
  await client.uploadHeroAsset();
  await client.listCharacterAssets();

  // Keep the example running for a bit to see WebSocket events
  console.log('\n✓ Examples running... (will exit in 10 seconds)');
  setTimeout(() => {
    client.disconnect();
    console.log('\n=== Example completed ===');
    process.exit(0);
  }, 10000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down example...');
  process.exit(0);
});

// Run if executed directly
if (require.main === module) {
  runExample().catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

module.exports = GrudgedotClient;
