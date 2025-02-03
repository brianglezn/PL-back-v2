export const emailLayout = (content: string) => `
<div style="max-width:640px;margin:0 auto;font-family:'Arial',sans-serif;color:#212529;background-color:#f8f9fa;padding:20px">
    <div style="background-color:#ffffff;border-radius:8px;padding:40px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
        <div style="text-align:center;margin-bottom:32px">
            <img src="https://res.cloudinary.com/dnhlagojg/image/upload/v1726670794/AppPhotos/Brand/logoPL2.svg" 
                 alt="Profit-Lost Logo" 
                 style="max-width:200px;height:auto">
        </div>
        ${content}
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #dee2e6;text-align:center">
            <p style="margin-bottom:8px;line-height:1.6">Best regards,</p>
            <p style="margin-bottom:16px;font-weight:bold">Brian</p>
            <p style="color:#6c757d">Founder, Profit-Lost</p>
            <a href="https://profit-lost.com" style="color:#fe6f14;text-decoration:none">profit-lost.com</a>
        </div>
    </div>
</div>`;

export const getWelcomeEmailTemplate = (name: string, dashboardUrl: string) => emailLayout(`
    <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">💰 ${name}, welcome to Profit-Lost! 💰</h1>
    
    <p style="margin-bottom:20px;line-height:1.6">Hey ${name},</p>
    
    <p style="margin-bottom:20px;line-height:1.6">
        I'm Brian, CEO of Profit-Lost. Thank you for joining us! We're here to help you take control of your finances and make smarter money decisions.
    </p>

    <p style="margin-bottom:16px;line-height:1.6">At Profit-Lost, we believe in a life where:</p>
    <ul style="margin-bottom:24px;padding-left:20px;line-height:1.6">
        <li style="margin-bottom:8px">You understand and control your expenses.</li>
        <li style="margin-bottom:8px">You confidently achieve your savings goals.</li>
        <li style="margin-bottom:8px">You develop better financial habits every day.</li>
    </ul>

    <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
        <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">First steps</h2>
        <p style="margin-bottom:16px">Let's keep it simple:</p>
        <ol style="margin-bottom:0;padding-left:20px;line-height:1.6">
            <li style="margin-bottom:8px"><strong>Set up your categories:</strong> Create categories (e.g., "Groceries," "Transportation," "Savings").</li>
            <li style="margin-bottom:8px"><strong>Track your expenses:</strong> Add your first transactions to see where your money goes.</li>
            <li style="margin-bottom:8px"><strong>Analyze your habits:</strong> Check the dashboard for insights and make small, impactful changes.</li>
        </ol>
    </div>

    <div style="margin-bottom:24px">
        <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">What's next? 🚀</h2>
        <p style="margin-bottom:16px">We're working on exciting features like:</p>
        <ul style="margin-bottom:0;padding-left:20px;line-height:1.6">
            <li style="margin-bottom:8px">Automatic bank connections.</li>
            <li style="margin-bottom:8px">Personalized goals.</li>
            <li style="margin-bottom:8px">AI-powered financial tools.</li>
            <li style="margin-bottom:8px">An investing tool.</li>
        </ul>
    </div>

    <div style="text-align:center;margin:32px 0">
        <a href="${dashboardUrl}" 
           style="display:inline-block;background-color:#fe6f14;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:bold">
           Go to my dashboard
        </a>
    </div>

    <p style="margin-bottom:16px;line-height:1.6">
        <strong>We'd love your feedback!</strong><br>
        Feel free to contact me anytime at <a href="mailto:brian@profit-lost.com" style="color:#fe6f14;text-decoration:none">brian@profit-lost.com</a>
    </p>

    <p style="margin-bottom:24px;line-height:1.6">
        Thanks again for signing up—we can't wait to help you achieve your financial goals!
    </p>
`);

export const getAccountDeletionEmailTemplate = (name: string, language: string = 'enUS') => {
    if (language === 'esES') {
        return emailLayout(`
            <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">👋 Cuenta eliminada con éxito 👋</h1>
            
            <p style="margin-bottom:20px;line-height:1.6">Hola ${name},</p>
            
            <p style="margin-bottom:20px;line-height:1.6">
                Confirmamos que tu cuenta de Profit-Lost ha sido eliminada correctamente. Todos tus datos han sido borrados de manera permanente.
            </p>

            <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
                <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">¿Qué significa esto?</h2>
                <ul style="margin-bottom:0;padding-left:20px;line-height:1.6">
                    <li style="margin-bottom:8px">Tu información personal ha sido eliminada.</li>
                    <li style="margin-bottom:8px">Tus datos financieros han sido borrados permanentemente.</li>
                    <li style="margin-bottom:8px">Ya no tendrás acceso a tu cuenta.</li>
                </ul>
            </div>

            <p style="margin-bottom:24px;line-height:1.6">
                Lamentamos verte partir. Si deseas volver a usar Profit-Lost en el futuro, siempre serás bienvenido/a creando una nueva cuenta.
            </p>
        `);
    }

    return emailLayout(`
        <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">👋 Account Successfully Deleted 👋</h1>
        
        <p style="margin-bottom:20px;line-height:1.6">Hello ${name},</p>
        
        <p style="margin-bottom:20px;line-height:1.6">
            We confirm that your Profit-Lost account has been successfully deleted. All your data has been permanently erased.
        </p>

        <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
            <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">What does this mean?</h2>
            <ul style="margin-bottom:0;padding-left:20px;line-height:1.6">
                <li style="margin-bottom:8px">Your personal information has been removed.</li>
                <li style="margin-bottom:8px">Your financial data has been permanently deleted.</li>
                <li style="margin-bottom:8px">You will no longer have access to your account.</li>
            </ul>
        </div>

        <p style="margin-bottom:24px;line-height:1.6">
            We're sorry to see you go. If you wish to use Profit-Lost again in the future, you'll always be welcome to create a new account.
        </p>
    `);
};

