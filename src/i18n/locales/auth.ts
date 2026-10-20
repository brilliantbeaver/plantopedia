const en = {
  authSignIn: "Sign in",
  authGoogle: "Continue with Google",
  authGoogleBuild:
    "Google sign-in needs the Plantopedia development or installed app. In Expo Go, use email sign-in below.",
  authGoogleIncomplete:
    "Google sign-in needs additional verification. Try signing in with email to complete your account.",
  authEmail: "Email",
  authPassword: "Password",
  authNewPassword: "New password",
  authCreate: "Create account",
  authReset: "Reset password",
  authCheckEmail: "Check your email for a verification code.",
  authCode: "Verification code",
  authVerify: "Verify code",
  authSavePassword: "Save password",
  authEmailCode: "Sign in with an email code",
  authResend: "Resend code",
  authError:
    "Check your email, password or code and try again. Additional verification may be required.",
  authForgot: "Forgot password?",
  authBack: "Back to sign in",
} as const;
type AuthCopy = { [K in keyof typeof en]: string };
export const authCopy: Record<
  "en" | "fr" | "es" | "de" | "zh-Hans" | "ja" | "ko",
  AuthCopy
> = {
  en,
  fr: {
    authSignIn: "Se connecter",
    authGoogle: "Continuer avec Google",
    authGoogleBuild:
      "La connexion Google nécessite une version de développement ou installée de Plantopedia. Dans Expo Go, utilisez votre e-mail.",
    authGoogleIncomplete:
      "Une vérification supplémentaire est nécessaire. Essayez de vous connecter par e-mail pour terminer votre compte.",
    authEmail: "E-mail",
    authPassword: "Mot de passe",
    authNewPassword: "Nouveau mot de passe",
    authCreate: "Créer un compte",
    authReset: "Réinitialiser le mot de passe",
    authCheckEmail: "Consultez votre e-mail pour le code de vérification.",
    authCode: "Code de vérification",
    authVerify: "Vérifier le code",
    authSavePassword: "Enregistrer le mot de passe",
    authEmailCode: "Se connecter avec un code par e-mail",
    authResend: "Renvoyer le code",
    authError:
      "Vérifiez votre e-mail, mot de passe ou code, puis réessayez. Une vérification supplémentaire peut être nécessaire.",
    authForgot: "Mot de passe oublié ?",
    authBack: "Retour à la connexion",
  },
  es: {
    authSignIn: "Iniciar sesión",
    authGoogle: "Continuar con Google",
    authGoogleBuild:
      "Google requiere la app instalada o de desarrollo de Plantopedia. En Expo Go, inicia sesión por correo.",
    authGoogleIncomplete:
      "Google requiere verificación adicional. Intenta iniciar sesión por correo para completar tu cuenta.",
    authEmail: "Correo electrónico",
    authPassword: "Contraseña",
    authNewPassword: "Nueva contraseña",
    authCreate: "Crear cuenta",
    authReset: "Restablecer contraseña",
    authCheckEmail: "Busca el código de verificación en tu correo.",
    authCode: "Código de verificación",
    authVerify: "Verificar código",
    authSavePassword: "Guardar contraseña",
    authEmailCode: "Iniciar sesión con un código por correo",
    authResend: "Reenviar código",
    authError:
      "Revisa tu correo, contraseña o código e inténtalo de nuevo. Puede ser necesaria una verificación adicional.",
    authForgot: "¿Olvidaste tu contraseña?",
    authBack: "Volver al inicio de sesión",
  },
  de: {
    authSignIn: "Anmelden",
    authGoogle: "Mit Google fortfahren",
    authGoogleBuild:
      "Google benötigt die installierte Plantopedia-App oder einen Entwicklungsbuild. In Expo Go bitte E-Mail verwenden.",
    authGoogleIncomplete:
      "Eine weitere Bestätigung ist nötig. Melde dich per E-Mail an, um dein Konto zu vervollständigen.",
    authEmail: "E-Mail",
    authPassword: "Passwort",
    authNewPassword: "Neues Passwort",
    authCreate: "Konto erstellen",
    authReset: "Passwort zurücksetzen",
    authCheckEmail: "Prüfe deine E-Mails auf den Bestätigungscode.",
    authCode: "Bestätigungscode",
    authVerify: "Code bestätigen",
    authSavePassword: "Passwort speichern",
    authEmailCode: "Mit E-Mail-Code anmelden",
    authResend: "Code erneut senden",
    authError:
      "Prüfe E-Mail, Passwort oder Code und versuche es erneut. Eine weitere Bestätigung kann erforderlich sein.",
    authForgot: "Passwort vergessen?",
    authBack: "Zurück zur Anmeldung",
  },
  "zh-Hans": {
    authSignIn: "登录",
    authGoogle: "使用 Google 继续",
    authGoogleBuild:
      "Google 登录需要 Plantopedia 开发版或已安装的应用。在 Expo Go 中请使用邮箱登录。",
    authGoogleIncomplete:
      "Google 登录需要进一步验证。请尝试通过邮箱登录以完成账户设置。",
    authEmail: "电子邮箱",
    authPassword: "密码",
    authNewPassword: "新密码",
    authCreate: "创建账户",
    authReset: "重置密码",
    authCheckEmail: "请查看电子邮件中的验证码。",
    authCode: "验证码",
    authVerify: "验证",
    authSavePassword: "保存密码",
    authEmailCode: "使用邮箱验证码登录",
    authResend: "重新发送验证码",
    authError: "请检查邮箱、密码或验证码后重试。可能需要进一步验证。",
    authForgot: "忘记密码？",
    authBack: "返回登录",
  },
  ja: {
    authSignIn: "ログイン",
    authGoogle: "Google で続行",
    authGoogleBuild:
      "Google ログインには Plantopedia の開発ビルドまたはインストール済みアプリが必要です。Expo Go ではメールでログインしてください。",
    authGoogleIncomplete:
      "追加の認証が必要です。メールでログインしてアカウントの設定を完了してください。",
    authEmail: "メールアドレス",
    authPassword: "パスワード",
    authNewPassword: "新しいパスワード",
    authCreate: "アカウントを作成",
    authReset: "パスワードをリセット",
    authCheckEmail: "メールに届いた認証コードを確認してください。",
    authCode: "認証コード",
    authVerify: "コードを確認",
    authSavePassword: "パスワードを保存",
    authEmailCode: "メールのコードでログイン",
    authResend: "コードを再送信",
    authError:
      "メールアドレス、パスワード、コードを確認して再試行してください。追加の認証が必要な場合があります。",
    authForgot: "パスワードをお忘れですか？",
    authBack: "ログインに戻る",
  },
  ko: {
    authSignIn: "로그인",
    authGoogle: "Google로 계속",
    authGoogleBuild:
      "Google 로그인은 Plantopedia 개발 빌드 또는 설치된 앱이 필요합니다. Expo Go에서는 이메일로 로그인하세요.",
    authGoogleIncomplete:
      "추가 인증이 필요합니다. 이메일로 로그인하여 계정 설정을 완료하세요.",
    authEmail: "이메일",
    authPassword: "비밀번호",
    authNewPassword: "새 비밀번호",
    authCreate: "계정 만들기",
    authReset: "비밀번호 재설정",
    authCheckEmail: "이메일로 받은 인증 코드를 확인하세요.",
    authCode: "인증 코드",
    authVerify: "코드 확인",
    authSavePassword: "비밀번호 저장",
    authEmailCode: "이메일 코드로 로그인",
    authResend: "코드 다시 보내기",
    authError:
      "이메일, 비밀번호 또는 코드를 확인한 후 다시 시도하세요. 추가 인증이 필요할 수 있습니다.",
    authForgot: "비밀번호를 잊으셨나요?",
    authBack: "로그인으로 돌아가기",
  },
};
