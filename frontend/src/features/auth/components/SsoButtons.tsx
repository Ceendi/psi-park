import { Button, useToast } from '@/shared/ui';

// Brand marks ported 1:1 from the Claude Design handoff (Login.html / Register.html).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.47 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 13.3c0-3.3 2.7-4.9 2.8-5-.5-2.3-3-2.6-3.9-2.6-1.7-.2-3.2.9-4.1.9-.9 0-2.2-.9-3.6-.9-1.8 0-3.6 1.1-4.5 2.7-1.9 3.3-.5 8.3 1.4 11 .9 1.3 2 2.8 3.5 2.7 1.4-.1 1.9-.9 3.6-.9 1.7 0 2.2.9 3.6.9 1.5 0 2.5-1.3 3.4-2.7 1.1-1.5 1.5-3 1.5-3.1-.1 0-2.9-1.1-2.9-4.1zM14.7 3.2c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.4 1.8-.8.9-1.4 2.2-1.2 3.6 1.3.1 2.6-.7 3.4-1.6z" />
    </svg>
  );
}

/**
 * "lub" divider + Google/Apple buttons. Social sign-in is deliberately out of MVP
 * scope (PLAN §18) — the buttons stay visual-only and explain "wkrótce" on tap.
 */
export function SsoButtons() {
  const { toast } = useToast();
  const notYet = () =>
    toast({
      variant: 'info',
      title: 'Już wkrótce',
      description: 'Logowanie przez Google i Apple udostępnimy w przyszłości.',
    });

  return (
    <>
      <div className="my-2 flex items-center font-mono text-xs uppercase tracking-[0.12em] text-ink-300">
        <span className="h-px flex-1 bg-ink-100" />
        <span className="px-4">lub</span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          aria-disabled="true"
          title="Już wkrótce"
          onClick={notYet}
          leftIcon={<GoogleIcon />}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          aria-disabled="true"
          title="Już wkrótce"
          onClick={notYet}
          leftIcon={<AppleIcon />}
        >
          Apple
        </Button>
      </div>
    </>
  );
}
