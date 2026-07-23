import api from './api';

export interface BotSource {
  bot_id: number;
  source_code: string;
  is_custom: boolean;
  generated_at?: string;
  last_modified?: string;
}

export interface ValidateResult {
  valid: boolean;
  error?: string;
  line?: number;
  offset?: number;
}

export interface RestartResult {
  bot_id: number;
  local_started: boolean;
  remote_started: boolean;
  mode: string;
  errors?: string[];
}

export const botSourceApi = {
  get: (botId: number) => api.get<BotSource>(`/bots/${botId}/source`),
  
  update: (botId: number, sourceCode: string) => 
    api.put<BotSource>(`/bots/${botId}/source`, { source_code: sourceCode }),
  
  regenerate: (botId: number) => 
    api.post<BotSource>(`/bots/${botId}/source/regenerate`),
  
  restart: (botId: number, mode: 'auto' | 'local' | 'remote' = 'auto') => 
    api.post<RestartResult>(`/bots/${botId}/source/restart`, null, { params: { mode } }),
  
  validate: (botId: number, sourceCode: string) => 
    api.post<ValidateResult>(`/bots/${botId}/source/validate`, { source_code: sourceCode }),
};
