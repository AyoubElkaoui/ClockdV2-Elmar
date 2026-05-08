"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MappingDialog, type MappingFormValues } from "./mapping-dialog";
import { removeMapping, toggleMapping } from "./actions";

type SyntessProject = {
  gcId: number;
  gcCode: string;
  gcOmschrijving: string;
};

type Props = {
  mapping: MappingFormValues & { id: string };
  canDelete: boolean;
  syntessProjects: SyntessProject[];
  isDemo: boolean;
};

export function MappingRowActions({
  mapping,
  canDelete,
  syntessProjects,
  isDemo,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await toggleMapping(mapping.id, !mapping.isActive);
          })
        }
      >
        {mapping.isActive ? "Deactiveren" : "Activeren"}
      </Button>
      <MappingDialog
        title="Mapping bewerken"
        initial={mapping}
        syntessProjects={syntessProjects}
        isDemo={isDemo}
        trigger={
          <Button variant="outline" size="sm">
            Bewerken
          </Button>
        }
      />
      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (
              !confirm(
                `Mapping voor "${mapping.clockwiseProjectName}" verwijderen?`,
              )
            )
              return;
            startTransition(async () => {
              await removeMapping(mapping.id);
            });
          }}
        >
          Verwijderen
        </Button>
      )}
    </div>
  );
}
