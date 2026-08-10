"use client"

import { useId } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { UseProjectDialogsReturn } from "@/hooks/use-project-dialogs"

interface ProjectDialogsProps {
  state: UseProjectDialogsReturn
}

export function ProjectDialogs({ state }: ProjectDialogsProps) {
  const {
    dialog,
    name,
    setName,
    slugPreview,
    isLoading,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
  } = state

  const createNameId = useId()
  const renameNameId = useId()

  return (
    <>
      <Dialog
        open={dialog?.type === "create"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitCreate()
            }}
          >
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>
                Give your new architecture workspace a name.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={createNameId} className="text-sm text-copy-secondary">
                Project name
              </label>
              <Input
                id={createNameId}
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My project"
              />
              <p className="text-sm text-copy-faint">
                {slugPreview || "your-project-slug"}
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                Create project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "rename"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitRename()
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                {dialog?.type === "rename"
                  ? `Renaming "${dialog.project.name}".`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={renameNameId} className="text-sm text-copy-secondary">
                Project name
              </label>
              <Input
                id={renameNameId}
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {dialog?.type === "delete"
                ? `This will permanently delete "${dialog.project.name}". This action cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => submitDelete()}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
