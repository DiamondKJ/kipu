import "dotenv/config";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import axios from "axios";
import { userStore, User } from "./store.js"; // Explicit .js for ESM
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve("./uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}


const app = express();
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({ secret: "dev-secret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true })); // for HTML form data
app.use(express.json()); // for JSON APIs
app.use("/uploads", express.static(UPLOAD_DIR));

// Serialize/Deserialize
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

// Facebook login strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_APP_ID!,
      clientSecret: process.env.FB_APP_SECRET!,
      callbackURL: "http://localhost:3000/auth/facebook/callback",
      profileFields: ["id", "displayName", "email"],
    },
    async (accessToken, _refreshToken, _profile, done) => {
      try {
        // Exchange for long-lived token
        const tokenResp = await axios.get("https://graph.facebook.com/oauth/access_token", {
          params: {
            grant_type: "fb_exchange_token",
            client_id: process.env.FB_APP_ID!,
            client_secret: process.env.FB_APP_SECRET!,
            fb_exchange_token: accessToken,
          },
        });

        const longLivedToken = tokenResp.data.access_token;

        // Fetch user profile
        const meResp = await axios.get("https://graph.facebook.com/me", {
          params: { access_token: longLivedToken, fields: "id,name,email" },
        });

        const user: User = {
          id: meResp.data.id,
          name: meResp.data.name,
          email: meResp.data.email ?? null,
          accessToken: longLivedToken,
          tokenCreatedAt: Date.now(),
        };

        // Store in memory
        userStore.set(user.id, user);

        done(null, { facebookData: meResp.data, accessToken: longLivedToken });
      } catch (err) {
        done(err as Error);
      }
    }
  )
);


// Routes

// Home page
app.get("/", (_req, res) => res.send('<a href="/auth/facebook">Login with Facebook</a>'));

app.get("/auth/facebook", (req, res, next) => {
  passport.authenticate(
    "facebook",
    {
      scope: [
        "email",
        "public_profile",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish"
      ],
      authType: "rerequest" // forces permission prompt
    } as any // TypeScript fix
  )(req, res, next);
});

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/error" }),
  (req, res) => res.redirect("/post")
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("https://www.facebook.com/logout.php");
    });
  });
});


// Error
app.get("/error", (_req, res) => res.send("Authentication failed"));

