/**
 * Prompt Templates for Agents.
 *
 * This module provides templates for constructing prompts that are used to interact with language models
 * within the KaibanJS library. These templates ensure that interactions are consistent and properly
 * formatted, facilitating effective communication with LLMs.
 *
 * @module prompts
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodError, ZodSchema } from 'zod';
import { ParsedLLMOutput } from './llm.types';
import { Task } from '../index';
import { BaseAgent } from '../agents/baseAgent';
import { ToolResult } from '../tools/baseTool';

// Type for common prompt parameters
interface BasePromptParams {
  agent: BaseAgent;
  task: Task;
}

// Types for specific prompt parameters
interface SystemMessageParams extends BasePromptParams {
  insights?: string;
}

interface InitialMessageParams extends BasePromptParams {
  context?: string;
}

interface InvalidJsonFeedbackParams extends BasePromptParams {
  llmOutput: string;
}

interface InvalidOutputSchemaParams extends BasePromptParams {
  llmOutput: string;
  outputSchema: ZodSchema | null;
  outputSchemaError?: ZodError;
}

interface ThoughtWithSelfQuestionParams extends BasePromptParams {
  question: string;
  thought: string;
  parsedLLMOutput: ParsedLLMOutput;
}

interface SelfQuestionFeedbackParams extends BasePromptParams {
  question: string;
  parsedLLMOutput: ParsedLLMOutput;
}

interface ThoughtFeedbackParams extends BasePromptParams {
  thought: string;
  parsedLLMOutput: ParsedLLMOutput;
}

interface ToolResultParams extends BasePromptParams {
  toolResult: ToolResult;
  parsedLLMOutput: ParsedLLMOutput;
}

interface ToolErrorParams extends BasePromptParams {
  toolName: string;
  error: Error;
  parsedLLMOutput: ParsedLLMOutput;
}

interface ForceFinalAnswerParams extends BasePromptParams {
  iterations: number;
  maxAgentIterations: number;
}

interface WorkOnFeedbackParams extends BasePromptParams {
  feedback: string;
}

interface ObservationParams extends BasePromptParams {
  parsedLLMOutput: ParsedLLMOutput;
}

interface WeirdOutputParams extends BasePromptParams {
  parsedLLMOutput: ParsedLLMOutput;
}

// Define the DefaultPrompts type
export interface DefaultPrompts {
  SYSTEM_MESSAGE: (params: SystemMessageParams) => string;
  INITIAL_MESSAGE: (params: InitialMessageParams) => string;
  INVALID_JSON_FEEDBACK: (params: InvalidJsonFeedbackParams) => string;
  INVALID_OUTPUT_SCHEMA_FEEDBACK: (params: InvalidOutputSchemaParams) => string;
  THOUGHT_WITH_SELF_QUESTION_FEEDBACK: (
    params: ThoughtWithSelfQuestionParams
  ) => string;
  THOUGHT_FEEDBACK: (params: ThoughtFeedbackParams) => string;
  SELF_QUESTION_FEEDBACK: (params: SelfQuestionFeedbackParams) => string;
  TOOL_RESULT_FEEDBACK: (params: ToolResultParams) => string;
  TOOL_ERROR_FEEDBACK: (params: ToolErrorParams) => string;
  TOOL_NOT_EXIST_FEEDBACK: (params: ToolErrorParams) => string;
  OBSERVATION_FEEDBACK: (params: ObservationParams) => string;
  WEIRD_OUTPUT_FEEDBACK: (params: WeirdOutputParams) => string;
  FORCE_FINAL_ANSWER_FEEDBACK: (params: ForceFinalAnswerParams) => string;
  WORK_ON_FEEDBACK_FEEDBACK: (params: WorkOnFeedbackParams) => string;
}

/** Default prompt templates for the ReactChampionAgent */
export const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS: DefaultPrompts = {
  /**
   * Generates the system message that sets up the initial context and instructions for the agent.
   * This message defines the agent's role, capabilities, and the format of its responses.
   * @param {Object} params - The parameters for generating the system message.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @returns {string} The formatted system message.
   */
  SYSTEM_MESSAGE: ({ agent, task, insights }: SystemMessageParams) => {
    const prompt = `You are ${agent.name}.

Your role is: ${agent.role}.
Your background is: ${agent.background}.
Your main goal is: ${agent.goal}
You are working as part of a team.

For your work you will have available:

${
  insights
    ? `- Access to a defined set of tools. \n - Team's knowledge base and experience. You may need to consult this information to complete your current task.`
    : '- Access to a defined set of tools. '
}
- Findings and insights from previous tasks. You must use this information to complete your current task.
${
  insights
    ? `- Must follow a specific format for your output. \n ## Team Knowledge Base and Experience
Here is the essential knowledge shared by the team:
${insights}`
    : '- Must follow a specific format for your output.'
}

## Tools available for your use: 

${
  agent.tools.length > 0
    ? agent.tools
        .map(
          (tool) =>
            `${tool.name}: ${
              tool.description
            } Tool Input Schema: ${JSON.stringify(
              zodToJsonSchema(tool.schema)
            )}`
        )
        .join(', ')
    : 'No tools available. You must reply using your internal knowledge.'
}

**Important:** You ONLY have access to the tools above, and should NEVER make up tools that are not listed here.

## Format of your output

You will return just one of the following:

- Thought + (Action or Self Question)
OR
- Observation
OR
- Final Answer

Below is the explanation of each one:

### Thought + (Action or Self Question)

{
   "thought": "your thoughts about what to do next", // it could be an action or ask yourself a follow up question
   "action":  "you decide what action to take based on your previous thought", // the action could be a self follow up question or decide to use a tool from the available tools to use,
   "actionInput": the input to the action, just a simple JSON object, enclosed in curly braces, using \\" to wrap keys and values. Remember to use the Tool Schema.
}

Examples: 

{
   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information.",
   "action": "tavily_search_results_json",
   "actionInput": {"query":"Copa America 2024 winner"}
}

other

{
   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information.",
   "action": "self_question",
   "actionInput": {"query":"Copa America 2024 winner"}
}

### Observation

{
   "observation":  "Reflect about the result of the action. (E.g:  I got the following results from the tool Can I get the Final Answer from there?)", 
    "isFinalAnswerReady": false // If you have the final answer or not
}

### Final Answer

IMPORTANT: (Please respect the expected output requirements from the user): ${
      task.outputSchema
        ? `${
            task.expectedOutput
          }", adhere to this JSON schema: ${JSON.stringify({
            finalAnswer: { ...zodToJsonSchema(task.outputSchema) },
          })}.`
        : task.expectedOutput
    }

{
    "finalAnswer": "The final answer to the Task."
}

**IMPORTANT**: You must return a valid JSON object. As if you were returning a JSON object from a function.
`;
    return prompt;
  },
  /**
   * Generates the initial message that provides the task description to the agent.
   * This message kickstarts the agent's work on a specific task.
   * @param {Object} params - The parameters for generating the initial message.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.context - Additional context or background information for the task.
   * @returns {string} The formatted initial message.
   */
  INITIAL_MESSAGE: ({ agent, task, context }: InitialMessageParams) => {
    const prompt = `Hi ${agent.name}, please complete the following task: ${
      task.description
    }. 
        Your expected output should be: "${
          task.outputSchema
            ? `${
                task.expectedOutput
              }", adhere to this JSON schema: ${JSON.stringify(
                zodToJsonSchema(task.outputSchema)
              )}.`
            : task.expectedOutput
        }". 
        ${
          context
            ? `Incorporate the following findings and insights from previous tasks: "${context}"`
            : ''
        }`;
    return prompt;
  },
  /**
   * Generates feedback when the agent's response is not in valid JSON format.
   * This prompt asks the agent to correct its output format.
   * @param {Object} params - The parameters for generating the invalid JSON feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.llmOutput - The invalid output that was received.
   * @returns {string} The formatted feedback message.
   */
  INVALID_JSON_FEEDBACK: (_params: InvalidJsonFeedbackParams) => {
    // eslint-disable-next-line no-useless-escape
    const prompt = `You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else. E.g: {\"finalAnswer\": \"The final answer\"}`;
    return prompt;
  },
  /**
   * Generates feedback when the agent's response is not in valid JSON format.
   * This prompt asks the agent to correct its output format.
   * @param {Object} params - The parameters for generating the invalid JSON feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.llmOutput - The invalid output that was received.
   * @param {Object} params.outputSchema - The expected output schema for the task.
   * @param {Object} params.outputSchemaError - The error object for the output schema validation.
   * @returns {string} The formatted feedback message.
   */
  INVALID_OUTPUT_SCHEMA_FEEDBACK: ({
    outputSchema,
    outputSchemaError,
  }: InvalidOutputSchemaParams) => {
    const prompt = `You returned an invalid JSON object with following error ${outputSchemaError?.toString()}. Please format your answer adhere to this JSON schema ${
      outputSchema ? JSON.stringify(zodToJsonSchema(outputSchema)) : ''
    }`;
    return prompt;
  },
  /**
   * Generates feedback for a thought that includes a self-question.
   * This prompt encourages the agent to answer its own question.
   * @param {Object} params - The parameters for generating the thought with self-question feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.thought - The agent's thought.
   * @param {string} params.question - The self-question posed by the agent.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({
    question,
  }: ThoughtWithSelfQuestionParams) => {
    const prompt = `Awesome, please answer yourself the question: ${question}.`;
    return prompt;
  },

  /**
   * Generates feedback for a general thought from the agent.
   * This prompt encourages the agent to continue its line of thinking.
   * @param {Object} params - The parameters for generating the thought feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.thought - The agent's thought.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  THOUGHT_FEEDBACK: (_params: ThoughtFeedbackParams) => {
    const prompt = `Your thoughts are great, let's keep going.`;
    return prompt;
  },
  /**
   * Generates feedback for a self-question from the agent.
   * This prompt encourages the agent to answer its own question.
   * @param {Object} params - The parameters for generating the self-question feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.question - The self-question posed by the agent.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  SELF_QUESTION_FEEDBACK: (_params: SelfQuestionFeedbackParams) => {
    const prompt = `Awesome, please answer yourself the question.`;
    return prompt;
  },
  /**
   * Generates feedback after a tool has been used, providing the result to the agent.
   * @param {Object} params - The parameters for generating the tool result feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.toolResult - The result returned by the tool.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  TOOL_RESULT_FEEDBACK: ({ toolResult }: ToolResultParams) => {
    const prompt = `You got this result from the tool: ${JSON.stringify(
      toolResult
    )}`;
    return prompt;
  },
  /**
   * Generates feedback when an error occurs while using a tool.
   * This prompt informs the agent about the error and suggests trying again or using a different method.
   * @param {Object} params - The parameters for generating the tool error feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.toolName - The name of the tool that caused the error.
   * @param {string} params.error - The error message.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  TOOL_ERROR_FEEDBACK: ({ toolName }: ToolErrorParams) => {
    const prompt = `An error occurred while using the tool ${toolName}. Please try again or use a different method.`;
    return prompt;
  },

  /**
   * Generates feedback when the agent tries to use a non-existent tool.
   * This prompt informs the agent that the tool doesn't exist and suggests finding another way to accomplish the task.
   * @param {Object} params - The parameters for generating the non-existent tool feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.toolName - The name of the non-existent tool.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  TOOL_NOT_EXIST_FEEDBACK: ({ toolName }: ToolErrorParams) => {
    const prompt = `Hey, the tool ${toolName} does not exist. Please find another way.`;
    return prompt;
  },
  /**
   * Generates feedback for an observation made by the agent.
   * This prompt encourages the agent to continue towards finding a final answer.
   * @param {Object} params - The parameters for generating the observation feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.parsedLLMOutput - The parsed LLM output.
   * @returns {string} The formatted feedback message.
   */
  OBSERVATION_FEEDBACK: (_params: ObservationParams) => {
    const prompt = `Great observation. Please keep going. Let's get to the final answer.`;
    return prompt;
  },

  /**
   * Generates feedback when the agent's output doesn't match the expected format.
   * This Agent uses a JSON format to return its output and sometimes it returns a non-JSON output.
   * This prompt asks the agent to correct its output.
   * @param {Object} params - The parameters for generating the unexpected output feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.output - The unexpected output from the agent.
   * @returns {string} The formatted feedback message.
   */

  WEIRD_OUTPUT_FEEDBACK: (_params: WeirdOutputParams) => {
    const prompt = `Your latest response does not match the way you are expected to output information. Please correct it.`;
    return prompt;
  },

  /**
   * Forces the agent to return the final answer.
   * Sometimes the agent's have enough information to answer the question but it keeps asking itself questions and not answering.
   * This prompt forces the agent to return the final answer with the information it has gathered until now.
   * @param {Object} params - The parameters for generating the unexpected output feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {number} params.iterations - The number of iterations the agent has gone through.
   * @param {number} params.maxAgentIterations - The maximum number of iterations the agent is allowed to go through.
   * @returns {string} The formatted feedback message.
   */
  FORCE_FINAL_ANSWER_FEEDBACK: (_params: ForceFinalAnswerParams) => {
    const prompt = `We don't have more time to keep looking for the answer. Please use all the information you have gathered until now and give the finalAnswer right away.`;
    return prompt;
  },

  /**
   * Provides feedback to the agent based on the feedback received.
   * This prompt allows the agent to address any issues or concerns raised in the feedback.
   * FEEDBACK_FEEDBACK -> It's like inception, but with less Leonardo DiCaprio :D
   * @param {Object} params - The parameters for generating the feedback.
   * @param {Object} params.agent - The agent object containing its properties.
   * @param {Object} params.task - The task object describing the current task.
   * @param {string} params.feedback - The feedback received from the previous agent.
   * @returns {string} The formatted feedback message.
   */

  WORK_ON_FEEDBACK_FEEDBACK: ({ feedback }: WorkOnFeedbackParams) => {
    const prompt = `Here is some feedback for you to address: ${feedback}`;
    return prompt;
  },
} as const;
