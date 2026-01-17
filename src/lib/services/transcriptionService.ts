/**
 * TranscriptionService
 * Web Speech APIを使用した音声文字起こしサービス
 */

export interface TranscriptionConfig {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type TranscriptionCallback = (result: TranscriptionResult) => void;
export type ErrorCallback = (error: string) => void;

export class TranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private isRunning = false;
  private onTranscriptCallback: TranscriptionCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  constructor(private config: TranscriptionConfig = {}) {
    if (typeof window === 'undefined') {
      console.warn('TranscriptionService: Window is undefined. Cannot initialize.');
      return;
    }

    // Web Speech API のブラウザ互換性チェック
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Web Speech API is not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // デフォルト設定
    this.recognition.lang = this.config.lang || 'ja-JP';
    this.recognition.continuous = this.config.continuous ?? true;
    this.recognition.interimResults = this.config.interimResults ?? true;
    this.recognition.maxAlternatives = this.config.maxAlternatives || 1;

    // イベントハンドラー
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      const confidence = result[0].confidence;

      if (this.onTranscriptCallback) {
        this.onTranscriptCallback({
          transcript,
          isFinal,
          confidence,
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);

      let errorMessage = '音声認識エラーが発生しました';
      switch (event.error) {
        case 'no-speech':
          errorMessage = '音声が検出されませんでした';
          break;
        case 'audio-capture':
          errorMessage = 'マイクにアクセスできません';
          break;
        case 'not-allowed':
          errorMessage = 'マイクの使用が許可されていません';
          break;
        case 'network':
          errorMessage = 'ネットワークエラーが発生しました';
          break;
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      // continuous=trueの場合、自動的に再起動
      if (this.isRunning && this.config.continuous) {
        try {
          this.recognition?.start();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
        }
      }
    };
  }

  /**
   * 音声認識を開始
   */
  start(
    onTranscript: TranscriptionCallback,
    onError?: ErrorCallback
  ): void {
    if (!this.recognition) {
      const error = 'Speech recognition is not available';
      console.error(error);
      onError?.(error);
      return;
    }

    if (this.isRunning) {
      console.warn('Speech recognition is already running');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;

    try {
      this.recognition.start();
      this.isRunning = true;
      console.log('Speech recognition started');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      onError?.('音声認識の開始に失敗しました');
    }
  }

  /**
   * 音声認識を停止
   */
  stop(): void {
    if (!this.recognition) return;

    if (!this.isRunning) {
      console.warn('Speech recognition is not running');
      return;
    }

    try {
      this.recognition.stop();
      this.isRunning = false;
      console.log('Speech recognition stopped');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  /**
   * 認識が実行中かどうか
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * サービスのクリーンアップ
   */
  destroy(): void {
    this.stop();
    this.recognition = null;
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
  }
}

/**
 * Web Speech API の型定義
 */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}