// Fetch profile from memory
app.get("/profile/:id", async (req, res) => {
  const user = userStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const response = await axios.get("https://graph.facebook.com/me", {
      params: { access_token: user.accessToken, fields: "id,name,email" },
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      facebookData: response.data,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get("/post", async (req, res) => {
  const user = req.user as any;
  if (!user) return res.redirect("/auth/facebook");

  const status = req.query.status as string | undefined;
  const statusMessage = req.query.message as string | undefined;

  try {
    // 1️⃣ Fetch pages the user manages
    const pagesResp = await axios.get("https://graph.facebook.com/me/accounts", {
      params: { access_token: user.accessToken },
    });

    const pages = pagesResp.data.data;

    // 2️⃣ Fetch IG account linked to each page
    const pageData: {
      id: string;
      name: string;
      igId?: string;
    }[] = [];

    for (const page of pages) {
      let igId: string | undefined;

      try {
        const igResp = await axios.get(
          `https://graph.facebook.com/${page.id}`,
          {
            params: {
              fields: "instagram_business_account",
              access_token: page.access_token, // IMPORTANT
            },
          }
        );

        igId = igResp.data.instagram_business_account?.id;
      } catch {
        igId = undefined;
      }

      pageData.push({
        id: page.id,
        name: page.name,
        igId,
      });
    }

    // 3️⃣ Build HTML options
    const pageOptionsHtml = pageData
      .map(
        (p) =>
          `<option value="${p.id}" data-ig="${p.igId ?? ""}">
            ${p.name}${p.igId ? " (IG)" : ""}
          </option>`
      )
      .join("");

    const igOptionsHtml = pageData
      .filter((p) => p.igId)
      .map(
        (p) =>
          `<option value="${p.igId}">
            ${p.name} (IG)
          </option>`
      )
      .join("");

    // 4️⃣ Status message
    let statusHtml = "";
    if (status && statusMessage) {
      statusHtml = `
        <p class="status-${status === "success" ? "success" : "error"}">
          ${statusMessage}
        </p>
      `;
    }

    // 5️⃣ Send full HTML
    res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Create Post</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 700px;
          margin: 40px auto;
        }
        label {
          font-weight: bold;
          display: block;
          margin-top: 15px;
        }
        select, textarea, input[type="file"], button {
          width: 100%;
          margin-top: 5px;
          padding: 8px;
        }
        textarea {
          height: 100px;
        }
        button {
          margin-top: 20px;
          font-size: 16px;
          cursor: pointer;
        }
        .status-success {
          color: green;
          font-weight: bold;
        }
        .status-error {
          color: red;
          font-weight: bold;
        }
        .note {
          font-size: 0.9em;
          color: #555;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>

      ${statusHtml}

      <h1>Create Facebook / Instagram Post</h1>

      <form method="POST" action="/post" enctype="multipart/form-data">

        <label>Facebook Page</label>
        <select name="pageId" id="pageSelect" required>
          ${pageOptionsHtml}
        </select>

        <label>Instagram Account</label>
        <select name="igId" id="igSelect">
          <option value="">None</option>
          ${igOptionsHtml}
        </select>

        <div class="note">
          Instagram posting requires an image and a Business/Creator account.
        </div>

        <label>Message</label>
        <textarea name="message" required></textarea>

        <label>Image (optional)</label>
        <input type="file" name="image" accept="image/*" />

        <div class="note">
          • No image → Facebook only<br />
          • Image uploaded → Facebook + Instagram
        </div>

        <button type="submit">Post</button>
      </form>

      <script>
        const pageSelect = document.getElementById("pageSelect");
        const igSelect = document.getElementById("igSelect");

        function syncIG() {
          const selected = pageSelect.options[pageSelect.selectedIndex];
          const igId = selected.dataset.ig || "";

          if (!igId) {
            igSelect.value = "";
            return;
          }

          for (const opt of igSelect.options) {
            if (opt.value === igId) {
              igSelect.value = igId;
              return;
            }
          }

          igSelect.value = "";
        }

        pageSelect.addEventListener("change", syncIG);
        syncIG();
      </script>

    </body>
    </html>`);
  } catch (err: any) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Failed to load post page");
  }
});

app.post("/post", upload.single("image"), async (req, res) => {
  const user = req.user as any;
  if (!user) return res.redirect("/auth/facebook");

  const { message, pageId, igId } = req.body;

  if (!message || !pageId) {
    return res.redirect(`/post?status=error&message=Missing+message+or+page`);
  }

  try {
    // Fetch Page access token
    const pagesResp = await axios.get("https://graph.facebook.com/me/accounts", {
      params: { access_token: user.accessToken },
    });

    const page = pagesResp.data.data.find((p: any) => p.id === pageId);
    if (!page) throw new Error("Page not found");

    const pageAccessToken = page.access_token;

    // IMAGE LOGIC
    const hasImage = Boolean(req.file);
    const imageUrl = req.file
      ? `${process.env.PUBLIC_BASE_URL}/uploads/${req.file.filename}`
      : null;

    // FACEBOOK POST
    if (hasImage) {
      // FB post WITH image
      const photoResp = await axios.post(
        `https://graph.facebook.com/${pageId}/photos`,
        null,
        {
          params: {
            url: imageUrl,
            caption: message,
            access_token: pageAccessToken,
          },
        }
      );
    } else {
      // FB text-only post
      await axios.post(`https://graph.facebook.com/${pageId}/feed`, null, {
        params: {
          message,
          access_token: pageAccessToken,
        },
      });
    }

    // INSTAGRAM POST (only if image exists
    if (hasImage && igId) {
      const mediaResp = await axios.post(
        `https://graph.facebook.com/${igId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: message,
            access_token: pageAccessToken,
          },
        }
      );

      await axios.post(
        `https://graph.facebook.com/${igId}/media_publish`,
        null,
        {
          params: {
            creation_id: mediaResp.data.id,
            access_token: pageAccessToken,
          },
        }
      );
    }

    res.redirect(`/post?status=success&message=Post+sent+successfully`);
  } catch (err: any) {
    console.error(err.response?.data || err.message);
    res.redirect(`/post?status=error&message=Post+failed`);
  }
});




// Check token scopes
app.get("/debug/token", async (req, res) => {
  const token = (req.user as any)?.accessToken;
  if (!token) return res.status(401).send("Not logged in");

  const r = await axios.get("https://graph.facebook.com/debug_token", {
    params: {
      input_token: token,
      access_token: `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`,
    },
  });
  res.json(r.data);
});

// Check Pages
app.get("/debug/pages", async (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).send("Not logged in");

  const r = await axios.get("https://graph.facebook.com/me/accounts", {
    params: { access_token: user.accessToken },
  });
  res.json(r.data);
});



app.listen(3000, () => console.log("✅ Server running at http://localhost:3000"));
