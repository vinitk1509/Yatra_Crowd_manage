'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth, UserRole } from '@/lib/auth-context'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

const ROLES_INFO: { role: UserRole; title: string; desc: string; email: string }[] = [
  {
    role: 'ADMIN',
    title: 'Administrator',
    desc: 'Full system configuration, route/checkpoint topology & user management',
    email: 'admin@yatraflow.gov.in',
  },
  {
    role: 'CONTROL_ROOM_OPERATOR',
    title: 'Control Room Operator',
    desc: 'Real-time telemetry, live route situational maps & crowd flow monitoring',
    email: 'control@yatraflow.gov.in',
  },
  {
    role: 'CHECKPOINT_OPERATOR',
    title: 'Checkpoint Scanner',
    desc: 'Transit QR scanning, local gate check & ingress/egress validation',
    email: 'checkpoint@yatraflow.gov.in',
  },
  {
    role: 'EMERGENCY_OFFICER',
    title: 'Emergency Officer',
    desc: 'Medical & terrain incident response routing and distress dispatch',
    email: 'emergency@yatraflow.gov.in',
  },
  {
    role: 'SUPERVISOR',
    title: 'Operations Supervisor',
    desc: 'Tactical simulation review, bottleneck clearing approvals & capacity directives',
    email: 'supervisor@yatraflow.gov.in',
  },
  {
    role: 'PILGRIM',
    title: 'Pilgrim (Yatri)',
    desc: 'Registered pilgrim view: access personal scannable QR Pass, track info & movement logs',
    email: 'pilgrim@yatraflow.gov.in',
  },
]

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register, switchDemoRole } = useAuth()
  const [tab, setTab] = useState<'login' | 'register' | 'demo'>('login')
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@yatraflow.gov.in')
  const [loginPassword, setLoginPassword] = useState('Admin@12345')
  
  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<UserRole>('CONTROL_ROOM_OPERATOR')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)

    try {
      await login(loginEmail, loginPassword)
      setSuccessMsg('Authenticated successfully!')
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 700)
    } catch (err: any) {
      setError(err.message || 'Failed to login with provided credentials')
      if (err.fieldErrors) setFieldErrors(err.fieldErrors)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)

    try {
      await register(regName, regEmail, regPassword, regRole)
      setSuccessMsg('Account registered and authenticated!')
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 700)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      if (err.fieldErrors) setFieldErrors(err.fieldErrors)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (role: UserRole) => {
    setError(null)
    setLoading(true)
    try {
      await switchDemoRole(role)
      setSuccessMsg(`Switched to ${role.replace(/_/g, ' ')}!`)
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 700)
    } catch (err: any) {
      setError(err.message || 'Could not connect to backend service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-lg overflow-hidden border border-[#e2ddd6] dark:border-[#ffffff1f] bg-[#fffdfa] dark:bg-[#242623] shadow-2xl rounded-none text-[#252927] dark:text-[#f4f0ea]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2ddd6] dark:border-[#ffffff1f] bg-[#f5f1ed] dark:bg-[#1b1c1a]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full border border-[#2d5a3b] dark:border-[#80a88b] flex items-center justify-center text-[#2d5a3b] dark:text-[#80a88b]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase">
                  YATRAFLOW SECURITY
                </span>
                <h2 className="text-base font-bold tracking-tight text-[#252927] dark:text-[#f4f0ea] leading-tight">
                  Officer Authentication & RBAC
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1] dark:hover:text-[#f4f0ea] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] bg-[#f5f1ed]/50 text-xs font-semibold">
            <button
              onClick={() => { setTab('login'); setError(null); }}
              className={`py-3 px-2 border-b-2 transition-all text-center ${
                tab === 'login'
                  ? 'border-[#2d5a3b] text-[#2d5a3b] dark:border-[#80a88b] dark:text-[#80a88b] bg-[#fffdfa] dark:bg-[#242623]'
                  : 'border-transparent text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); }}
              className={`py-3 px-2 border-b-2 transition-all text-center ${
                tab === 'register'
                  ? 'border-[#2d5a3b] text-[#2d5a3b] dark:border-[#80a88b] dark:text-[#80a88b] bg-[#fffdfa] dark:bg-[#242623]'
                  : 'border-transparent text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1]'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => { setTab('demo'); setError(null); }}
              className={`py-3 px-2 border-b-2 transition-all text-center ${
                tab === 'demo'
                  ? 'border-[#2d5a3b] text-[#2d5a3b] dark:border-[#80a88b] dark:text-[#80a88b] bg-[#fffdfa] dark:bg-[#242623]'
                  : 'border-transparent text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1]'
              }`}
            >
              Role Switcher
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6">
            {/* Feedback Banners */}
            {error && (
              <div className="mb-4 p-3 bg-[#f6dfdc] dark:bg-[#4b302c] border border-[#ad4037]/40 text-[#9e3c34] dark:text-[#ec9b70] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Authentication Error: </span>
                  {error}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-[#e7eee7] dark:bg-[#243628] border border-[#2d5a3b]/40 text-[#2d5a3b] dark:text-[#91bd9b] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB: LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                    Officer Email ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. admin@yatraflow.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] dark:focus:border-[#80a88b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                    Security Key / Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] dark:focus:border-[#80a88b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Authenticating with Spring Backend...' : 'Authenticate & Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* TAB: REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Inspector R. Sharma"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] dark:focus:border-[#80a88b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[10px] text-[#ad4037] mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. rsharma@yatraflow.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] dark:focus:border-[#80a88b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[10px] text-[#ad4037] mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                      Password (min 6)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] dark:focus:border-[#80a88b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                      />
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[10px] text-[#ad4037] mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                      Assigned RBAC Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-xs bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] dark:focus:border-[#80a88b] outline-hidden text-[#252927] dark:text-[#f4f0ea] h-[38px]"
                    >
                      <option value="PILGRIM">PILGRIM (YATRI)</option>
                      <option value="CONTROL_ROOM_OPERATOR">CONTROL ROOM OPERATOR</option>
                      <option value="CHECKPOINT_OPERATOR">CHECKPOINT OPERATOR</option>
                      <option value="EMERGENCY_OFFICER">EMERGENCY OFFICER</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="ADMIN">ADMINISTRATOR</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Creating Credentials...' : 'Create Account & Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* TAB: QUICK DEMO ROLES */}
            {tab === 'demo' && (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                <p className="text-xs text-[#6f706b] dark:text-[#b7b8b1] mb-2">
                  Select any pre-seeded operational persona to test role-based access control and live backend JWT authorization:
                </p>
                {ROLES_INFO.map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleDemoLogin(item.role)}
                    disabled={loading}
                    className="w-full text-left p-3 border border-[#e2ddd6] dark:border-[#ffffff1f] hover:border-[#2d5a3b] dark:hover:border-[#80a88b] bg-[#f5f1ed]/50 dark:bg-[#1b1c1a]/50 hover:bg-[#e7eee7] dark:hover:bg-[#243628] transition-all flex items-start justify-between gap-3 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#252927] dark:text-[#f4f0ea]">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#eae5df] dark:bg-[#303330] text-[#6f706b] dark:text-[#b7b8b1]">
                          {item.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6f706b] dark:text-[#b7b8b1] mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                      <div className="text-[10px] text-[#c47735] dark:text-[#c88b50] font-mono mt-1">
                        {item.email}
                      </div>
                    </div>
                    <KeyRound className="w-4 h-4 text-[#6f706b] group-hover:text-[#2d5a3b] dark:group-hover:text-[#80a88b] shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
