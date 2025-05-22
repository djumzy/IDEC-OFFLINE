import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: "childName",
    header: "Child Name",
  },
  {
    accessorKey: "tierType",
    header: "Tier Type",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const date = row.getValue("createdAt");
      return date ? format(new Date(date), "PPP") : "N/A";
    },
  },
  {
    accessorKey: "lastFollowUp",
    header: "Last Follow-up",
    cell: ({ row }) => {
      const date = row.getValue("lastFollowUp");
      return date ? format(new Date(date), "PPP") : "No follow-up";
    },
  },
]; 