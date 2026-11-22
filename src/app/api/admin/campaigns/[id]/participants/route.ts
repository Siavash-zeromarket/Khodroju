import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

interface ParticipantAccumulator {
  user_id: string;
  sources: Set<string>;
  last_activity: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    // ── Authenticate the caller from cookies ──
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = String(profile?.role ?? "").toUpperCase();
    if (role !== "ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Gather participants with service role (bypasses profiles RLS) ──
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: polls } = await admin
      .from("campaign_polls")
      .select("id")
      .eq("campaign_id", campaignId);
    const pollIds = (polls ?? []).map((p: { id: string }) => p.id);

    const [favorites, comments, votes] = await Promise.all([
      admin
        .from("campaign_favorites")
        .select("user_id, created_at")
        .eq("campaign_id", campaignId),
      admin
        .from("campaign_comments")
        .select("user_id, created_at")
        .eq("campaign_id", campaignId),
      pollIds.length
        ? admin
            .from("campaign_poll_votes")
            .select("user_id, created_at")
            .in("poll_id", pollIds)
        : Promise.resolve({
            data: [] as { user_id: string; created_at: string }[],
          }),
    ]);

    const map = new Map<string, ParticipantAccumulator>();

    const addRows = (
      rows: { user_id: string; created_at: string }[] | null,
      source: string,
    ) => {
      for (const r of rows ?? []) {
        const existing = map.get(r.user_id) ?? {
          user_id: r.user_id,
          sources: new Set<string>(),
          last_activity: null,
        };
        existing.sources.add(source);
        if (!existing.last_activity || r.created_at > existing.last_activity) {
          existing.last_activity = r.created_at;
        }
        map.set(r.user_id, existing);
      }
    };

    addRows(favorites.data as any, "favorite");
    addRows(comments.data as any, "comment");
    addRows(votes.data as any, "vote");

    const userIds = [...map.keys()];
    if (!userIds.length) {
      return NextResponse.json({ participants: [] });
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email, phone, city, avatar_path, role")
      .in("id", userIds);

    const profileMap = new Map(
      ((profiles ?? []) as any[]).map((p) => [p.id, p]),
    );

    const participants = userIds
      .map((uid) => {
        const acc = map.get(uid)!;
        const p = profileMap.get(uid) ?? {};
        return {
          user_id: uid,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          city: p.city ?? null,
          avatar_path: p.avatar_path ?? null,
          role: p.role ?? null,
          sources: [...acc.sources],
          last_activity: acc.last_activity,
        };
      })
      .sort((a, b) =>
        (b.last_activity ?? "").localeCompare(a.last_activity ?? ""),
      );

    return NextResponse.json({ participants });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
