import { SignIn as ClerkSignIn } from "@clerk/expo/web";
import { usePreferences } from "../../theme/preferences";

export function SignIn() {
  const { colors, mode } = usePreferences();
  const inputBorder = mode === "dark" ? "#718977" : "#7C9181";
  // Keep Clerk mounted when OAuth returns to /login#/sso-callback, including
  // signup transfer and additional verification. A modal alone cannot resume
  // after a full-page redirect, and the default Account Portal is not hosted.
  return (
    <ClerkSignIn
      routing="hash"
      withSignUp
      appearance={{
        variables: {
          colorPrimary: colors.primary,
          colorPrimaryForeground: colors.onPrimary,
          colorBackground: colors.surface,
          colorForeground: colors.text,
          colorMutedForeground: colors.secondary,
          colorInput: colors.surface,
          colorInputForeground: colors.text,
          colorDanger: colors.danger,
          colorBorder: colors.border,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: "1rem",
          borderRadius: "0.75rem",
        },
        elements: {
          rootBox: { width: "100%", maxWidth: "none" },
          cardBox: {
            width: "100%",
            maxWidth: "none",
            boxShadow: "none",
            border: "none",
            borderRadius: 0,
            overflow: "visible",
          },
          card: {
            width: "100%",
            padding: 0,
            // Clerk overlaps its own border with -1px logical margins. Our
            // borderless embedded card must not shift outside its container.
            margin: 0,
            marginInline: 0,
            marginBlockStart: 0,
            borderRadius: 0,
            boxShadow: "none",
            background: "transparent",
            border: "none",
          },
          headerTitle: {
            fontSize: "1.5rem",
            fontWeight: 650,
            letterSpacing: "-0.04em",
            color: colors.text,
          },
          headerSubtitle: { color: colors.secondary },
          socialButtonsBlockButton: {
            minHeight: "48px",
            paddingInline: "12px",
            border: `1px solid ${colors.border} !important`,
            background: colors.surface,
            boxShadow: "none !important",
            color: colors.text,
            "&:focus-visible": {
              outline: `2px solid ${colors.primary}`,
              outlineOffset: "2px",
            },
          },
          socialButtonsBlockButtonText: {
            fontSize: "15px",
            fontWeight: 600,
            minWidth: 0,
            whiteSpace: "normal",
          },
          socialButtonsProviderIcon: { flexShrink: 0, minWidth: "16px" },
          formFieldInput: {
            minHeight: "48px",
            maxHeight: "none",
            fontSize: "16px",
            boxShadow: "none !important",
            border: `1px solid ${inputBorder} !important`,
            '&[aria-invalid="true"]': {
              borderColor: `${colors.danger} !important`,
            },
            "&:focus-visible": {
              outline: `2px solid ${colors.primary}`,
              outlineOffset: "2px",
            },
          },
          formButtonPrimary: {
            minHeight: "48px",
            fontSize: "15px",
            fontWeight: 600,
            boxShadow: "none !important",
            background: colors.primary,
            backgroundImage: "none",
            color: colors.onPrimary,
            "&:focus-visible": {
              outline: `2px solid ${colors.primary}`,
              outlineOffset: "2px",
            },
          },
          footer: { background: "transparent", marginTop: "24px", padding: 0 },
          footerActionLink: { color: colors.primary },
        },
      }}
    />
  );
}
