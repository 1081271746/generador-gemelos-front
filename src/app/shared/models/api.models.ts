export interface User { id: number; username: string; email: string; is_active: boolean }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { username: string }
export interface Token { access_token: string; token_type: string }
export interface ScenarioInput {
  title: string; description: string; context: string; objective: string;
  counterpart_role: string; counterpart_goal: string; counterpart_limits: string;
}
export interface Scenario extends ScenarioInput { id: number; user_id: number; is_active: boolean; created_at: string }
export type NegotiationStatus = 'active' | 'completed' | 'cancelled';
export interface Negotiation {
  id: number; user_id: number; scenario_id: number; status: NegotiationStatus;
  result: string | null; scenario_snapshot: ScenarioInput; started_at: string; ended_at: string | null;
}
export type MessageKind = 'offer' | 'counteroffer' | 'argument' | 'concession';
export interface MessageInput { negotiation_id: number; content: string; kind: MessageKind; request_id: string }
export interface Message {
  id: number; negotiation_id: number; sender_type: 'user' | 'twin';
  content: string; kind: MessageKind; request_id: string | null; created_at: string;
}
export const DIMENSIONS = [
  {key: 'assertiveness', label: 'Asertividad'},
  {key: 'cooperation', label: 'Cooperación'},
  {key: 'flexibility', label: 'Flexibilidad'},
  {key: 'argumentation', label: 'Argumentación'},
  {key: 'conflict_management', label: 'Manejo del conflicto'},
] as const;
export type DimensionKey = typeof DIMENSIONS[number]['key'];
export interface Evidence { message_id: number; quote: string }
export interface Dimension { score: number; explanation: string; evidence: Evidence[] }
export interface Exercise { title: string; instructions: string; scenario?: string }
export interface AnalysisResult {
  summary: string; strategies: string[]; strengths: string[]; improvement_areas: string[];
  dimensions: Record<DimensionKey, Dimension>; outcome: string; objective_evaluation: string;
  recommendations: string[]; exercises: Exercise[]; alerts: string[]; interpretation: 'contextual_indicators';
}
export interface Analysis { id: number; negotiation_id: number; user_id: number; payload: AnalysisResult; created_at: string }
export interface ProfileEvolution {
  analysis_id: number; negotiation_id: number; created_at: string; dimensions: Record<DimensionKey, number>;
}
export interface Profile {
  sample_count: number; updated_at?: string;
  payload: {
    interpretation: 'contextual_indicators'; dimension_averages?: Partial<Record<DimensionKey, number>>;
    strategies?: string[]; strengths?: string[]; improvement_areas?: string[];
    recommendations?: string[]; exercises?: Exercise[]; evolution: ProfileEvolution[];
  };
}
export interface Recommendations { recommendations: string[]; exercises: Exercise[] }
export interface NegotiationEvent {
  event_id: string; sequence: number; negotiation_id: number; event_type: string;
  payload: Record<string, unknown>; created_at: string;
}
export interface DashboardData {
  negotiations: Negotiation[]; scenarios: Scenario[]; analyses: Analysis[];
  total: number; active: number; completed: number; cancelled: number; scenarioCount: number;
}
