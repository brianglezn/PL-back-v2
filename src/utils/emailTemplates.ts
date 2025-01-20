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

export const getAccountDeletionEmailTemplate = (name: string) => emailLayout(`
    <h1 style="color:#fe6f14;margin-bottom:24px;text-align:center">💔 We're sad to see you go, ${name} 💔</h1>
    
    <p style="margin-bottom:20px;line-height:1.6">Hey ${name},</p>
    
    <p style="margin-bottom:20px;line-height:1.6">
        I'm Brian, CEO of Profit-Lost. I just wanted to take a moment to say thank you for trying out our platform 
        and being part of our community, even if it was for a short while.
    </p>

    <p style="margin-bottom:24px;line-height:1.6">
        We understand that sometimes it's just not the right time or fit—and that's okay!
    </p>

    <div style="background-color:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
        <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">Before you go</h2>
        <p style="margin-bottom:16px;line-height:1.6">
            If there's anything we could have done better, we'd love to hear from you. Your feedback helps us improve 
            and create a better experience for everyone. Feel free to reply to this email or contact us directly at 
            <a href="mailto:brian@profit-lost.com" style="color:#fe6f14;text-decoration:none">brian@profit-lost.com</a>.
        </p>
    </div>

    <div style="margin-bottom:24px">
        <h2 style="color:#fe6f14;margin-bottom:16px;font-size:20px">We're always here for you</h2>
        <p style="margin-bottom:16px;line-height:1.6">
            If you ever decide to come back, we'll be ready to help you take control of your finances again. 
            It's easy to pick up right where you left off.
        </p>
        <p style="margin-bottom:16px;line-height:1.6">
            Until then, we wish you the very best in reaching your financial goals!
        </p>
    </div>
`); 