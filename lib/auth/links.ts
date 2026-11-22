// Collects incoming links from app start, on the same React Native "url" event expo-router routes
// on, so app/auth/callback sees a link tapped while the app was already open even if it mounts
// after the event. Imported by lib/auth/session (loaded by the root layout) to register early.
import * as Linking from "expo-linking";
import { createLinkQueue } from "./linkQueue";

export const authLinks = createLinkQueue(() => Linking.getLinkingURL());

Linking.addEventListener("url", ({ url }) => authLinks.push(url));
