import { FileText, Share2, Sparkles } from "lucide-react"
import type { ComponentType, ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
}

interface Feature {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description:
      "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description:
      "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description:
      "Export a complete Markdown technical spec directly from the canvas graph.",
  },
]

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh w-full bg-page">
      <div className="hidden w-1/2 flex-col justify-between bg-surface px-16 py-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand" />
          <span className="text-base font-semibold text-copy-primary">
            Ghost AI
          </span>
        </div>

        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-copy-primary">
              Design systems at the speed of thought.
            </h1>
            <p className="text-base text-copy-muted">
              Describe your architecture in plain English. Ghost AI maps it
              to a shared canvas your whole team can refine in real time.
            </p>
          </div>

          <ul className="flex flex-col gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-copy-primary">
                    {title}
                  </span>
                  <span className="text-sm text-copy-muted">
                    {description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">
          © {new Date().getFullYear()} Ghost AI. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-page px-6 lg:w-1/2">
        {children}
      </div>
    </div>
  )
}
