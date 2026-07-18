import nodemailer from 'nodemailer';
import { EMAIL_PASS, EMAIL_USER } from "./index";

const ensureEmailSecretsConfigured = () => {
    // api secrets
    if (!EMAIL_USER || !EMAIL_PASS) {
        throw new Error("Email service is not configured on the server");
    }
};

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

export const sendEmail = async (
    to: string,
    subject: string,
    html: string,
    text?: string
) => {
    ensureEmailSecretsConfigured();
    const mailOptions = {
        from: `SajhaKuraKani <${EMAIL_USER}>`,
        to,
        subject,
        html,
        text,
    };
    await transporter.sendMail(mailOptions);
}
