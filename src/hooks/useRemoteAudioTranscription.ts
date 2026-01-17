'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseRemoteAudioTranscriptionOptions {
  remoteStream: MediaStream | null;
  enabled?: boolean;
  recordingIntervalMs?: number; // 録音間隔(ミリ秒)
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface UseRemoteAudioTranscriptionReturn {
  transcript: string;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
}

/**
 * remoteStreamから音声を録音してWhisper APIで文字起こしするReactフック
 */
export function useRemoteAudioTranscription(
  options: UseRemoteAudioTranscriptionOptions
): UseRemoteAudioTranscriptionReturn {
  const {
    remoteStream,
    enabled = false,
    recordingIntervalMs = 3000, // デフォルト3秒ごと
    onTranscript,
    onError,
  } = options;

  const [transcript, setTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 音声データをWhisper APIに送信
  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      if (audioBlob.size === 0) {
        console.log('[RemoteAudioTranscription] Empty audio blob, skipping');
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.transcript) {
          console.log('[RemoteAudioTranscription] Transcript:', data.transcript);
          setTranscript((prev) => prev + data.transcript + ' ');
          onTranscript?.(data.transcript);
        } else if (data.error) {
          const errorMsg = data.error;
          console.error('[RemoteAudioTranscription] Error:', errorMsg);
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = '文字起こしに失敗しました';
        console.error('[RemoteAudioTranscription]', err);
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [onTranscript, onError]
  );

  // MediaRecorderでremoteStreamを録音
  const startRecording = useCallback(() => {
    if (!remoteStream) {
      const errorMsg = 'リモートストリームがありません';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      const audioTracks = remoteStream.getAudioTracks();
      if (audioTracks.length === 0) {
        const errorMsg = '音声トラックがありません';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // 音声トラックのみのMediaStreamを作成
      const audioStream = new MediaStream(audioTracks);

      // MediaRecorderを作成
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        audioChunksRef.current = [];

        // Whisper APIに送信
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError(null);

      console.log(
        `[RemoteAudioTranscription] Recording started, interval: ${recordingIntervalMs}ms`
      );

      // 定期的に録音を停止→開始して文字起こし
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();

          // すぐに再開
          setTimeout(() => {
            if (mediaRecorderRef.current && remoteStream) {
              audioChunksRef.current = [];
              mediaRecorderRef.current.start();
            }
          }, 100);
        }
      }, recordingIntervalMs);
    } catch (err) {
      const errorMsg = '録音の開始に失敗しました';
      console.error('[RemoteAudioTranscription]', err);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [remoteStream, recordingIntervalMs, transcribeAudio, onError]);

  // 録音停止
  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    setIsRecording(false);
    console.log('[RemoteAudioTranscription] Recording stopped');
  }, []);

  // 文字起こし結果をリセット
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  // enabled変更時の自動開始/停止
  useEffect(() => {
    if (enabled && remoteStream) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      stopRecording();
    };
  }, [enabled, remoteStream, startRecording, stopRecording]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    transcript,
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
