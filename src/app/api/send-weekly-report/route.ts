import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

// Supabase Client (Server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get user info
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userData.user;
    const email = user.email;
    const name =
      user.user_metadata?.full_name || email?.split("@")[0] || "there";

    // Get last 7 days stats
    const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

    const { data: sessions, error: sessionsError } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("completed_at", weekAgo)
      .eq("session_type", "pomodoro");

    if (sessionsError) {
      console.error("Sessions error:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        {
          error: "No pomodoro sessions found for the past week",
          message: "Start completing pomodoros to receive weekly reports!",
        },
        { status: 404 }
      );
    }

    // Calculate stats
    const totalPomodoros = sessions.length;
    const totalMinutes = sessions.reduce(
      (sum, s) => sum + s.duration_minutes,
      0
    );
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Find most productive day
    const dayGroups: { [key: string]: number } = {};
    sessions.forEach((s) => {
      const day = format(new Date(s.completed_at), "EEEE");
      dayGroups[day] = (dayGroups[day] || 0) + 1;
    });

    const mostProductiveDay =
      Object.entries(dayGroups).length > 0
        ? Object.entries(dayGroups).sort((a, b) => b[1] - a[1])[0]?.[0]
        : "N/A";

    // Get habits data
    const { data: habits } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", weekAgo);

    const habitsCompleted = habits?.length || 0;

    // Get tasks completed
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("completed_at", weekAgo);

    const tasksCompleted = tasks?.length || 0;

    // Email HTML
    const emailHtml = generateEmailHTML({
      name,
      totalPomodoros,
      totalHours,
      remainingMinutes,
      mostProductiveDay,
      habitsCompleted,
      tasksCompleted,
    });

    // Send email using fetch (Resend API)
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ThothFlow <noreply@thothflow.com>",
        to: email,
        subject: `📊 Your Weekly ThothFlow Report - ${totalPomodoros} Pomodoros Completed!`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: resendData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: resendData.id,
      stats: {
        totalPomodoros,
        totalMinutes,
        totalHours,
        remainingMinutes,
        mostProductiveDay,
        habitsCompleted,
        tasksCompleted,
      },
    });
  } catch (error: any) {
    console.error("Send weekly report error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Email HTML Generator
function generateEmailHTML(data: {
  name: string;
  totalPomodoros: number;
  totalHours: number;
  remainingMinutes: number;
  mostProductiveDay: string;
  habitsCompleted: number;
  tasksCompleted: number;
}) {
  const {
    name,
    totalPomodoros,
    totalHours,
    remainingMinutes,
    mostProductiveDay,
    habitsCompleted,
    tasksCompleted,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly ThothFlow Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Header - Clean Design -->
          <tr>
            <td style="padding: 40px 40px 32px; background-color: #3B82F6; text-align: center;">
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">📜 ThothFlow</h1>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 16px; font-weight: 400;">Your Weekly Report</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #111827; font-weight: 600;">Hi ${name}! 👋</h2>
              <p style="margin: 0; font-size: 15px; color: #6B7280; line-height: 1.5;">
                Here's your productivity summary for the past week. Great work!
              </p>
            </td>
          </tr>

          <!-- Stats Cards -->
          <tr>
            <td style="padding: 0 40px 32px;">
              
              <!-- Total Pomodoros -->
              <table role="presentation" style="width: 100%; margin-bottom: 12px; background-color: #F0F9FF; border-radius: 10px; border-left: 4px solid #3B82F6;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #3B82F6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🍅 Total Pomodoros</p>
                    <p style="margin: 0; font-size: 36px; color: #1E40AF; font-weight: 700; line-height: 1;">${totalPomodoros}</p>
                  </td>
                </tr>
              </table>

              <!-- Total Focus Time -->
              <table role="presentation" style="width: 100%; margin-bottom: 12px; background-color: #F0FDF4; border-radius: 10px; border-left: 4px solid #10B981;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #10B981; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ Total Focus Time</p>
                    <p style="margin: 0; font-size: 36px; color: #047857; font-weight: 700; line-height: 1;">${totalHours}h ${remainingMinutes}m</p>
                  </td>
                </tr>
              </table>

              <!-- Most Productive Day -->
              <table role="presentation" style="width: 100%; margin-bottom: 12px; background-color: #FFFBEB; border-radius: 10px; border-left: 4px solid #F59E0B;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #F59E0B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🌟 Most Productive Day</p>
                    <p style="margin: 0; font-size: 28px; color: #D97706; font-weight: 700; line-height: 1;">${mostProductiveDay}</p>
                  </td>
                </tr>
              </table>

              <!-- Two Column Stats -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="width: 48%; vertical-align: top;">
                    <table role="presentation" style="width: 100%; background-color: #FAF5FF; border-radius: 10px; border-left: 4px solid #8B5CF6;">
                      <tr>
                        <td style="padding: 18px 20px;">
                          <p style="margin: 0 0 6px 0; font-size: 12px; color: #8B5CF6; font-weight: 600; text-transform: uppercase;">✅ Habits</p>
                          <p style="margin: 0; font-size: 32px; color: #6D28D9; font-weight: 700; line-height: 1;">${habitsCompleted}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <td style="width: 4%;"></td>
                  
                  <td style="width: 48%; vertical-align: top;">
                    <table role="presentation" style="width: 100%; background-color: #FFF7ED; border-radius: 10px; border-left: 4px solid #F97316;">
                      <tr>
                        <td style="padding: 18px 20px;">
                          <p style="margin: 0 0 6px 0; font-size: 12px; color: #F97316; font-weight: 600; text-transform: uppercase;">📝 Tasks</p>
                          <p style="margin: 0; font-size: 32px; color: #C2410C; font-weight: 700; line-height: 1;">${tasksCompleted}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Motivation Quote -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%; background-color: #F9FAFB; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0; font-size: 14px; color: #4B5563; font-style: italic; line-height: 1.6;">
                      "${getMotivationalQuote()}"
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #3B82F6; padding: 14px 32px; border-radius: 8px;">
                    <a href="https://thothflow.com/dashboard" style="color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: block;">
                      View Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 13px; color: #9CA3AF;">
                Keep up the great work! 🚀
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6B7280;">
                Built with the wisdom of Thoth 📜
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                ThothFlow • Weekly Productivity Report
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Motivational quotes
function getMotivationalQuote() {
  const quotes = [
    "The secret of getting ahead is getting started. - Mark Twain",
    "Focus is a matter of deciding what things you're not going to do. - John Carmack",
    "Concentrate all your thoughts upon the work in hand. - Alexander Graham Bell",
    "It's not that I'm so smart, it's just that I stay with problems longer. - Albert Einstein",
    "The way to get started is to quit talking and begin doing. - Walt Disney",
    "Success is the sum of small efforts, repeated day in and day out. - Robert Collier",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "The future depends on what you do today. - Mahatma Gandhi",
    "Quality is not an act, it is a habit. - Aristotle",
    "You don't have to be great to start, but you have to start to be great. - Zig Ziglar",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
