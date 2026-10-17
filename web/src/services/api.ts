import { 
  User, Scan, Conversation, Message, BrainMemory, Workspace, Expense, AgentTask, HealthStatus, LensMode, LanguageCode 
} from '../types';

const API_BASE = '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('realitylens_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('realitylens_token', token);
    } else {
      localStorage.removeItem('realitylens_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event('realitylens_logout'));
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.detail || errJson.message || errorMsg;
      } catch (e) {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth ---
  async register(data: { email: string; password: string; full_name?: string; preferred_language?: string; ai_personality?: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(data: { email: string; password: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateMe(data: Partial<User>): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Lens & Scans ---
  async uploadScan(file: Blob, prompt: string, mode: LensMode, language: LanguageCode): Promise<Scan> {
    const formData = new FormData();
    formData.append('file', file, 'capture.jpg');
    formData.append('prompt', prompt);
    formData.append('mode', mode);
    formData.append('language', language);

    return this.request<Scan>('/lens/scans', {
      method: 'POST',
      body: formData,
    });
  }

  async getScans(): Promise<Scan[]> {
    return this.request<Scan[]>('/lens/scans');
  }

  async getScan(id: string): Promise<Scan> {
    return this.request<Scan>(`/lens/scans/${id}`);
  }

  async saveScanToBrain(scanId: string): Promise<BrainMemory> {
    return this.request<BrainMemory>(`/lens/scans/${scanId}/save-brain`, {
      method: 'POST',
    });
  }

  async deleteScan(scanId: string): Promise<void> {
    await this.request<void>(`/lens/scans/${scanId}`, {
      method: 'DELETE',
    });
  }

  // --- Visual Chat ---
  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/chat/conversations/${id}`);
  }

  async sendMessage(conversationId: string, content: string, language?: LanguageCode): Promise<Message> {
    return this.request<Message>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, language }),
    });
  }

  // --- Personal Brain ---
  async getMemories(category?: string, workspaceId?: string): Promise<BrainMemory[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (workspaceId) params.append('workspace_id', workspaceId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<BrainMemory[]>(`/brain/memories${qs}`);
  }

  async saveMemory(data: { title: string; content: string; category?: string; workspace_id?: string; tags?: string[] }): Promise<BrainMemory> {
    return this.request<BrainMemory>('/brain/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMemory(id: string): Promise<void> {
    await this.request<void>(`/brain/memories/${id}`, {
      method: 'DELETE',
    });
  }

  async searchBrain(query: string, category?: string): Promise<any[]> {
    return this.request<any[]>('/brain/search', {
      method: 'POST',
      body: JSON.stringify({ query, category }),
    });
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('/brain/workspaces');
  }

  async createWorkspace(name: string, description?: string, icon?: string): Promise<Workspace> {
    return this.request<Workspace>('/brain/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description, icon }),
    });
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    return this.request<Expense[]>('/expenses');
  }

  async getExpenseSummary(): Promise<{ total_amount: number; currency: string; count: number; by_category: Record<string, number> }> {
    return this.request('/expenses/summary');
  }

  async createExpense(data: { merchant: string; amount: number; currency?: string; category?: string; date: string }): Promise<Expense> {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Agent & Tools ---
  async executeTool(toolName: string, payload: any): Promise<AgentTask> {
    return this.request<AgentTask>('/agent/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ tool_name: toolName, payload }),
    });
  }

  async confirmTool(taskId: string, approved: boolean): Promise<AgentTask> {
    return this.request<AgentTask>('/agent/tools/confirm', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, approved }),
    });
  }

  async getAgentTasks(): Promise<AgentTask[]> {
    return this.request<AgentTask[]>('/agent/tasks');
  }

  // --- Settings & Health ---
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/settings/health');
  }

  async updateAPIKeys(geminiKey?: string, openaiKey?: string): Promise<any> {
    return this.request('/settings/keys', {
      method: 'POST',
      body: JSON.stringify({ gemini_api_key: geminiKey, openai_api_key: openaiKey }),
    });
  }

  async getRealityWrapped(): Promise<any> {
    return this.request('/settings/wrapped');
  }
}

export const api = new ApiService();
