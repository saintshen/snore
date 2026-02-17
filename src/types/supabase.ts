export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    subscription_tier: 'free' | 'premium'
                    settings: Json
                    updated_at: string
                }
                Insert: {
                    id: string
                    subscription_tier?: 'free' | 'premium'
                    settings?: Json
                    updated_at?: string
                }
                Update: {
                    id?: string
                    subscription_tier?: 'free' | 'premium'
                    settings?: Json
                    updated_at?: string
                }
            }
            sleep_sessions: {
                Row: {
                    id: string
                    user_id: string
                    start_time: string
                    end_time: string | null
                    noise_log: Json
                    snore_count: number
                    quality_score: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    start_time?: string
                    end_time?: string | null
                    noise_log?: Json
                    snore_count?: number
                    quality_score?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    start_time?: string
                    end_time?: string | null
                    noise_log?: Json
                    snore_count?: number
                    quality_score?: number | null
                    created_at?: string
                }
            }
            snore_events: {
                Row: {
                    id: string
                    session_id: string
                    user_id: string
                    timestamp: string
                    audio_path: string
                    duration_seconds: number | null
                    peak_db: number | null
                    confidence_score: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    user_id: string
                    timestamp?: string
                    audio_path: string
                    duration_seconds?: number | null
                    peak_db?: number | null
                    confidence_score?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    user_id?: string
                    timestamp?: string
                    audio_path?: string
                    duration_seconds?: number | null
                    peak_db?: number | null
                    confidence_score?: number | null
                    created_at?: string
                }
            }
        }
    }
}
