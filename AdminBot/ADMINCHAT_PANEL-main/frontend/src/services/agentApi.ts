/**
 * Agent API service
 */
import { api } from './api';

export interface AgentPermissions {
  can_access_faq: boolean;
  can_access_rag: boolean;
  can_create_tickets: boolean;
  can_transfer_to_human: boolean;
  allowed_groups: string[];
  restricted_commands: string[];
}

export interface AgentTools {
  enabled_tools: string[];
  tool_configs: Record<string, any>;
}

export interface AgentResponseSettings {
  temperature: number;
  max_tokens: number;
  response_language: string;
  personality_traits: string[];
  greeting_message: string;
  fallback_message: string;
}

export interface AgentKnowledgeBase {
  faq_categories: number[];
  rag_collections: string[];
  external_sources: string[];
}

export interface AgentSchedule {
  enabled: boolean;
  cron_expression?: string;
  timezone: string;
  active_hours?: { start: string; end: string };
  active_days: number[];
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  ai_config_id?: number;
  ai_config_name?: string;
  system_prompt: string;
  bot_id?: number;
  bot_name?: string;
  permissions: AgentPermissions;
  tools: AgentTools;
  response_settings: AgentResponseSettings;
  knowledge_base: AgentKnowledgeBase;
  is_active: boolean;
  is_default: boolean;
  schedule: AgentSchedule;
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  ai_config_id?: number;
  system_prompt?: string;
  bot_id?: number;
  permissions?: Partial<AgentPermissions>;
  tools?: Partial<AgentTools>;
  response_settings?: Partial<AgentResponseSettings>;
  knowledge_base?: Partial<AgentKnowledgeBase>;
  is_active?: boolean;
  is_default?: boolean;
  schedule?: Partial<AgentSchedule>;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  ai_config_id?: number;
  system_prompt?: string;
  bot_id?: number;
  permissions?: Partial<AgentPermissions>;
  tools?: Partial<AgentTools>;
  response_settings?: Partial<AgentResponseSettings>;
  knowledge_base?: Partial<AgentKnowledgeBase>;
  is_active?: boolean;
  is_default?: boolean;
  schedule?: Partial<AgentSchedule>;
}

export interface AgentTestResponse {
  response: string;
  tokens_used?: number;
  tool_calls?: any[];
  latency_ms: number;
}

// List agents
export async function listAgents(botId?: number): Promise<{ agents: Agent[]; total: number }> {
  const params = botId ? `?bot_id=${botId}` : '';
  const response = await api.get(`/agents${params}`);
  return response.data.data;
}

// Get agent
export async function getAgent(id: number): Promise<Agent> {
  const response = await api.get(`/agents/${id}`);
  return response.data.data;
}

// Create agent
export async function createAgent(data: AgentCreate): Promise<Agent> {
  const response = await api.post('/agents', data);
  return response.data.data;
}

// Update agent
export async function updateAgent(id: number, data: AgentUpdate): Promise<Agent> {
  const response = await api.patch(`/agents/${id}`, data);
  return response.data.data;
}

// Delete agent
export async function deleteAgent(id: number): Promise<void> {
  await api.delete(`/agents/${id}`);
}

// Test agent
export async function testAgent(id: number, message: string): Promise<AgentTestResponse> {
  const response = await api.post(`/agents/${id}/test`, { message });
  return response.data.data;
}

// Get agent conversations
export async function getAgentConversations(
  id: number,
  limit = 50,
  offset = 0
): Promise<{ conversations: any[]; total: number }> {
  const response = await api.get(`/agents/${id}/conversations?limit=${limit}&offset=${offset}`);
  return response.data.data;
}
