import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: '音声ファイルが必要です' },
        { status: 400 }
      );
    }

    console.log('[Transcribe API] Received audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
    });

    // 音声が空の場合はスキップ
    if (audioFile.size === 0) {
      return NextResponse.json({
        success: true,
        transcript: '',
      });
    }

    // OpenAI Whisper APIで文字起こし
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja', // 日本語
      response_format: 'json',
    });

    console.log('[Transcribe API] Transcription result:', transcription.text);

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラーが発生しました';
    console.error('[Transcribe API] Error:', errorMessage, error);

    // 開発環境では詳細なエラーメッセージを返す
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { success: false, error: `エラー: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '文字起こしに失敗しました' },
      { status: 500 }
    );
  }
}
