'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TranscriptionService,
  TranscriptionResult,
} from '@/lib/services/transcriptionService';

export interface UseAudioTranscriptionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinalTranscript?: (transcript: string) => void;
  autoStart?: boolean;
}

export interface UseAudioTranscriptionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Web Speech APIを使用した音声文字起こしReactフック
 *
 * @param options - 文字起こしオプション
 * @returns 文字起こし状態と制御関数
 */
export function useAudioTranscription(
  options: UseAudioTranscriptionOptions = {}
): UseAudioTranscriptionReturn {
  const {
    lang = 'ja-JP',
    continuous = true,
    interimResults = true,
    onFinalTranscript,
    autoStart = false,
  } = options;

  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  const serviceRef = useRef<TranscriptionService | null>(null);

  // Web Speech APIのサポート状況を確認
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        serviceRef.current = new TranscriptionService({
          lang,
          continuous,
          interimResults,
        });
      }
    }

    return () => {
      serviceRef.current?.destroy();
    };
  }, [lang, continuous, interimResults]);

  // 文字起こし結果のハンドラー
  const handleTranscript = useCallback(
    (result: TranscriptionResult) => {
      if (result.isFinal) {
        // 確定した文字起こし結果
        setTranscript((prev) => {
          const newTranscript = prev + result.transcript;
          onFinalTranscript?.(result.transcript);
          return newTranscript;
        });
        setInterimTranscript('');
      } else {
        // 暫定的な文字起こし結果
        setInterimTranscript(result.transcript);
      }
      setError(null);
    },
    [onFinalTranscript]
  );

  // エラーハンドラー
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsListening(false);
  }, []);

  // 音声認識を開始
  const start = useCallback(() => {
    if (!serviceRef.current || !isSupported) {
      setError('音声認識はこのブラウザでサポートされていません');
      return;
    }

    setError(null);
    setIsListening(true);
    serviceRef.current.start(handleTranscript, handleError);
  }, [isSupported, handleTranscript, handleError]);

  // 音声認識を停止
  const stop = useCallback(() => {
    if (!serviceRef.current) return;

    serviceRef.current.stop();
    setIsListening(false);
  }, []);

  // 文字起こし結果をリセット
  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // 自動開始オプション
  useEffect(() => {
    if (autoStart && isSupported) {
      start();
    }

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isSupported]);

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    isSupported,
    start,
    stop,
    reset,
  };
}
