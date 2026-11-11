import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('mail.host') || process.env.MAIL_HOST || 'smtp.gmail.com';
    const port = Number(this.configService.get<number>('mail.port') || process.env.MAIL_PORT || 587);
    const user = this.configService.get<string>('mail.user') || process.env.MAIL_USER || '';
    const pass = this.configService.get<string>('mail.pass') || process.env.MAIL_PASS || '';

    if (!user || !pass) {
      this.logger.warn('Email credentials (MAIL_USER / MAIL_PASS) are not fully configured. Email sending may fail.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendRegisterOtp(to: string, otp: string): Promise<void> {
    const subject = `[OpenAid] Mã xác thực đăng ký tài khoản: ${otp}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #141822; color: #ffffff; border-radius: 16px; border: 1px solid #2a324b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #22c55e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">OpenAid</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Nền tảng cứu trợ & thiện nguyện minh bạch</p>
        </div>
        <div style="background-color: #1a2030; border: 1px solid #2d3748; border-radius: 12px; padding: 24px; text-align: center;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Xác thực tài khoản OpenAid</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Chào mừng bạn đến với OpenAid! Vui lòng nhập mã xác thực OTP dưới đây để hoàn tất quá trình tạo tài khoản:
          </p>
          <div style="display: inline-block; background: linear-gradient(135deg, #1F4D36 0%, #286446 100%); border: 2px solid #F28C1B; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ffffff; margin: 8px 0 16px;">
            ${otp}
          </div>
          <p style="color: #f59e0b; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
            ⏳ Mã có hiệu lực trong vòng 5 phút
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 0;">
            Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email này.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 11px;">
          © ${new Date().getFullYear()} OpenAid System. Mọi thông tin được bảo mật và giám sát minh bạch.
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendForgotPasswordOtp(to: string, otp: string): Promise<void> {
    const subject = `[OpenAid] Mã đặt lại mật khẩu: ${otp}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #141822; color: #ffffff; border-radius: 16px; border: 1px solid #2a324b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #22c55e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">OpenAid</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Nền tảng cứu trợ & thiện nguyện minh bạch</p>
        </div>
        <div style="background-color: #1a2030; border: 1px solid #2d3748; border-radius: 12px; padding: 24px; text-align: center;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Khôi phục mật khẩu tài khoản</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản OpenAid của bạn. Vui lòng nhập mã OTP sau:
          </p>
          <div style="display: inline-block; background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%); border: 2px solid #F28C1B; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ffffff; margin: 8px 0 16px;">
            ${otp}
          </div>
          <p style="color: #f59e0b; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
            ⏳ Mã có hiệu lực trong vòng 5 phút
          </p>
          <p style="color: #ef4444; font-size: 12px; margin-top: 0;">
            ⚠️ Không chia sẻ mã này cho bất kỳ ai. Đội ngũ OpenAid sẽ không bao giờ hỏi mã OTP của bạn.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 11px;">
          © ${new Date().getFullYear()} OpenAid System. Mọi thông tin được bảo mật và giám sát minh bạch.
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.initTransporter();
    }

    const from =
      this.configService.get<string>('mail.from') ||
      process.env.MAIL_FROM ||
      'OpenAid Platform <thaihoaa246@gmail.com>';

    try {
      await this.transporter!.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email successfully sent to: ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}
