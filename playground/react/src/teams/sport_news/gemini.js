import { Agent, Task, Team } from 'kaibanjs';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

// Define tools
const searchTool = new TavilySearchResults({
  maxResults: 3,
  apiKey: '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',
});

// Define agents
const searchAgent = new Agent({
  name: 'Scout',
  role: 'Information Gatherer',
  goal: 'Find up-to-date information about the given sports query.',
  background: 'Research',
  type: 'ReactChampionAgent',
  tools: [searchTool],
  llmConfig: {
    provider: 'google',
    model: 'gemini-1.5-pro',
  },
});

const contentCreator = new Agent({
  name: 'Writer',
  role: 'Content Creator',
  goal: 'Generate a comprehensive articles about any sports event.',
  background: 'Journalism',
  type: 'ReactChampionAgent',
  tools: [],
  llmConfig: {
    provider: 'google',
    model: 'gemini-1.5-pro',
  },
});

// Define tasks
const searchTask = new Task({
  description: `Search for detailed information about the sports query: {sportsQuery}.`,
  expectedOutput:
    'Detailed information about the sports event. Key players, key moments, final score and other usefull information.',
  agent: searchAgent,
});

const writeTask = new Task({
  description: `Using the gathered information, write a detailed article about the sport event.`,
  expectedOutput:
    'A well-structured and engaging sports article. With a title, introduction, body, and conclusion. Min 4 paragrahps long.',
  agent: contentCreator,
});

// Team to coordinate the agents
const team = new Team({
  name: 'Sports Content Creation Team',
  agents: [searchAgent, contentCreator],
  tasks: [searchTask, writeTask],
  inputs: { sportsQuery: 'Who won the Copa America in 2024?' }, // Placeholder for dynamic input
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
    MISTRAL_API_KEY: import.meta.env.VITE_MISTRAL_API_KEY,
    GOOGLE_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY,
  },
  logLevel: 'debug',
  // Results of the latest UEFA Champions League match.
});

export default team;
