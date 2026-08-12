"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react/suspense"

const AVATAR_SIZE_CLASS = "h-7 w-7"
const MAX_VISIBLE_COLLABORATORS = 5

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

function CollaboratorAvatar({
  name,
  avatar,
  color,
  thinking,
}: {
  name: string
  avatar: string
  color: string
  thinking: boolean
}) {
  return (
    <div
      title={thinking ? `${name} · thinking…` : name}
      className={`relative flex ${AVATAR_SIZE_CLASS} shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-elevated`}
      style={{ backgroundColor: avatar ? undefined : color }}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[11px] font-semibold text-page">
          {initials(name)}
        </span>
      )}
      {thinking && (
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-ai ring-2 ring-elevated" />
      )}
    </div>
  )
}

export function PresenceAvatars() {
  const { user } = useUser()
  const others = useOthers()

  const collaborators = others.filter((other) => other.id !== user?.id)
  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_COLLABORATORS)
  const overflowCount = collaborators.length - visibleCollaborators.length
  const hasCollaborators = visibleCollaborators.length > 0

  return (
    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 rounded-full border border-surface-border-subtle bg-elevated/95 px-2 py-1.5 backdrop-blur-sm">
      {hasCollaborators && (
        <div className="flex items-center -space-x-2">
          {visibleCollaborators.map((other) => (
            <CollaboratorAvatar
              key={other.connectionId}
              name={other.info?.name ?? "Guest"}
              avatar={other.info?.avatar ?? ""}
              color={other.info?.color ?? "#f8fafc"}
              thinking={other.presence.thinking}
            />
          ))}
          {overflowCount > 0 && (
            <div
              className={`flex ${AVATAR_SIZE_CLASS} shrink-0 items-center justify-center rounded-full bg-subtle ring-2 ring-elevated`}
            >
              <span className="text-[11px] font-semibold text-copy-secondary">
                +{overflowCount}
              </span>
            </div>
          )}
        </div>
      )}
      {hasCollaborators && (
        <div className="h-5 w-px shrink-0 bg-surface-border-subtle" />
      )}
      <UserButton
        appearance={{ elements: { userButtonAvatarBox: AVATAR_SIZE_CLASS } }}
      />
    </div>
  )
}
