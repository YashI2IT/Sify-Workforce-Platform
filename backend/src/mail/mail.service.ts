import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT || '1025', 10),
      secure: false, // true for 465, false for other ports
      auth: process.env.MAIL_USER ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      } : undefined,
    });
  }

  async sendInvitationEmail(
    email: string,
    name: string,
    orgName: string,
    role: string,
    teamName: string | null,
    rawToken: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${frontendUrl}/invite/${rawToken}`;
    
    const teamText = teamName ? ` and have been assigned to the **${teamName}** team` : '';

    const textContent = `
Hello ${name},

You have been invited to join ${orgName} on the Sify Workforce Platform.
You have been assigned the role of ${role}${teamText}.

To accept this invitation, please open the following link in your browser:
${invitationLink}

Please note:
- This invitation will expire in 7 days.
- If you were not expecting this invitation, you can safely ignore this email.

Thank you,
The Sify Workforce Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Sify Workforce Platform</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You have been invited to join <strong>${orgName}</strong>.</p>
        <p>You have been assigned the role of <strong>${role}</strong>${teamName ? ` and have been assigned to the <strong>${teamName}</strong> team` : ''}.</p>
        
        <div style="margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Accept Invitation</a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          <strong>Please note:</strong><br>
          - This invitation will expire in 7 days.<br>
          - If you were not expecting this invitation, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">
          Thank you,<br>
          The Sify Workforce Team<br>
          <a href="${frontendUrl}" style="color: #999;">${frontendUrl}</a>
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Sify Workforce" <noreply@sifyworkforce.com>',
        to: email,
        subject: `Invitation to join ${orgName} on Sify Workforce`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[MailService] Successfully sent invitation to ${email}`);
    } catch (error: any) {
      console.error(`[MailService] Failed to send invitation email to ${email}:`, error);
      if (process.env.NODE_ENV === 'development' && (error?.code === 'ECONNREFUSED' || error?.code === 'ESOCKET')) {
        console.warn(`[MailService DEV] Local SMTP server not active on port 1025. Simulated invitation link: ${invitationLink}`);
        return;
      }
      throw new InternalServerErrorException('Failed to deliver invitation email. Please try again later.');
    }
  }

  async sendInvitationCredentialsEmail(params: {
    email: string;
    name: string;
    username: string;
    password: string;
    orgName: string;
    role: string;
    teamName: string | null;
  }) {
    const { email, name, username, password, orgName, role, teamName } = params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginLink = `${frontendUrl}/login`;
    const teamText = teamName ? ` and squad **${teamName}**` : '';

    const textContent = `
Hello ${name},

You have been invited to join ${orgName} on the Sify Workforce Platform as ${role}${teamText}.

An account has been created for you with the following temporary credentials:
- Username: ${username}
- Email: ${email}
- Temporary Password: ${password}

Please log in at:
${loginLink}

IMPORTANT: Please log in using these temporary credentials and change your password immediately upon your first sign-in.

Thank you,
The Sify Workforce Team
${frontendUrl}
    `;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #090d16; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Sify Workforce</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; line-height: 24px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; line-height: 24px; color: #334155;">
            You have been invited to join <strong>${orgName}</strong> on the Sify Workforce Platform. You have been assigned the role of <span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 13px;">${role}</span>${teamName ? ` in the <strong>${teamName}</strong> squad` : ''}.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 0; margin-bottom: 12px;">Your Temporary Login Credentials</p>
            <div style="font-family: monospace; font-size: 14px; color: #0f172a; margin-bottom: 8px;">
              <strong>Username:</strong> ${username}
            </div>
            <div style="font-family: monospace; font-size: 14px; color: #0f172a; margin-bottom: 8px;">
              <strong>Email:</strong> ${email}
            </div>
            <div style="font-family: monospace; font-size: 14px; color: #0f172a;">
              <strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${password}</code>
            </div>
          </div>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #1e40af; margin: 0; line-height: 18px;">
              <strong>Security Prompt:</strong> Please log in using these temporary credentials and immediately change your password upon your first sign-in.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0 20px 0;">
            <a href="${loginLink}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Log In to Sify Workforce &rarr;</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            This automated email was sent by Sify Workforce Platform.<br>
            If you were not expecting this invitation, please contact your organization administrator.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Sify Workforce" <noreply@sifyworkforce.com>',
        to: email,
        subject: `Your Temporary Credentials & Invitation to ${orgName} — Sify Workforce`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[MailService] Successfully sent credentials email to ${email}`);
    } catch (error: any) {
      console.error(`[MailService] Failed to send credentials email to ${email}:`, error);
      if (process.env.NODE_ENV === 'development' && (error?.code === 'ECONNREFUSED' || error?.code === 'ESOCKET')) {
        console.warn(`[MailService DEV] Local SMTP server not active on port 1025. Simulated credentials email delivered to ${email}: Username="${username}", Password="${password}".`);
        return;
      }
      throw new InternalServerErrorException('Failed to deliver invitation email. Please try again later.');
    }
  }

  async sendTimesheetApprovalEmail(params: {
    email: string;
    employeeName: string;
    weekStart: string;
    weekEnd: string;
  }) {
    const { email, employeeName, weekStart, weekEnd } = params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const textContent = `
Hello ${employeeName},

Your timesheet for the week of ${weekStart} to ${weekEnd} has been approved.
It is now read-only.

Log in to view details: ${frontendUrl}/timesheets

Thank you,
The Sify Workforce Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #10b981;">Timesheet Approved</h2>
        <p>Hello <strong>${employeeName}</strong>,</p>
        <p>Your timesheet for the week of <strong>${weekStart} to ${weekEnd}</strong> has been approved.</p>
        <p>Your timesheet is now locked and read-only.</p>
        
        <div style="margin: 30px 0;">
          <a href="${frontendUrl}/timesheets" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Timesheet</a>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Sify Workforce" <noreply@sifyworkforce.com>',
        to: email,
        subject: `Timesheet Approved – [${weekStart} to ${weekEnd}]`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[MailService] Sent Timesheet Approval Email to ${email}`);
    } catch (error) {
      console.error(`[MailService] Failed to send Timesheet Approval Email to ${email}:`, error);
    }
  }

  async sendTimesheetRejectionEmail(params: {
    email: string;
    employeeName: string;
    weekStart: string;
    weekEnd: string;
    remark: string;
  }) {
    const { email, employeeName, weekStart, weekEnd, remark } = params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const textContent = `
Hello ${employeeName},

Your timesheet for the week of ${weekStart} to ${weekEnd} has been REJECTED.

Manager's Remark: "${remark}"

Please correct your time entries and resubmit your timesheet as soon as possible.

Log in to edit: ${frontendUrl}/time-entries

Thank you,
The Sify Workforce Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #ef4444;">Timesheet Rejected – Action Required</h2>
        <p>Hello <strong>${employeeName}</strong>,</p>
        <p>Your timesheet for the week of <strong>${weekStart} to ${weekEnd}</strong> has been rejected.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Manager's Remark:</strong><br/>"${remark}"</p>
        </div>
        
        <p>Please correct your time entries and resubmit your timesheet.</p>
        
        <div style="margin: 30px 0;">
          <a href="${frontendUrl}/time-entries" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Edit & Resubmit</a>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Sify Workforce" <noreply@sifyworkforce.com>',
        to: email,
        subject: `Timesheet Rejected – Action Required – [${weekStart} to ${weekEnd}]`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[MailService] Sent Timesheet Rejection Email to ${email}`);
    } catch (error) {
      console.error(`[MailService] Failed to send Timesheet Rejection Email to ${email}:`, error);
    }
  }

  async sendTimesheetResubmissionEmail(params: {
    managerEmail: string;
    employeeName: string;
    weekStart: string;
    weekEnd: string;
    action: 'submitted' | 'resubmitted';
  }) {
    const { managerEmail, employeeName, weekStart, weekEnd, action } = params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const Title = action === 'resubmitted' ? 'Timesheet Resubmitted' : 'Timesheet Submitted';
    
    const textContent = `
Hello,

${employeeName} has ${action} their timesheet for the week of ${weekStart} to ${weekEnd}.

Please log in to review and approve/reject.

Log in to review: ${frontendUrl}/approvals

Thank you,
The Sify Workforce Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #3b82f6;">${Title}</h2>
        <p><strong>${employeeName}</strong> has ${action} their timesheet for the week of <strong>${weekStart} to ${weekEnd}</strong>.</p>
        <p>Please log in to review and approve or reject.</p>
        
        <div style="margin: 30px 0;">
          <a href="${frontendUrl}/approvals" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Review Timesheet</a>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Sify Workforce" <noreply@sifyworkforce.com>',
        to: managerEmail,
        subject: `${Title} – ${employeeName} [${weekStart} to ${weekEnd}]`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[MailService] Sent Timesheet Submission Email to ${managerEmail}`);
    } catch (error) {
      console.error(`[MailService] Failed to send Timesheet Submission Email to ${managerEmail}:`, error);
    }
  }

  async sendTimesheetReminderEmail(params: {
    email: string;
    employeeName: string;
    weekStart: string;
    weekEnd: string;
    totalHours: number;
  }) {
    const { email, employeeName, weekStart, weekEnd, totalHours } = params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const textContent = `
Hello ${employeeName},

A reminder that you have ${totalHours}h of time entries logged for the week of ${weekStart} to ${weekEnd} that have not yet been submitted for manager approval.

Please submit your timesheet at: ${frontendUrl}/time-entries

Thank you,
The Sify Workforce Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #f8b500; padding: 20px 30px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0;">⏰ Timesheet Reminder</h2>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello <strong>${employeeName}</strong>,</p>
          <p>This is a friendly reminder that you have <strong>${totalHours} hours</strong> of time entries for the week of <strong>${weekStart}</strong> to <strong>${weekEnd}</strong> that have not yet been submitted for approval.</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${frontendUrl}/time-entries" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              Submit My Timesheet
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;">If you have already submitted or have no hours to report, please disregard this message.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#9ca3af;font-size:12px;">Sify Workforce Platform</p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Sify Workforce" <noreply@sifyworkforce.com>',
        to: email,
        subject: `Timesheet Reminder: ${weekStart} – ${weekEnd} pending submission`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[MailService] Sent reminder email to ${email}`);
    } catch (error) {
      console.error(`[MailService] Failed to send reminder to ${email}:`, error);
    }
  }
}

