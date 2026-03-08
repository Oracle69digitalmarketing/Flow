import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import { WebClient } from "@slack/web-api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("flow.db");

// Initialize Slack Client
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_platforms (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    platform TEXT,
    platform_user_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    platform TEXT,
    content TEXT,
    direction TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    deal_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    crm_id TEXT,
    name TEXT,
    amount REAL,
    stage TEXT,
    probability INTEGER,
    last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS browser_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    url TEXT,
    title TEXT,
    is_competitor BOOLEAN,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    deal_id TEXT,
    type TEXT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(deal_id) REFERENCES deals(id)
  );

  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    trigger_type TEXT,
    action_type TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed some demo data
const seedDemoData = () => {
  const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const userId = "user_1";
    db.prepare("INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)").run(userId, "sarah@techcorp.com", "Sarah AE");
    
    db.prepare("INSERT INTO deals (id, user_id, crm_id, name, amount, stage, probability) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      "deal_1", userId, "hs_9921", "Acme Corp Expansion", 450000, "Negotiation", 60
    );

    db.prepare("INSERT INTO conversations (id, user_id, platform, content, direction) VALUES (?, ?, ?, ?, ?)").run(
      "msg_1", userId, "whatsapp", "Hey Flow, what's the latest on the Acme deal?", "incoming"
    );
    
    db.prepare("INSERT INTO browser_sessions (id, user_id, url, title, is_competitor) VALUES (?, ?, ?, ?, ?)").run(
      "sess_1", userId, "https://competitor-x.com/pricing", "Competitor X Pricing", 1
    );
  }
};
seedDemoData();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Gemini API Setup
  const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // --- API Routes ---

  // User & Context
  app.get("/api/context/:userId", (req, res) => {
    const { userId } = req.params;
    const deals = db.prepare("SELECT * FROM deals WHERE user_id = ?").all(userId);
    const conversations = db.prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10").all(userId);
    const browser = db.prepare("SELECT * FROM browser_sessions WHERE user_id = ? ORDER BY visited_at DESC LIMIT 5").all(userId);
    const documents = db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    const workflows = db.prepare("SELECT * FROM workflows WHERE user_id = ?").all(userId);
    
    res.json({ deals, conversations, browser, documents, workflows });
  });

  // Document Generation
  app.post("/api/documents/generate", async (req, res) => {
    const { userId = "user_1", dealId, type, competitorName } = req.body;
    
    const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(dealId) as any;
    const ai = getAI();
    
    let prompt = "";
    if (type === "battlecard") {
      prompt = `Generate a sales battlecard for ${deal.name} against competitor ${competitorName}. Include: Key Differentiators, Pricing Comparison, and Handling Objections. Format as Markdown.`;
    } else {
      prompt = `Generate a sales proposal for ${deal.name} (Amount: $${deal.amount}). Include: Executive Summary, Solution Overview, and Timeline. Format as Markdown.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const docId = `doc_${Date.now()}`;
    db.prepare("INSERT INTO documents (id, user_id, deal_id, type, title, content) VALUES (?, ?, ?, ?, ?, ?)").run(
      docId, userId, dealId, type, `${type === 'battlecard' ? 'Battlecard' : 'Proposal'}: ${deal.name}`, response.text
    );

    res.json({ id: docId, title: `${type === 'battlecard' ? 'Battlecard' : 'Proposal'}: ${deal.name}`, content: response.text });
  });

  // Workflow Management
  app.post("/api/workflows", (req, res) => {
    const { userId = "user_1", name, triggerType, actionType } = req.body;
    const id = `wf_${Date.now()}`;
    db.prepare("INSERT INTO workflows (id, user_id, name, trigger_type, action_type) VALUES (?, ?, ?, ?, ?)").run(
      id, userId, name, triggerType, actionType
    );
    res.json({ id, name });
  });

  // Update Deal
  app.put("/api/deals/:id", (req, res) => {
    const { id } = req.params;
    const { stage, probability, amount } = req.body;
    
    db.prepare("UPDATE deals SET stage = ?, probability = ?, amount = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?").run(
      stage, probability, amount, id
    );
    
    res.json({ status: "ok" });
  });

  // Sync with HubSpot (Simulation)
  app.post("/api/deals/sync", async (req, res) => {
    const { userId = "user_1" } = req.body;
    
    // In a real app, this would fetch from HubSpot API
    // We'll simulate a probability increase for the demo
    const deals = db.prepare("SELECT * FROM deals WHERE user_id = ?").all(userId) as any[];
    
    for (const deal of deals) {
      const newProb = Math.min(100, deal.probability + 5);
      db.prepare("UPDATE deals SET probability = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?").run(
        newProb, deal.id
      );
    }
    
    res.json({ status: "synced", count: deals.length });
  });

  // WhatsApp Webhook (Real Integration)
  app.get("/api/webhooks/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log("WHATSAPP_WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  });

  app.post("/api/webhooks/whatsapp", async (req, res) => {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from;
        const msg_body = body.entry[0].changes[0].value.messages[0].text.body;
        const userId = "user_1"; // Default for hackathon demo

        // Log incoming message
        db.prepare("INSERT INTO conversations (id, user_id, platform, content, direction) VALUES (?, ?, ?, ?, ?)").run(
          `wa_${Date.now()}`, userId, "whatsapp", msg_body, "incoming"
        );

        // Process with AI
        const ai = getAI();
        const deals = db.prepare("SELECT * FROM deals WHERE user_id = ?").all(userId);
        
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: `
            User on WhatsApp: ${msg_body}
            Context: ${JSON.stringify(deals)}
            
            You are FLOW, a sales assistant. Respond concisely to the WhatsApp message.
            WhatsApp users are often mobile, so keep it brief and impactful.
          `,
        });

        const reply = response.text || "I'm looking into that for you.";

        // Send response back to WhatsApp
        try {
          await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: from,
              text: { body: reply },
            }),
          });

          // Log outgoing message
          db.prepare("INSERT INTO conversations (id, user_id, platform, content, direction) VALUES (?, ?, ?, ?, ?)").run(
            `wa_reply_${Date.now()}`, userId, "whatsapp", reply, "outgoing"
          );
        } catch (err) {
          console.error("WhatsApp message send failed", err);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  // Slack Events (Real Integration)
  app.post("/api/webhooks/slack", async (req, res) => {
    const { type, challenge, event } = req.body;

    // Handle Slack URL Verification
    if (type === "url_verification") {
      return res.json({ challenge });
    }

    // Handle Event Callback
    if (type === "event_callback" && event) {
      const { channel, text, user: slackUser, type: eventType, bot_id } = event;

      // Ignore bot messages to prevent loops
      if (bot_id) return res.json({ status: "ignored" });

      const userId = "user_1"; // Default for hackathon demo

      // Log incoming message
      db.prepare("INSERT INTO conversations (id, user_id, platform, content, direction) VALUES (?, ?, ?, ?, ?)").run(
        `sl_${Date.now()}`, userId, "slack", text, "incoming"
      );

      // Process with AI if it's a mention or a DM
      if (eventType === "app_mention" || eventType === "message") {
        const ai = getAI();
        const deals = db.prepare("SELECT * FROM deals WHERE user_id = ?").all(userId);
        
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: `
            User on Slack: ${text}
            Context: ${JSON.stringify(deals)}
            
            You are FLOW, a sales assistant. Respond concisely to the Slack message.
            If they ask about a deal, give them the status.
          `,
        });

        const reply = response.text || "I'm on it!";

        // Send response back to Slack
        try {
          await slackClient.chat.postMessage({
            channel: channel,
            text: reply,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: reply
                }
              }
            ]
          });

          // Log outgoing message
          db.prepare("INSERT INTO conversations (id, user_id, platform, content, direction) VALUES (?, ?, ?, ?, ?)").run(
            `sl_reply_${Date.now()}`, userId, "slack", reply, "outgoing"
          );
        } catch (err) {
          console.error("Slack postMessage failed", err);
        }
      }
    }

    res.json({ status: "ok" });
  });

  // Browser Tracking
  app.post("/api/browser/track", (req, res) => {
    const { url, title, isCompetitor, userId = "user_1" } = req.body;
    db.prepare("INSERT INTO browser_sessions (id, user_id, url, title, is_competitor) VALUES (?, ?, ?, ?, ?)").run(
      `br_${Date.now()}`, userId, url, title, isCompetitor ? 1 : 0
    );
    res.json({ status: "ok" });
  });

  // AI Query (from Browser Extension or Dashboard)
  app.post("/api/ai/query", async (req, res) => {
    const { query, userId = "user_1", platform = "browser" } = req.body;
    
    const deals = db.prepare("SELECT * FROM deals WHERE user_id = ?").all(userId);
    const recentMsgs = db.prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5").all(userId);
    const browser = db.prepare("SELECT * FROM browser_sessions WHERE user_id = ? ORDER BY visited_at DESC LIMIT 3").all(userId);

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `
        User Query: ${query}
        Platform: ${platform}
        
        CONTEXT:
        Deals: ${JSON.stringify(deals)}
        Recent Conversations: ${JSON.stringify(recentMsgs)}
        Recent Browser Activity: ${JSON.stringify(browser)}
        
        You are FLOW, an AI sales assistant. Help the user win deals. 
        Provide insights, suggest next steps, and be proactive.
        If they ask about a deal, give them the status and any competitive intel.
      `,
    });

    res.json({ text: response.text });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
