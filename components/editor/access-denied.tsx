import { Lock } from "lucide-react"
import Link from "next/link"

export function AccessDenied() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-page px-4 text-center">
      <Lock className="h-8 w-8 text-copy-faint" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold text-copy-primary">
          Access denied
        </h1>
        <p className="text-sm text-copy-muted">
          You don&apos;t have access to this project.
        </p>
      </div>
      <Link href="/editor" className="text-sm text-brand hover:underline">
        Back to Editor
      </Link>
    </div>
  )
}
