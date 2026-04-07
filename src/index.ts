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

app.use(express.json());
app.use(cors({ origin: "*" }));

// Serve the tracking script
app.get("/track.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(TRACKING_SCRIPT);
});

// Collect pageview events
app.post("/collect", async (req, res) => {
    const { business_id, url, referrer, visitor_id, session_id, screen_width } = req.body;

    if (!business_id || !url) {
        res.status(400).end();
        return;
    }

    const { error } = await getSupabase().from("page_views").insert({
        business_id,
        url,
        referrer: referrer || null,
        visitor_id: visitor_id || null,
        session_id: session_id || null,
        screen_width: screen_width || null,
        user_agent: req.headers["user-agent"] || null,
    });

    if (error) {
        console.error("DB error:", error);
        res.status(500).end();
        return;
    }

    res.status(204).end();
});

// Health check
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(port, () => {
    console.log(`VWA Tracker running on port ${port}`);
});
