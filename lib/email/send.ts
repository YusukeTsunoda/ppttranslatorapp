import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail(email: string, token: string) {
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

  // 環境変数のチェック
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    throw new Error('Email configuration error');
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error('NEXT_PUBLIC_APP_URL is not set');
    throw new Error('Email configuration error');
  }

  console.log('Sending magic link email:', {
    to: email,
    magicLinkUrl,
    timestamp: new Date().toISOString()
  });

  try {
    const result = await resend.emails.send({
      from: 'PPT Translator <noreply@ppttranslator.app>',
      to: email,
      subject: 'PPT Translator - サインインリンク',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>PPT Translatorへようこそ</h1>
          <p>以下のリンクをクリックしてサインインしてください：</p>
          <p style="margin: 20px 0;">
            <a href="${magicLinkUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              サインイン
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            このリンクは15分間有効です。<br>
            リンクの有効期限が切れた場合は、再度サインインページでメールアドレスを入力してください。
          </p>
          <p style="color: #666; font-size: 14px;">
            このメールに心当たりがない場合は、無視していただいて構いません。
          </p>
        </div>
      `,
    });

    console.log('Magic link email sent successfully:', {
      to: email,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('Failed to send magic link email:', {
      error,
      to: email,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to send magic link email');
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/confirm?token=${token}`;

  try {
    await resend.emails.send({
      from: 'PPT Translator <noreply@ppttranslator.app>',
      to: email,
      subject: 'PPT Translator - パスワードリセット',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>パスワードリセットのご案内</h1>
          <p>以下のリンクをクリックしてパスワードをリセットしてください：</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              パスワードをリセット
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            このリンクは15分間有効です。<br>
            リンクの有効期限が切れた場合は、再度パスワードリセットを要求してください。
          </p>
          <p style="color: #666; font-size: 14px;">
            このメールに心当たりがない場合は、無視していただいて構いません。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
} 