/**
 * Web Speech API Controller for GrowthEngine MSME OS
 * Supports Speech-to-Text (STT) and Text-to-Speech (TTS)
 * First-class languages: Tamil (ta-IN) and English (en-IN / en-US)
 */

export type SpeechLanguage = 'ta-IN' | 'en-IN';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (e: Event) => void;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: (e: SpeechRecognitionErrorEvent) => void;
  onend: (e: Event) => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export class VoiceController {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private currentLang: SpeechLanguage = 'en-IN';

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public startListening(
    lang: SpeechLanguage,
    callbacks: {
      onStart?: () => void;
      onInterim?: (text: string) => void;
      onResult: (finalText: string) => void;
      onError?: (error: string) => void;
      onEnd?: () => void;
    }
  ) {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      this.currentLang = lang;
      this.recognition.lang = lang;

      this.recognition.onstart = () => {
        this.isListening = true;
        callbacks.onStart?.();
      };

      this.recognition.onresult = (e: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalText = '';

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText && callbacks.onInterim) {
          callbacks.onInterim(interimText);
        }

        if (finalText) {
          callbacks.onResult(finalText.trim());
        }
      };

      this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        callbacks.onError?.(e.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onEnd?.();
      };

      this.recognition.start();
    } catch (err: any) {
      callbacks.onError?.(err.message || 'Failed to start microphone');
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  public speak(text: string, lang: SpeechLanguage = 'en-IN') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/[*_#~]/g, '')
        .replace(/₹/g, 'Rupees ')
        .replace(/INV-\d+-\w+/g, 'Invoice')
        .replace(/•/g, ',');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0])
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceController = new VoiceController();
