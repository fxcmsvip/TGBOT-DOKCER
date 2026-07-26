import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Bot, Edit, Trash2, TestTube, MessageSquare, Settings, Zap } from 'lucide-react';
import { listAgents, createAgent, updateAgent, deleteAgent, testAgent } from '../services/agentApi';
import type { Agent, AgentCreate } from '../services/agentApi';
import { getAIConfigs } from '../services/aiConfigApi';
import { getBots } from '../services/botApi';
import type { AIConfig, Bot as BotType } from '../types';

export default function Agents() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, aiConfigsData, botsData] = await Promise.all([
        listAgents(),
        getAIConfigs(),
        getBots(),
      ]);
      setAgents(agentsData.agents);
      setAiConfigs(aiConfigsData.items || aiConfigsData);
      setBots(botsData.bots || botsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setShowModal(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('agents.confirmDelete'))) return;
    try {
      await deleteAgent(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleTest = (agent: Agent) => {
    setTestingAgent(agent);
    setTestMessage('');
    setTestResponse('');
    setShowTestModal(true);
  };

  const runTest = async () => {
    if (!testingAgent || !testMessage) return;
    setTestLoading(true);
    try {
      const result = await testAgent(testingAgent.id, testMessage);
      setTestResponse(result.response);
    } catch (error: any) {
      setTestResponse(`Error: ${error.message}`);
    }
    setTestLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bot className="w-7 h-7 text-cyan-400" />
            {t('agents.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('agents.description')}</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('agents.create')}
        </button>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">{t('agents.empty')}</p>
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
          >
            {t('agents.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-lg p-4 hover:border-cyan-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    agent.is_active ? 'bg-cyan-500/20' : 'bg-gray-500/20'
                  }`}>
                    <Bot className={`w-5 h-5 ${agent.is_active ? 'text-cyan-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{agent.name}</h3>
                    {agent.is_default && (
                      <span className="text-xs text-amber-400">{t('agents.default')}</span>
                    )}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>

              {agent.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>
              )}

              <div className="space-y-2 text-xs text-gray-500 mb-4">
                {agent.ai_config_name && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    <span>{agent.ai_config_name}</span>
                  </div>
                )}
                {agent.bot_name && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    <span>@{agent.bot_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  <span>{agent.tools?.enabled_tools?.length || 0} {t('agents.tools')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#2f2f2f]">
                <button
                  onClick={() => handleTest(agent)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                >
                  <TestTube className="w-3 h-3" />
                  {t('agents.test')}
                </button>
                <button
                  onClick={() => handleEdit(agent)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AgentModal
          agent={editingAgent}
          aiConfigs={aiConfigs}
          bots={bots}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingAgent) {
                await updateAgent(editingAgent.id, data);
              } else {
                await createAgent(data);
              }
              setShowModal(false);
              loadData();
            } catch (error) {
              console.error('Failed to save agent:', error);
            }
          }}
        />
      )}

      {/* Test Modal */}
      {showTestModal && testingAgent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-lg w-full max-w-lg">
            <div className="p-4 border-b border-[#2f2f2f]">
              <h3 className="text-lg font-medium text-white">
                {t('agents.testAgent')}: {testingAgent.name}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.yourMessage')}</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  rows={3}
                  placeholder={t('agents.testPlaceholder')}
                />
              </div>
              <button
                onClick={runTest}
                disabled={!testMessage || testLoading}
                className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {testLoading ? t('common.loading') : t('agents.sendTest')}
              </button>
              {testResponse && (
                <div className="p-3 bg-[#141414] border border-[#2f2f2f] rounded-lg">
                  <label className="block text-xs text-gray-500 mb-1">{t('agents.response')}</label>
                  <p className="text-sm text-white whitespace-pre-wrap">{testResponse}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#2f2f2f] flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Agent Modal Component
function AgentModal({
  agent,
  aiConfigs,
  bots,
  onClose,
  onSave,
}: {
  agent: Agent | null;
  aiConfigs: AiConfig[];
  bots: BotType[];
  onClose: () => void;
  onSave: (data: AgentCreate) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<AgentCreate>({
    name: agent?.name || '',
    description: agent?.description || '',
    ai_config_id: agent?.ai_config_id,
    system_prompt: agent?.system_prompt || '',
    bot_id: agent?.bot_id,
    is_active: agent?.is_active ?? true,
    is_default: agent?.is_default ?? false,
    permissions: agent?.permissions || {
      can_access_faq: true,
      can_access_rag: true,
      can_create_tickets: false,
      can_transfer_to_human: true,
      allowed_groups: [],
      restricted_commands: [],
    },
    tools: agent?.tools || {
      enabled_tools: [],
      tool_configs: {},
    },
    response_settings: agent?.response_settings || {
      temperature: 0.7,
      max_tokens: 2000,
      response_language: 'auto',
      personality_traits: [],
      greeting_message: '',
      fallback_message: '',
    },
    knowledge_base: agent?.knowledge_base || {
      faq_categories: [],
      rag_collections: [],
      external_sources: [],
    },
    schedule: agent?.schedule || {
      enabled: false,
      timezone: 'UTC',
      active_days: [],
    },
  });

  const tabs = [
    { id: 'basic', label: t('agents.tabs.basic') },
    { id: 'prompt', label: t('agents.tabs.prompt') },
    { id: 'permissions', label: t('agents.tabs.permissions') },
    { id: 'tools', label: t('agents.tabs.tools') },
    { id: 'knowledge', label: t('agents.tabs.knowledge') },
    { id: 'schedule', label: t('agents.tabs.schedule') },
  ];

  const handleSubmit = async () => {
    if (!formData.name) {
      alert(t('agents.nameRequired'));
      return;
    }
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#2f2f2f]">
          <h3 className="text-lg font-medium text-white">
            {agent ? t('agents.editAgent') : t('agents.createAgent')}
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2f2f2f] px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder={t('agents.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.aiConfig')}</label>
                <select
                  value={formData.ai_config_id || ''}
                  onChange={(e) => setFormData({ ...formData, ai_config_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">{t('agents.selectAiConfig')}</option>
                  {aiConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.provider})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.bindBot')}</label>
                <select
                  value={formData.bot_id || ''}
                  onChange={(e) => setFormData({ ...formData, bot_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">{t('agents.noBinding')}</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      @{bot.bot_username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-400">{t('agents.active')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-400">{t('agents.setDefault')}</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.systemPrompt')}</label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none font-mono text-sm"
                  rows={10}
                  placeholder={t('agents.systemPromptPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.greetingMessage')}</label>
                <textarea
                  value={formData.response_settings?.greeting_message || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    response_settings: { ...formData.response_settings!, greeting_message: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.fallbackMessage')}</label>
                <textarea
                  value={formData.response_settings?.fallback_message || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    response_settings: { ...formData.response_settings!, fallback_message: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions?.can_access_faq ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions!, can_access_faq: e.target.checked }
                  })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-400">{t('agents.canAccessFaq')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions?.can_access_rag ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions!, can_access_rag: e.target.checked }
                  })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-400">{t('agents.canAccessRag')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions?.can_create_tickets ?? false}
                  onChange={(e) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions!, can_create_tickets: e.target.checked }
                  })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-400">{t('agents.canCreateTickets')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions?.can_transfer_to_human ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions!, can_transfer_to_human: e.target.checked }
                  })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-400">{t('agents.canTransferToHuman')}</span>
              </label>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">{t('agents.toolsDescription')}</p>
              <div className="grid grid-cols-2 gap-2">
                {['faq_search', 'rag_query', 'web_search', 'calculator', 'datetime'].map((tool) => (
                  <label key={tool} className="flex items-center gap-2 p-2 bg-[#141414] rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.tools?.enabled_tools?.includes(tool) ?? false}
                      onChange={(e) => {
                        const tools = formData.tools?.enabled_tools || [];
                        const newTools = e.target.checked
                          ? [...tools, tool]
                          : tools.filter((t) => t !== tool);
                        setFormData({
                          ...formData,
                          tools: { ...formData.tools!, enabled_tools: newTools }
                        });
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-300">{tool}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">{t('agents.knowledgeDescription')}</p>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('agents.ragCollections')}</label>
                <input
                  type="text"
                  value={formData.knowledge_base?.rag_collections?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    knowledge_base: {
                      ...formData.knowledge_base!,
                      rag_collections: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    }
                  })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="collection1, collection2"
                />
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.schedule?.enabled ?? false}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule!, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-400">{t('agents.enableSchedule')}</span>
              </label>
              {formData.schedule?.enabled && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t('agents.cronExpression')}</label>
                    <input
                      type="text"
                      value={formData.schedule?.cron_expression || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule!, cron_expression: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none font-mono"
                      placeholder="0 9 * * 1-5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t('agents.timezone')}</label>
                    <input
                      type="text"
                      value={formData.schedule?.timezone || 'UTC'}
                      onChange={(e) => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule!, timezone: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2f2f2f] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2f2f2f] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
