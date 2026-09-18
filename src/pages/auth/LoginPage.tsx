import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': '#b71234',
  'Executive': '#dc2626',
  'Manager': '#2563eb',
  'HOD': '#059669',
  'President': '#7c3aed',
  'Shipment Manager': '#ea580c',
  'Viewer': '#64748b',
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, users } = useAuth();
  const { settings } = useSystem();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const ok = login(email.trim(), password);
      if (ok) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillCredentials = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword || 'admin@123');
    setError('');
  };

  // Only show users that have an assigned role
  const loginUsers = users.filter(u => u.roleName && u.email);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 rounded-2xl overflow-hidden bg-black items-center justify-center shadow-lg border border-border/30">
            <img src="/rdx-logo.png" alt="RDX" className="w-14 h-14 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {settings?.branding?.companyName || 'RDX Management'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {settings?.branding?.appTitle || 'Enterprise Request Tracking'}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-elevated space-y-5">
          <div className="border-b border-border/80 pb-3">
            <h2 className="text-base font-bold text-foreground">Sign In to Your Account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your corporate credentials to access the portal
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Forgot password simulated */}
          {forgotSent && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Password reset link has been sent to your email.
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Corporate Email Address"
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              placeholder="yourname@rdx.com"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                <input type="checkbox" defaultChecked className="rounded text-primary w-3.5 h-3.5" />
                <span>Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotSent(true)}
                className="text-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="md"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
            </Button>
          </form>

          {/* Credentials Directory (collapsible) */}
          <div className="pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                System User Credentials Directory
              </span>
              {showCredentials
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
            </button>

            {showCredentials && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] text-muted-foreground mb-2">
                  Click any row to auto-fill credentials, then click Sign In.
                </p>
                {loginUsers.map((u) => {
                  const roleColor = ROLE_COLORS[u.roleName] || '#6366f1';
                  const isFilled = email === u.email;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleFillCredentials(u.email, u.password || 'admin@123')}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left text-xs transition-all ${
                        isFilled
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/70 bg-muted/20 hover:bg-muted hover:border-primary/30'
                      }`}
                    >
                      {/* Role color dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: roleColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate" style={{ color: isFilled ? 'var(--primary)' : undefined }}>
                            {u.roleName}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border/80 text-muted-foreground shrink-0">
                            {u.password || 'admin@123'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{u.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Security footer */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-mono">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>AES-256 Encrypted Session · RBAC Enforced · RDX v2026</span>
        </div>
      </div>
    </div>
  );
};
