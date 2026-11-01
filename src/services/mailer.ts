import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    throw new Error("MAIL_USER or MAIL_PASS is not set in environment variables");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export interface InquiryMailOptions {
  ownerEmail: string;
  ownerName: string;
  propertyTitle: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string | null;
  message: string;
}

export async function sendInquiryEmail(opts: InquiryMailOptions): Promise<void> {
  const { ownerEmail, ownerName, propertyTitle, senderName, senderEmail, senderPhone, message } = opts;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"ProEstate Inquiries" <${process.env.MAIL_USER}>`,
    to: ownerEmail,
    subject: `New Inquiry for "${propertyTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#1c398e;padding:24px 28px">
          <h1 style="color:#fff;margin:0;font-size:20px">New Property Inquiry</h1>
          <p style="color:#a5b4fc;margin:6px 0 0;font-size:13px">Someone is interested in your listing</p>
        </div>

        <div style="padding:28px">
          <p style="margin:0 0 20px;color:#475569;font-size:14px">Hi <strong>${ownerName}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569;font-size:14px">
            You have received a new inquiry for your property <strong>"${propertyTitle}"</strong>.
          </p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">
            <h2 style="margin:0 0 14px;font-size:14px;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em">Sender Details</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:6px 0;color:#64748b;width:110px">Name</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600">${senderName}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b">Email</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600">
                  <a href="mailto:${senderEmail}" style="color:#1c398e">${senderEmail}</a>
                </td>
              </tr>
              ${senderPhone ? `
              <tr>
                <td style="padding:6px 0;color:#64748b">Phone</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600">${senderPhone}</td>
              </tr>` : ""}
            </table>
          </div>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px">
            <h2 style="margin:0 0 10px;font-size:14px;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em">Message</h2>
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;white-space:pre-line">${message}</p>
          </div>

          <p style="margin:0;color:#94a3b8;font-size:12px">
            This email was sent via ProEstate. Please reply directly to the sender's email address.
          </p>
        </div>
      </div>
    `,
  });
}
