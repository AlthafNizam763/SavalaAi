import { MeetingPlatform } from "@/types";

export interface MeetingUrlInfo {
  isValid: boolean;
  platform: MeetingPlatform;
  meetingId?: string;
  normalizedUrl?: string;
  error?: string;
  instructions: string[];
}

export function parseAndValidateMeetingUrl(url: string): MeetingUrlInfo {
  if (!url || !url.trim()) {
    return {
      isValid: false,
      platform: "other",
      instructions: [
        "Enter a Google Meet or Microsoft Teams meeting link.",
        "Select your audio capture method (Browser Tab Audio or Microphone).",
      ],
    };
  }

  const trimmed = url.trim();

  // 1. Google Meet Validation
  // e.g. https://meet.google.com/abc-defg-hij or meet.google.com/abc-defg-hij
  const meetRegex = /(?:https?:\/\/)?meet\.google\.com\/([a-z0-9-]+)/i;
  const meetMatch = trimmed.match(meetRegex);
  if (meetMatch) {
    const meetingCode = meetMatch[1].replace(/[^a-z0-9-]/gi, "");
    return {
      isValid: true,
      platform: "google_meet",
      meetingId: meetingCode,
      normalizedUrl: `https://meet.google.com/${meetingCode}`,
      instructions: [
        "Google Meet detected.",
        "Join your Google Meet in another browser tab.",
        "Click 'Connect Tab Audio' below and select the Google Meet tab with 'Share tab audio' checked.",
        "Savala AI will transcribe the interviewer's speech and generate real-time suggested answers.",
      ],
    };
  }

  // 2. Microsoft Teams Validation
  // e.g. https://teams.microsoft.com/l/meetup-join/... or teams.live.com/meet/...
  const teamsRegex = /(?:https?:\/\/)?(?:teams\.microsoft\.com|teams\.live\.com)\/.+/i;
  if (teamsRegex.test(trimmed)) {
    return {
      isValid: true,
      platform: "microsoft_teams",
      normalizedUrl: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      instructions: [
        "Microsoft Teams meeting link verified.",
        "Open your Teams meeting in a Chrome/Edge browser tab or Teams desktop app.",
        "Click 'Connect Tab Audio' to capture Teams meeting audio directly, or use Microphone mode for external speakers.",
        "Savala AI will detect live questions and synthesize contextual answers.",
      ],
    };
  }

  // 3. Fallback / generic web meeting
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return {
      isValid: true,
      platform: "other",
      normalizedUrl: trimmed,
      instructions: [
        "Custom meeting link accepted.",
        "Select Tab Audio or Microphone mode to capture audio from this meeting platform.",
      ],
    };
  }

  return {
    isValid: false,
    platform: "other",
    error: "Invalid meeting URL. Please provide a valid Google Meet (meet.google.com) or Microsoft Teams link.",
    instructions: [
      "Examples of supported URLs:",
      "• Google Meet: https://meet.google.com/abc-defg-hij",
      "• Microsoft Teams: https://teams.microsoft.com/l/meetup-join/...",
    ],
  };
}
