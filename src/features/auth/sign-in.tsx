import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { z } from "zod";
import { Action, Copy, Field } from "../../components/ui";
import { usePreferences } from "../../theme/preferences";

type Mode = "signIn" | "signUp" | "reset";
type Stage = "details" | "code" | "password";
type Result = { error: unknown };
async function checked(result: Promise<Result>) {
  const { error } = await result;
  if (error) throw error;
}

// Native email flows use the configured FAPI proxy directly. Hosted Account
// Portal authentication is unavailable on the selected production instance.
export function SignIn() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signIn");
  const [stage, setStage] = useState<Stage>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const locked = useRef(false);
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const validEmail = z.email().safeParse(email.trim()).success;
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (error) {
      // Never log passwords, verification codes or Clerk resource payloads.
      const response = z
        .object({
          errors: z.array(
            z.object({
              message: z.string().max(500),
              longMessage: z.string().max(500).optional(),
            }),
          ),
        })
        .safeParse(error);
      const detail = response.success ? response.data.errors[0] : undefined;
      setError(detail?.longMessage || detail?.message || t("authError"));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function finishSignIn() {
    if (signIn.status !== "complete")
      throw new Error("Additional verification required");
    await checked(signIn.finalize());
  }
  async function sendCode() {
    if (mode === "signUp") await checked(signUp.verifications.sendEmailCode());
    else if (mode === "reset")
      await checked(signIn.resetPasswordEmailCode.sendCode());
    else
      await checked(signIn.emailCode.sendCode({ emailAddress: email.trim() }));
    setCode("");
    setStage("code");
    setCooldown(30);
  }
  async function submit() {
    if (stage === "password") {
      await checked(signIn.resetPasswordEmailCode.submitPassword({ password }));
      setPassword("");
      await finishSignIn();
    } else if (stage === "code") {
      if (mode === "signUp") {
        await checked(
          signUp.verifications.verifyEmailCode({ code: code.trim() }),
        );
        if (signUp.status !== "complete") throw new Error("Incomplete sign-up");
        await checked(signUp.finalize());
      } else if (mode === "reset") {
        await checked(
          signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }),
        );
        if (signIn.status !== "needs_new_password")
          throw new Error("Reset not verified");
        setCode("");
        setStage("password");
      } else {
        await checked(signIn.emailCode.verifyCode({ code: code.trim() }));
        await finishSignIn();
      }
    } else if (mode === "signUp") {
      await checked(signUp.password({ emailAddress: email.trim(), password }));
      setPassword("");
      setStage("code");
      await sendCode();
    } else if (mode === "reset") {
      await checked(signIn.create({ identifier: email.trim() }));
      await sendCode();
    } else {
      await checked(signIn.password({ emailAddress: email.trim(), password }));
      setPassword("");
      await finishSignIn();
    }
  }
  async function switchMode(next: Mode) {
    await checked(signIn.reset());
    await checked(signUp.reset());
    setMode(next);
    setStage("details");
    setPassword("");
    setCode("");
    setCooldown(0);
  }
  async function googleSignIn() {
    // Expo Go cannot register our OAuth callback scheme. Never send an exp://
    // callback or a changing LAN address to the production redirect allowlist.
    if (isExpoGo) return;
    await checked(signIn.reset());
    await checked(signUp.reset());
    setPassword("");
    setCode("");
    const result = await startSSOFlow({
      strategy: "oauth_google",
      redirectUrl: "plantopedia://sso-callback",
    });
    if (
      result.authSessionResult?.type === "cancel" ||
      result.authSessionResult?.type === "dismiss"
    )
      return;
    // The Core 3 hook finalizes completed sessions itself. Do not activate an
    // unfinished signup/MFA attempt or treat an unloaded SDK as success.
    if (
      !result.createdSessionId &&
      !result.signIn?.existingSession &&
      !result.signUp?.existingSession
    )
      setError(t("authGoogleIncomplete"));
  }
  if (!open)
    return (
      <View style={{ gap: 12 }}>
        <Action
          title={t("authGoogle")}
          disabled={isExpoGo}
          busy={busy}
          onPress={() => void run(googleSignIn)}
        />
        {isExpoGo ? <Copy muted>{t("authGoogleBuild")}</Copy> : null}
        <Action
          title={t("signIn")}
          secondary
          disabled={busy}
          onPress={() => setOpen(true)}
        />
        {error ? <Copy>{error}</Copy> : null}
      </View>
    );
  const label =
    mode === "signUp"
      ? t("authCreate")
      : mode === "reset"
        ? t("authReset")
        : t("authSignIn");
  return (
    <View style={{ gap: 12 }}>
      <Copy large>{label}</Copy>
      {stage === "details" && mode !== "reset" ? (
        <>
          <Action
            title={t("authGoogle")}
            secondary
            disabled={isExpoGo || busy}
            onPress={() => void run(googleSignIn)}
          />
          {isExpoGo ? <Copy muted>{t("authGoogleBuild")}</Copy> : null}
        </>
      ) : null}
      {stage === "details" ? (
        <>
          <Field
            label={t("authEmail")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          {mode !== "reset" ? (
            <Field
              label={t("authPassword")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={
                mode === "signUp" ? "new-password" : "current-password"
              }
              editable={!busy}
            />
          ) : null}
        </>
      ) : stage === "code" ? (
        <>
          <Copy>{t("authCheckEmail")}</Copy>
          <Field
            label={t("authCode")}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!busy}
          />
        </>
      ) : (
        <Field
          label={t("authNewPassword")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          editable={!busy}
        />
      )}
      <Action
        title={
          stage === "code"
            ? t("authVerify")
            : stage === "password"
              ? t("authSavePassword")
              : label
        }
        busy={busy}
        disabled={
          stage === "code"
            ? !code.trim()
            : stage === "password"
              ? !password
              : !validEmail || (mode !== "reset" && !password)
        }
        onPress={() => void run(submit)}
      />
      {stage === "details" && mode === "signIn" ? (
        <Action
          title={t("authEmailCode")}
          secondary
          disabled={!validEmail || busy}
          onPress={() => void run(sendCode)}
        />
      ) : null}
      {stage === "code" ? (
        <Action
          title={`${t("authResend")}${cooldown ? ` (${cooldown})` : ""}`}
          secondary
          disabled={busy || cooldown > 0}
          onPress={() => void run(sendCode)}
        />
      ) : null}
      {error ? (
        <View accessibilityLiveRegion="polite">
          <Copy>{error}</Copy>
        </View>
      ) : null}
      {stage === "details" && mode === "signIn" ? (
        <>
          <Action
            title={t("authCreate")}
            secondary
            disabled={busy}
            onPress={() => void run(() => switchMode("signUp"))}
          />
          <Action
            title={t("authForgot")}
            secondary
            disabled={busy}
            onPress={() => void run(() => switchMode("reset"))}
          />
        </>
      ) : (
        <Action
          title={t("authBack")}
          secondary
          disabled={busy}
          onPress={() => void run(() => switchMode("signIn"))}
        />
      )}
    </View>
  );
}
