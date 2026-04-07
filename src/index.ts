import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { TRACKING_SCRIPT } from "./trackingScript";

const app = express();
const port = process.env.PORT || 3001;

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error(`Missing env vars: SUPABASE_URL=${url ? "ok" : "missing"}, SUPABASE_SERVICE_ROLE_KEY=${key ? "ok" : "missing"}`);
    return createClient(url, key);
}

app.use(cors({ origin: "*" }));
app.use(express.json({ type: ["application/json", "text/plain"] }));

// Serve the tracking script
app.get("/track.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(TRACKING_SCRIPT);
});

// Collect pageview — upsert on session_id
app.post("/collect", async (req, res) => {
    const { business_id, url, referrer, visitor_id, session_id, screen_width } = req.body;

    if (!business_id || !url || !session_id) {
        res.status(400).end();
        return;
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
        .from("sessions")
        .select("id, pages, page_count")
        .eq("session_id", session_id)
        .single();

    if (existing) {
        const pages: string[] = existing.pages || [];
        if (!pages.includes(url)) pages.push(url);
        const { error } = await supabase
            .from("sessions")
            .update({ page_count: existing.page_count + 1, pages, updated_at: new Date().toISOString() })
            .eq("session_id", session_id);
        if (error) { console.error("DB update error:", error); res.status(500).end(); return; }
    } else {
        const { error } = await supabase
            .from("sessions")
            .insert({
                session_id,
                business_id,
                visitor_id: visitor_id || null,
                referrer: referrer || null,
                screen_width: screen_width || null,
                user_agent: req.headers["user-agent"] || null,
                pages: [url],
                page_count: 1,
            });
        if (error) { console.error("DB insert error:", error); res.status(500).end(); return; }
    }

    res.status(204).end();
});

// Update session duration
app.post("/duration", async (req, res) => {
    const { session_id, duration_seconds } = req.body;

    if (!session_id || !duration_seconds) {
        res.status(400).end();
        return;
    }

    await getSupabase()
        .from("sessions")
        .update({ duration_seconds, updated_at: new Date().toISOString() })
        .eq("session_id", session_id);

    res.status(204).end();
});

// Health check
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(port, () => {
    console.log(`VWA Tracker running on port ${port}`);
});
