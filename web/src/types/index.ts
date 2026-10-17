export type LanguageCode = 'en' | 'kn' | 'hi';

export type AIPersonality = 'gen_z' | 'student' | 'professional' | 'teacher' | 'simple' | 'desi';

export type LensMode = 'general' | 'lockin' | 'campus' | 'receipt' | 'code' | 'translate' | 'science';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  preferred_language: LanguageCode;
  ai_personality: AIPersonality;
}

export interface VisionResult {
  id: string;
  scan_id: string;
  observed_facts: any[];
  inferred_facts: any[];
  ocr_text?: string;
  structured_entities: {
    dates?: string[];
    amounts?: number[];
    deadlines?: string[];
    entities?: string[];
    [key: string]: any;
  };
  confidence_scores: Record<string, number>;
  response_markdown: string;
  suggested_actions: Array<{
    label: string;
    action: string;
    payload: any;
  }>;
  warnings: string[];
  provider_used: string;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url?: string;
  blur_score: number;
  is_blurry: boolean;
  width: number;
  height: number;
  mode: LensMode;
  language: LanguageCode;
  is_saved_to_brain: boolean;
  created_at: string;
  vision_result?: VisionResult;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  epistemic_class: string;
  sources: any[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  scan_id?: string;
  title: string;
  mode: LensMode;
  created_at: string;
  messages: Message[];
}

export interface BrainMemory {
  id: string;
  workspace_id?: string;
  category: string;
  title: string;
  content: string;
  source_type: string;
  source_id?: string;
  tags: string[];
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Expense {
  id: string;
  scan_id?: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  line_items: any[];
  created_at: string;
}

export interface AgentTask {
  id: string;
  tool_name: string;
  payload: any;
  status: 'PENDING_CONFIRMATION' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'FAILED';
  result?: any;
  created_at: string;
  executed_at?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  database: string;
  ai_provider: string;
  gemini_configured: boolean;
  openai_configured: boolean;
}