export const getPasswordChangeEmailTemplate = (name: string, language: string = 'enUS') => {
    if (language === 'esES') {
        return emailLayout(`
            <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">🔐 Contraseña actualizada con éxito 🔐</h1>
        
        <p style="margin-bottom:20px;line-height:1.6">Hola ${name},</p>
        
        <p style="margin-bottom:20px;line-height:1.6">
            Te confirmamos que tu contraseña ha sido actualizada correctamente en tu cuenta de Profit-Lost.
        </p>

        <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
            <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Información importante</h2>
            <p style="margin-bottom:16px;line-height:1.6">
                Si no realizaste este cambio, por favor contacta inmediatamente con nuestro equipo de soporte en 
                <a href="mailto:support@profit-lost.com" style="color:#fe6f14;text-decoration:none">support@profit-lost.com</a>.
            </p>
        </div>

        <div style="margin-bottom:24px">
            <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Recomendaciones de seguridad</h2>
            <ul style="margin-bottom:0;padding-left:20px;line-height:1.6">
                <li style="margin-bottom:8px">Nunca compartas tu contraseña con nadie.</li>
                <li style="margin-bottom:8px">Usa contraseñas únicas para cada servicio.</li>
                <li style="margin-bottom:8px">Activa la autenticación de dos factores cuando esté disponible.</li>
                <li style="margin-bottom:8px">Revisa regularmente la actividad de tu cuenta.</li>
            </ul>
        </div>

        <p style="margin-bottom:24px;line-height:1.6">
            Gracias por confiar en Profit-Lost para gestionar tus finanzas de manera segura.
        </p>
        `);
    }
    
    if (language === 'enUS') {
        return emailLayout(`
                <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">🔐 Password Updated Successfully 🔐</h1>
            
            <p style="margin-bottom:20px;line-height:1.6">Hello ${name},</p>
            
            <p style="margin-bottom:20px;line-height:1.6">
                We confirm that your password has been successfully updated on your Profit-Lost account.
            </p>

            <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
                <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Important Information</h2>
                <p style="margin-bottom:16px;line-height:1.6">
                    If you did not make this change, please contact our support team immediately at 
                    <a href="mailto:support@profit-lost.com" style="color:#fe6f14;text-decoration:none">support@profit-lost.com</a>.
                </p>
            </div>

            <div style="margin-bottom:24px">
                <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Security Recommendations</h2>
                <ul style="margin-bottom:0;padding-left:20px;line-height:1.6">
                    <li style="margin-bottom:8px">Never share your password with anyone.</li>
                    <li style="margin-bottom:8px">Use unique passwords for each service.</li>
                    <li style="margin-bottom:8px">Enable two-factor authentication when available.</li>
                    <li style="margin-bottom:8px">Regularly review your account activity.</li>
                </ul>
            </div>

            <p style="margin-bottom:24px;line-height:1.6">
                Thank you for trusting Profit-Lost to manage your finances securely.
            </p>
        `);
    }
};

export const getPasswordResetEmailTemplate = (name: string, token: string, language: string = 'enUS') => {
    if (language === 'esES') {
        return emailLayout(`
            <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">🔑 Recuperación de contraseña 🔑</h1>
            
            <p style="margin-bottom:20px;line-height:1.6">Hola ${name},</p>
            
            <p style="margin-bottom:20px;line-height:1.6">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta Profit-Lost.
            </p>

            <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
                <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Tu código de recuperación:</h2>
                <p style="font-size:24px;font-weight:bold;text-align:center;letter-spacing:4px;margin:20px 0">
                    ${token}
                </p>
                <p style="margin-top:16px;font-size:14px;color:#6c757d">
                    Este código expirará en 15 minutos.
                </p>
            </div>

            <p style="margin-bottom:16px;line-height:1.6">
                Si no solicitaste este cambio, por favor ignora este email o contacta con soporte en
                <a href="mailto:support@profit-lost.com" style="color:#fe6f14;text-decoration:none">support@profit-lost.com</a>.
            </p>
        `);
    }

    return emailLayout(`
        <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">🔑 Password Recovery 🔑</h1>
        
        <p style="margin-bottom:20px;line-height:1.6">Hello ${name},</p>
        
        <p style="margin-bottom:20px;line-height:1.6">
            We received a request to reset the password for your Profit-Lost account.
        </p>

        <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
            <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Your recovery code:</h2>
            <p style="font-size:24px;font-weight:bold;text-align:center;letter-spacing:4px;margin:20px 0">
                ${token}
            </p>
            <p style="margin-top:16px;font-size:14px;color:#6c757d">
                This code will expire in 15 minutes.
            </p>
        </div>

        <p style="margin-bottom:16px;line-height:1.6">
            If you didn't request this change, please ignore this email or contact support at
            <a href="mailto:support@profit-lost.com" style="color:#fe6f14;text-decoration:none">support@profit-lost.com</a>.
        </p>
    `);
}; 