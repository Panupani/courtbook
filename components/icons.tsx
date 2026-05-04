/**
 * Central icon exports — all from lucide-react.
 * Import from here so icon choices are changed in one place.
 */
export {
  // Navigation / Admin sidebar
  LayoutDashboard,
  Building2,
  Grid3X3,
  CalendarDays,
  UserCheck,
  BookOpen,
  CreditCard,
  TrendingUp,
  Users,
  // Actions
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  // Status / feedback
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  // Content
  Search,
  CalendarCheck,
  MapPin,
  QrCode,
  Zap,
  Sparkles,
  Upload,
  ImageIcon,
  FileText,
  // User
  User,
  UserPlus,
  LogOut,
  // Misc
  Menu,
  Settings,
  BarChart3,
  Banknote,
  ShieldCheck,
  Layers,
  Star,
} from 'lucide-react'

// ── Logo mark ────────────────────────────────────────────────────────
// Custom shuttlecock-inspired SVG for the CourtBook brand
export function ShuttlecockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Cork base */}
      <circle cx="12" cy="19" r="2.5" fill="currentColor" opacity=".9" />
      {/* Feather lines */}
      <line x1="12" y1="16.5" x2="7"  y2="5"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="16.5" x2="9"  y2="4"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="16.5" x2="12" y2="3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="16.5" x2="15" y2="4"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="16.5" x2="17" y2="5"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Crown arc */}
      <path d="M7 5 Q12 2.5 17 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
