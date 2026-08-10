"use client"

import { Check, Copy, Trash2, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useShareDialog } from "@/hooks/use-share-dialog"
import type { Collaborator } from "@/types/collaborator"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  isOwner: boolean
  collaborators: Collaborator[]
}

function CollaboratorAvatar({ collaborator }: { collaborator: Collaborator }) {
  if (collaborator.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={collaborator.avatarUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle">
      <UserRound className="h-4 w-4 text-copy-faint" />
    </div>
  )
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  isOwner,
  collaborators,
}: ShareDialogProps) {
  const {
    email,
    setEmail,
    isInviting,
    removingId,
    error,
    copied,
    invite,
    remove,
    copyLink,
  } = useShareDialog(projectId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Invite collaborators by email and manage who has access."
              : "View who has access to this project."}
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(event) => {
              event.preventDefault()
              invite()
            }}
          >
            <div className="flex gap-2">
              <Input
                type="email"
                aria-label="Collaborator email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                className="flex-1"
              />
              <Button type="submit" disabled={!email.trim() || isInviting}>
                Invite
              </Button>
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
          </form>
        )}

        <div className="flex flex-col gap-1">
          {collaborators.length === 0 ? (
            <p className="py-2 text-sm text-copy-muted">
              No collaborators yet.
            </p>
          ) : (
            collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-subtle"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <CollaboratorAvatar collaborator={collaborator} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-copy-primary">
                      {collaborator.name ?? collaborator.email}
                    </span>
                    {collaborator.name && (
                      <span className="truncate text-xs text-copy-muted">
                        {collaborator.email}
                      </span>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${collaborator.email}`}
                    disabled={removingId === collaborator.id}
                    onClick={() => remove(collaborator.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-surface-border-subtle pt-4">
          <Input
            readOnly
            aria-label="Project link"
            value={
              typeof window !== "undefined"
                ? `${window.location.origin}/editor/${projectId}`
                : `/editor/${projectId}`
            }
            className="flex-1 text-copy-muted"
          />
          <Button variant="outline" onClick={copyLink} className="gap-1.5">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
