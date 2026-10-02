import { maeveAPI } from './api';

// Enum for Mascot Actions
export enum MascotAction {
  IDLE = 'IDLE',
  TYPING = 'TYPING',
  KISS = 'KISS',
  BLOW_KISS = 'BLOW_KISS',
  HUG = 'HUG',
  GREETING = 'WAVE',
  SUCCESS = 'VICTORY',
  THINKING = 'THINKING',
  WAVE = 'WAVE',
  VICTORY = 'VICTORY',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
  THANKFUL = 'THANKFUL',
  CLAP = 'CLAP',
  SHY = 'SHY',
  SPEAKING = 'SPEAKING',
  BREATHING = 'BREATHING',
  DEFEAT = 'DEFEAT',
  WALKING = 'WALKING',
  
  // Aliases
  WAVE_HELLO = 'WAVE',
  POINT_TO_BUTTON = 'WAVE',
  SERIOUS_WARNING = 'ANGRY',
  CELEBRATE = 'VICTORY',
  BREATHING_ANIMATION = 'BREATHING',
  ERROR_STATE = 'DEFEAT'
}

export enum Emotion {
  FRIENDLY = 'FRIENDLY',
  HAPPY = 'HAPPY',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
  CONFUSED = 'CONFUSED',
  THINKING = 'THINKING',
  SURPRISED = 'SURPRISED',
  EXCITED = 'EXCITED',
  CALM = 'CALM',
  SERIOUS = 'SERIOUS',
  SUPPORTIVE = 'SUPPORTIVE',
  CELEBRATORY = 'CELEBRATORY',
  HELPFUL = 'HELPFUL',
  NEUTRAL = 'NEUTRAL'
}

export class ApiClient {
  async sendMessage(message: string, userId: string = 'user_001') {
    try {
      // Use the real API
      const response = await maeveAPI.sendMessage(userId, message);
      
      // If API returns successfully
      if (response && response.reply) {
        return {
          replyText: response.reply || "Message received.",
          mascotAction: response.action || MascotAction.IDLE,
          emotion: response.expression || 'NEUTRAL'
        };
      }
      
      // Fallback/Mock response
      return {
        replyText: "I received your message, but server is processing it.",
        mascotAction: MascotAction.THINKING,
        emotion: 'NEUTRAL'
      };
    } catch (error) {
      console.error("API Error:", error);
      return {
        replyText: "I'm having trouble connecting to the server.",
        mascotAction: MascotAction.SAD,
        emotion: 'SAD'
      };
    }
  }
  
  // Wrapper for file upload
  async uploadFile(userId: string, file: File) {
    return await maeveAPI.uploadFile(userId, file);
  }
}

export const apiClient = new ApiClient();
