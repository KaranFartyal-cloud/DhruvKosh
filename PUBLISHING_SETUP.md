# Publishing Setup Guide

This document explains how to set up the social media auto-publishing module for the NCPOR portal.

## Setting up Telegram

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to create a new bot.
3. You will receive an API token. This is your `TELEGRAM_BOT_TOKEN`.
4. Create a new Telegram Channel (e.g., "NCPOR Updates").
5. Add your new bot as an **Administrator** to the channel, giving it permission to post messages.
6. Get the Channel ID: The easiest way is to forward a message from your channel to `@userinfobot` or use Telegram Web. Alternatively, you can temporarily set the channel to public, use its `@username` as the `TELEGRAM_CHANNEL_ID` to post a message via API, then get the internal `-100...` ID from the response and set the channel back to private.

## Setting up X (Twitter)

**Note: The X API is now pay-per-use for many features. Free tier may have limits, so verify the cost per post in the developer console.**

1. Go to the [X Developer Portal](https://developer.x.com/en/portal/dashboard).
2. Create a new Project and App.
3. In the App settings, ensure you configure User Authentication Settings and set the App permissions to **Read and Write**.
4. Generate the following credentials:
   - API Key (`X_API_KEY`)
   - API Key Secret (`X_API_SECRET`)
   - Access Token (`X_ACCESS_TOKEN`)
   - Access Token Secret (`X_ACCESS_TOKEN_SECRET`)

## Setting up Mastodon

Mastodon is free and easy to configure as an alternative to X.
1. Create an account on any Mastodon instance (e.g., `mastodon.social`).
2. Go to **Preferences -> Development -> New Application**.
3. Give your app a name and ensure you check the `write:statuses` and `write:media` scopes.
4. Submit to generate your tokens.
5. In your `.env` file, set `MASTODON_INSTANCE_URL` to the base URL of your instance (e.g., `https://mastodon.social`) and `MASTODON_ACCESS_TOKEN` to the generated "Your access token".

## Setting up Bluesky

Bluesky provides an easy API for posting.
1. Log in to your Bluesky account.
2. Go to **Settings -> Advanced -> App Passwords**.
3. Generate an App Password for the portal.
4. Set `BLUESKY_HANDLE` to your handle (e.g., `yourname.bsky.social`) and `BLUESKY_APP_PASSWORD` to the password you just generated.

## Future Scope: Adapter Architecture Ready

The underlying publisher system is fully modular. The registry (`app/services/publishers/registry.py`) already contains placeholder stubs for the following platforms. They can be activated in the future simply by creating their respective publisher classes:
- **Facebook Pages**: Uses Facebook Graph API and requires a Page Access Token.
- **Instagram**: Uses Meta Graph API. Note: requires a public URL for image posting (can be served via FastAPI StaticFiles).
- **LinkedIn**: Uses LinkedIn Developer API with OAuth. Token validity is 60 days.

## Environment Variables Configuration

Copy `.env.example` to `.env` and fill in the values. 

To test publishing without making real network calls to social media platforms, set:
```
PUBLISH_MODE=dry_run
```

To enable live publishing to real social platforms:
```
PUBLISH_MODE=live
```

You can optionally enable auto-publishing when content is marked as Approved:
```
AUTO_PUBLISH_ON_APPROVE=false
```
